## 什么是优雅升级？

> 优雅升级即在对业务和用户无感知的情况下，对系统进行升级

如今互联网基于微服务架构部署越来越流行。在需要对线上应用做升级或者版本更新时，我们一般要对应用实例做到有计划而且平滑的切换，即对业务无感，不产生任何业务上的中断。更具体的, 是应用实例在收到重启/停机信号后, 马上对调用端隐藏, 同时处理完所有已经收到的请求后, 再重启.

## web容器优雅升级的现状和痛点

在微服务的模式下,我们常常将相同的服务部署到多个节点，这样做到了负载均衡和高可用，避免单点故障。

微服务集群对外暴露服务, 一般通过http网关的方式。例如我司目前部署了多个web容器作为服务网关，给部门前端项目、POS收银系统、PHP端项目、微信、H5等诸多应用提供后台服务。而在网关的前面, 是阿里的slb + nginx. 上游项目会通过nginx，再路由到web网关。

#### 升级服务的痛点

目前的几种web容器都没有现成的优雅升级方案. 意味着重启过程中总会存在部分请求失败的情况. 我们只能在升级的时候避开业务高峰时段, 尽可能减少失败的业务.
如果结合nginx, 理论上可以做到无感升级, 但步骤繁琐:

- 1.把准备停机的节点从nginx上摘除, 这样新的请求就不会再发往待停机节点

- 2.在web容器停机之前，等几秒钟, 让系统处理完已有请求并成功返回给客户端后再彻底停机。

- 3. 升级成功后，再把该节点挂载到nginx上.

如上述总结，我们发现对业务无感的web容器升级过程略复杂，环节略多，存风险。

## 优雅升级你的web容器

> 技术要点：`web`容器基于`Springboot`，并使用内嵌`tomcat`形式打成`jar`包，使用`docker`进行部署和运行，网络网关层使用淘宝的`tengine`代替现有`nginx`

### 基于内嵌`tomcat`形式的web容器优雅关闭

`web`容器正在运行时进行关闭，如果有请求没有处理完，会出现中断的异常，那么就有可能对业务造成影响。所以，优雅停机非常有必要性，目前`tomcat`官方是没有提供很好的策略来实现优雅关机。

于是，我们通过以下方案来实现容器的优雅关闭，整理一下关键技术点:

- 1.基于springboot的web容器应用
- 2.使用内嵌tomcat形式，直接`java -jar`提供服务
- 3.打成docker镜像，以docker形式提供服务

#### 原理：

**更新：Spring Boot 2.3.0.RELEASE 之后，支持配置优雅关闭，详见[文档](https://docs.spring.io/spring-boot/docs/2.3.0.RELEASE/reference/htmlsingle/#boot-features-graceful-shutdown)。**

当我们在`kill` springboot进程时(不是强制`kill`),Springboot在接收到停机信号以后,会有一个优雅关机的处理过程,容器在关闭之前会发布一个`ContextClosedEvent`事件。
我们可以自定义Bean去监听该事件，在容器即将销毁关闭之后，JVM退出之前，执行我们的优雅关机逻辑。

定义一个组件`GracefulShutdown`实现`TomcatConnectorCustomizer`和`ApplicationListener`，监听`ContextClosedEvent`事件。

实现`TomcatConnectorCustomizer`可以让我们管理内嵌的tomcat容器。

```java
@Component
public class GracefulShutdown implements TomcatConnectorCustomizer, ApplicationListener<ContextClosedEvent> {
    private Logger logger = LoggerFactory.getLogger(getClass());

    private volatile Connector connector;

    private final int waitTime = 60;

    @Override
    public void customize(Connector connector) {
        this.connector = connector;
    }

    @Override
    public void onApplicationEvent(ContextClosedEvent contextClosedEvent) {
        logger.info("准备关闭容器，先关闭线程!");
        this.connector.pause();
        Executor executor = this.connector.getProtocolHandler().getExecutor();

        if (executor instanceof ThreadPoolExecutor) {
            try {
                ThreadPoolExecutor threadPoolExecutor = (ThreadPoolExecutor) executor;
                threadPoolExecutor.shutdown();

                if (!threadPoolExecutor.awaitTermination(waitTime, TimeUnit.SECONDS)) {

                    logger.warn("Tomcat thread pool did not shut down gracefully within " + waitTime
                            + " seconds. Proceeding with forceful shutdown");
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
        }
    }
}
```

当springboot容器即将关闭时，首先获取到tomcat连接器`connector`,然后通过连接器拿到tomcat业务线程池。拿到线程池后，对线程池执行`shutdown()`方法。

### docker 模式 优雅关闭

> 以docker环境部署web容器,将springboot打成的jar包，然后构建docker镜像

### 1.构建镜像

我们使用的是自己打的基于openJdk-jre的基础镜像，在其中植入了`fluent-bit`日志收集器，以及`jmx`、`dapeng-cli`等dapeng定制的工具(想了解更多？请关注[dapeng开源](http://www.github.com/dapeng-soa))

- **Dockerfile**

```
FROM docker.today36524.com.cn:5000/base/openjdk:server-jre8

RUN mkdir /gateway-conf &&  mkdir -p /opt/gateway

COPY  ./apps/dapeng-api-gateway.jar /opt/gateway/
COPY  ./startup.sh /opt/gateway/
COPY  ./apps/service-whitelist.xml /gateway-conf/
WORKDIR /opt/gateway
ENTRYPOINT exec  /opt/gateway/startup.sh
```

### 2. startup.sh 脚本

```sh
#!/bin/sh
echo "begin"
export JVM_HOME='opt/oracle-server-jre'
export PATH=$JVM_HOME/bin:$PATH

PRGNAME=api-gate-way
ADATE=`date +%Y%m%d%H%M%S`
PRGDIR=`pwd`
dirname $0|grep "^/" >/dev/null
if [ $? -eq 0 ];then
   PRGDIR=`dirname $0`
else
    dirname $0|grep "^\." >/dev/null
    retval=$?
    if [ $retval -eq 0 ];then
        PRGDIR=`dirname $0|sed "s#^.#$PRGDIR#"`
    else
        PRGDIR=`dirname $0|sed "s#^#$PRGDIR/#"`
    fi
fi

LOGDIR=$PRGDIR/logs
if [ ! -d "$LOGDIR" ]; then
        mkdir "$LOGDIR"
fi


#DEBUG="-Xdebug -Xnoagent -Djava.compiler=NONE -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=9997"
JMX="-Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.port=1091 -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.authenticate=false"
JVM_OPTS="-Dfile.encoding=UTF-8 -Dsun.jun.encoding=UTF-8 -Dname=$PRGNAME -Dio.netty.leakDetectionLevel=advanced -Xms512M -Xmx1024M -XX:+HeapDumpOnOutOfMemoryError -XX:+PrintGCDateStamps -Xloggc:$LOGDIR/gc-$PRGNAME-$ADATE.log -XX:+PrintGCDetails -XX:NewRatio=1 -XX:SurvivorRatio=30 -XX:+UseParallelGC -XX:+UseParallelOldGC -Dlog.dir=$PRGDIR/.."
SOA_BASE="-Dsoa.base=$PRGDIR/../ -Dsoa.run.mode=native"

# SIGTERM  graceful-shutdown
pid=0
process_exit() {
 if [ $pid -ne 0 ]; then
  echo "graceful shutdown pid: $pid" > $LOGDIR/pid.txt
  kill -SIGTERM "$pid"
  wait "$pid"
 fi
 exit 143; # 128 + 15 -- SIGTERM
}


trap 'kill ${!};process_exit' SIGTERM

nohup java -server $JVM_OPTS $SOA_BASE $DEBUG_OPTS $USER_OPTS  $E_JAVA_OPTS -jar $PRGDIR/dapeng-api-gateway.jar >> $LOGDIR/console.log 2>&1 &
#nohup java  -jar dapeng-api-gateway.jar >> $LOGDIR/console.log 2>&1 &
#java  -jar $PRGDIR/dapeng-api-gateway.jar
pid="$!"
echo "start pid: $pid" > $LOGDIR/pid.txt

nohup sh /opt/fluent-bit/fluent-bit.sh >> $LOGDIR/fluent-bit.log 2>&1 &

wait $pid
```

我们重点看 `#SIGTERM  graceful-shutdown`下面一行
首先定义一个脚本方法`process_exit()`,使用`trap 'kill ${!};process_exit' SIGTERM`去监听我们即将启动的进程。
当docker容器被关闭时，这一行会收到来自于docker的kill信号，然后会执行定义的方法，去kill java进程，也就是我们的api网关进程。
这样就能够做到在`docker stop`时，容器内的java线程能够收到kill信号，执行优雅关闭。

## web层总结

我们知道，该方法的作用是阻止新来的任务提交,对已提交的任务不会产生影响，直到所有的线程执行完任务以后，彻底关闭线程池。
我们这样做的目的是希望tomcat继续处理已经接收的请求，停止处理新请求，当所有的请求处理完成后，即彻底关闭tomcat，springboot容器也退出，随即JVM退出。

这样,api网关层面的优雅关闭就可以做到了，但是会存在如下问题:

- 即使tomcat线程池shutdown以后，不再处理新的请求，但是tomcat的端口并没有关闭,外部请求仍然可以路由进来，但是只是一个一直等待的模式(pending),直到请求超时。
  对于我们的无缝优雅关闭和切换网关来说还是差了点什么？

## 使用`tengine`负载均衡无缝优雅关闭

> Tengine是由淘宝网发起的Web服务器项目。它在Nginx的基础上，针对大访问量网站的需求，添加了很多高级功能和特性。我们利用tengine的`ngx_http_upstream_check_module`功能，对负载的服务进行健康检查
> 现在，启动两个基于springboot的api网关，使用tengine对网关做负载均衡(可以做到网关服务的多节点,高可用)
> 配置如下:

#### `apiGateWay.conf`

```sh
upstream maple {
    # simple round-robin
    server 192.168.10.8:9101;
    server 192.168.10.8:9102;

    check interval=3000 rise=2 fall=3 timeout=1000 type=http;
    check_http_send "HEAD /health/check  HTTP/1.0\r\n\r\n";
    check_http_expect_alive http_2xx http_3xx;
}

server {
    listen 80;
    server_name www.maple.td;

    access_log  /var/log/nginx/gateway.log;
    error_log /var/log/nginx/gateway-error.log;

    keepalive_timeout 300;
    send_timeout 300;
    proxy_read_timeout 300;

    location / {
        proxy_set_header   Host             $host;
        proxy_set_header   X-Real-IP        $remote_addr;
        proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;

        proxy_pass http://maple;
    }
}
```

- 1.所有请求`www.maple.td`的请求都会路由到upstream中的两个server对应的网关服务
- 2.下面三行check开头的是对服务的健康检查机制，包括如下:

### `check interval=3000 rise=2 fall=3 timeout=1000 type=http;`

该指令可以打开后端服务器的健康检查功能。指令后面的参数意义是：

interval：向后端发送的健康检查包的间隔。
fall(fall_count): 如果连续失败次数达到fall_count，服务器就被认为是down。
rise(rise_count): 如果连续成功次数达到rise_count，服务器就被认为是up。
timeout: 后端健康请求的超时时间。
type：健康检查包的类型，现在支持以下多种类型

### `check_http_send "HEAD /health/check  HTTP/1.0\r\n\r\n";`

该指令可以配置http健康检查包发送的请求内容。为了减少传输数据量，推荐采用"HEAD"方法。

当采用长连接进行健康检查时，需在该指令中添加keep-alive请求头，如："HEAD / HTTP/1.1\r\nConnection: keep-alive\r\n\r\n"。
同时，在采用"GET"方法的情况下，请求uri的size不宜过大，确保可以在1个interval内传输完成，否则会被健康检查模块视为后端服务器或网络异常。
我们配置让nginx 请求`/health/check` url对服务网关进行健康检查

### `check_http_expect_alive http_2xx http_3xx;`

当返回http状态码为 2xx 3xx 认为服务是健康的,当连续返回多次非此类状态码时，就认为该服务挂了，接下来的请求转发不会路由到该服务。
但是tengine在后台仍然会定期检测该服务的健康状况，如果之后重启了服务节点后，连续两次检测重新返回2xx 3xx时。tengine会认为该服务节点重新恢复正常，
接下来请求会重新路由过来。

### tengine配合和web容器配合进行优雅升级

> web容器优雅停机代码需要在原有代码的基础上稍微作一些修改,暴露一个检测服务的端点(`endpoint`)给外部

```java
@Controller
public class HealthCheckController {
    private Logger logger = LoggerFactory.getLogger(getClass());
    /***
     * Gateway 容器状态,即将关闭时显示 GREEN
     */
    public static ContainerStatus status = ContainerStatus.GREEN;

    @RequestMapping(value = "/health/check", method = RequestMethod.HEAD)
    public ResponseEntity healthCheck() {
        logger.debug("health check,container status: " + status);
        ResponseEntity<String> response;
        if (status == ContainerStatus.YELLOW) {
            response = ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("container maybe shutdown soon");
        } else {
            response = ResponseEntity
                    .status(HttpStatus.OK)
                    .body("container is  running");
        }
        return response;
    }
}
```

提供给`tengine`一个健康检查的`controller`,请求当前的`url`时，如果容器状态为正常时(`GREEN`)，会返回200，如果容器状态为即将关闭时(`YELLOW`)时，返回500

## 如何让网关关闭前改变容器状态，让tengine检测并剔除该服务

在容器销毁之前,停止tomcat线程池之前,改变容器状态，代码逻辑如下：

```java
public void onApplicationEvent(ContextClosedEvent contextClosedEvent) {
        HealthCheckController.status = ContainerStatus.YELLOW;
        logger.info("睡眠10s,等待tengine踢出当前web服务");
        try {
            TimeUnit.SECONDS.sleep(10);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        logger.info("准备关闭容器，先关闭线程!");
        this.connector.pause();
        Executor executor = this.connector.getProtocolHandler().getExecutor();

        if (executor instanceof ThreadPoolExecutor) {
            try {
                ThreadPoolExecutor threadPoolExecutor = (ThreadPoolExecutor) executor;
                threadPoolExecutor.shutdown();

                if (!threadPoolExecutor.awaitTermination(waitTime, TimeUnit.SECONDS)) {

                    logger.warn("Tomcat thread pool did not shut down gracefully within " + waitTime
                            + " seconds. Proceeding with forceful shutdown");
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
        }
    }
}
```

上面代码对比之前的内嵌tomcat优雅关闭的代码新增了改变容器状态的代码，增加主线程睡眠时间以提供给`tengine`足够的健康检测的时间。
当tengine正式摘除停机的`web`节点后，web容器主线程睡醒后继续向下执行,正式进行优雅关闭。

以后，我们只需要执行`docker stop apiGateWay --time 60`,去停掉web容器，并设置`docker`关闭等待超时时间为60s,
有充足的时间给tengine剔除该容器,并且web容器能够处理完已有请求后，再关闭容器。

这样就做到了无缝的优雅关闭

## 测试

- 1.启动两个经过优雅关闭代码改造后的docker web容器，分别为 api1 api2
  ![web容器.png](https://upload-images.jianshu.io/upload_images/6393906-388e33c7762f7e5f.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
- 2.启动tengine docker 容器，配置如下:

```conf
upstream maple {
    # simple round-robin
    server 192.168.10.8:9101;
    server 192.168.10.8:9102;

    check interval=3000 rise=2 fall=3 timeout=1000 type=http;
    check_http_send "HEAD /health/check  HTTP/1.0\r\n\r\n";
    check_http_expect_alive http_2xx http_3xx;
}
```

配置健康检查规则为间隔3s，连续3次返回5xx就剔除该`server`，当连续两次检测到返回2xx时，即重新路由请求到该`server`

- 3.本地启动一个简易的程序，对web容器某个url连续发起请求

```java
public class Test {
    private static Logger logger = LoggerFactory.getLogger(Test.class);
    private static String url = "http://www.maple.td/check";

    public static void main(String[] args) {
        System.setProperty("java.net.preferIPv4Stack", "true");
        ExecutorService service = Executors.newFixedThreadPool(10);
        for (int i = 0; i < 2; i++) {
            service.execute(() -> {
                try {
                    execute();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            });
        }
    }

    private static void execute() throws InterruptedException {
        int i = 0;
        while (true) {
            Thread.sleep(10);
            i++;
            try {
                List<NameValuePair> pairs = new ArrayList<>(4);
                ResponseResult postResult = null;
                postResult = poolPost(url, pairs);
                String response = postResult.getContent();
                //利于展示，根据路由到的web服务ip对response以不同颜色区分打印
                String sub = response.substring(response.indexOf("[") + 1, response.indexOf("]"));
                //api1
                if (s.equals("172.22.0.2")) {
                    System.err.println("response: " + response);
                } else {
                    logger.info("response: " + response);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

private static ResponseResult poolPost(String uri, List<NameValuePair> arguments) throws Exception {
      // 通过 httpclient 或者其他方式请求指定url，这里省略代码
}
```

该测试类的主要作用是请求tengine的域名,会路由到两个web节点，我们通过观察返回的数据进行比照

### 测试过程

- 1.启动测试类，我们看到请求均衡的路由到了两个web容器。
  ![均衡路由.png](https://upload-images.jianshu.io/upload_images/6393906-636421f521a88a56.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

- 2.现在关闭api1(控制台打印红色节点)，并指定docker stop的超时时间为30s(如果不设置，10s内docker容器会强制关闭)
  ![关闭.png](https://upload-images.jianshu.io/upload_images/6393906-5bc5eb9757e97c05.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

- 3.查看api1的日志
  ![api日志.png](https://upload-images.jianshu.io/upload_images/6393906-74db0024c99adf9b.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

- 4.同时查看请求类的日志
  ![测试类.png](https://upload-images.jianshu.io/upload_images/6393906-8da521f518e2681c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

我们可以观察到，当执行命令docker stop api1 时，web容器马上收到了来自docker的SIGTERM信号，web容器准备停机，于是改变了container状态，tengine的健康检查将返回YELLOW.

仔细观察，当第三次返回YELLOW时，即20:06:28秒，测试类的控制台已经没有请求api1了(没有了红色的日志)

- 5. 重新启动api1

![api1日志.png](https://upload-images.jianshu.io/upload_images/6393906-672b4531a247175f.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
重新启动api1后，tengine继续对api1进行健康检查，当第二次green返回时，测试类的请求马上就路由过来了(看红色日志和时间)
![image.png](https://upload-images.jianshu.io/upload_images/6393906-0692659b1ae0cea6.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## 总结

到这一步，我们的优雅升级web容器方案已经完全成功了，以后相对某一个节点停机，无需改变nginx配置，无需担心web容器已有请求会因为关闭而中断。这样的策略在企业应用无缝升级起到了很大的作用。
