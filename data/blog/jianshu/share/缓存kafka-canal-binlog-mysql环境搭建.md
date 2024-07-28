搭建步骤：

## 1.开启mysql log_bin 模式

基于docker的mysql会将配置文件`my.cnf`映射到外部`/data/var/mysql-conf/my.cnf`，
在构建docker环境时，需要提前将`my.cnf`文件放入该文件夹下。
`my.cnf`基于原生主要修改开启binlog功能

#### `my.cnf`

####

```
# open Binlog config, 前三行为官方标配
log-bin=mysql-bin
binlog_format=ROW
server-id = 1
# 字面意思很明显了..如果不配置，默认所有数据库都会产生binlog事件
binlog-ignore-db=mysql
binlog-ignore-db=information_schema
binlog-ignore-db=performance_schema
binlog-do-db=test  ##本次测试Binlog的数据库
```

进入mysql容器，通过执行 `show variables like '%log_bin%'`;
如果结果为`on`，说明开启了binlog模式。

## 2. 启动 `kafka`

### docker搭建`Kafka`

- 同时提供内网和外网访问的方式：

```yml
kafka:
  container_name: kafka
  image: wurstmeister/kafka:1.1.0
  ports:
    - '${kafka_port}:${kafka_port}'
  environment:
    - TZ=CST-8
    - KAFKA_BROKER_ID=2
    - KAFKA_ZOOKEEPER_CONNECT=${soa_zookeeper_host_ip}:2181
    - KAFKA_LOG_DIRS=/kafka/logs
    - KAFKA_ADVERTISED_LISTENERS=INSIDE://192.168.10.8:9092,OUTSIDE://10.10.10.36:9094
    - KAFKA_LISTENERS=INSIDE://:9092,OUTSIDE://:9094
    - KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=INSIDE:PLAINTEXT,OUTSIDE:PLAINTEXT
    - KAFKA_INTER_BROKER_LISTENER_NAME=INSIDE
  volumes:
    - '/data/logs/kafka-logs/:/kafka/logs'
```

- 只供内网或外网访问的模式

```yml
kafka:
  container_name: kafka
  image: wurstmeister/kafka:1.1.0
  ports:
    - '${kafka_port}:${kafka_port}'
  environment:
    - TZ=CST-8
    - KAFKA_BROKER_ID=2
    - KAFKA_ZOOKEEPER_CONNECT=${soa_zookeeper_host_ip}:2181
    - KAFKA_LOG_DIRS=/kafka/logs
    - KAFKA_LISTENERS=PLAINTEXT://:${kafka_port}
    - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://${kafka_host_ip}:${kafka_port}
  volumes:
    - '/data/logs/kafka-logs/:/kafka/logs'
```

#### 注意事项：

- 上面配置中的${}变量是在env环境文件里面配置的，如果不想使用，这里可以直接写实际端口和ip内容。
- 注意initEnvs 里的 develop.ini 里的kafka_host_ip 是不是对应的是`host_ip`
- 验证kafka
  进入容器`/opt/kafka`，执行`sh bin/kafka-console-producer --broker-list localhost:9092 --topic test`，然后输入内容，如果没有报错，说明`kafka`启动成功。

## 3.启动 `canal`

### 构建镜像

1.下载好官方的canal压缩包，注意版本为`1.0.24`，解压后改名为`canal`
2.copy conf 下面的 example 为 today ，然后删除 example 3.修改canal.properties内容，将destination指向 today
.`canal.properties`

```
canal.id= 1
// 这个值是每个canal server唯一

canal.destinations= today
//决定instace.properties路径，客户端连接的配置，默认为example,我们镜像里面设置的是today

# conf root dir
canal.conf.dir = ../conf
# auto scan instance dir add/remove and start/stop instance
canal.auto.scan = true
canal.auto.scan.interval = 5
```

4.Dockerfile(注意不能使用jre作为基础镜像)

```
FROM java:8
MAINTAiNER hz.lei
RUN mkdir /canal
ADD ./canal /canal/
WORKDIR /canal/bin
CMD ["sh",  "-c", "/canal/bin/startup.sh && tail -F /canal/bin/startup.sh"]
```

5.执行 构建镜像命令

```
docker build -t docker.today36524.com.cn:5000/today/canal:1.0.24 .
```

现在已经推送到私服的镜像（稳定版）

```
docker.today36524.com.cn:5000/today/canal:stable
```

### 实例配置，通过数据卷进行映射

在 宿主机 的`/data/var/canal/instance.properties` 配置today实例的连接数据库的属性

```
# mysql serverId 唯一
canal.instance.mysql.slaveId = 1314

# position info
canal.instance.master.address = db-master:3306
canal.instance.master.journal.name =
canal.instance.master.position =
canal.instance.master.timestamp =

#canal.instance.standby.address =
#canal.instance.standby.journal.name =
#canal.instance.standby.position =
#canal.instance.standby.timestamp =

# username/password
canal.instance.dbUsername = root
canal.instance.dbPassword = today-36524
canal.instance.defaultDatabaseName =
canal.instance.connectionCharset = UTF-8

# table regex
canal.instance.filter.regex = .*\\..*
# table black regex
canal.instance.filter.black.regex =
```

#### canal需要将该配置文件映射到容器内部目录 `/canal/conf/today/instance.properties`

## 4.启动`binlog`

严格按照canal在前，binlog在后的原则启动

## binlog镜像有更新：

最新镜像: `docker.today36524.com.cn:5000/basic/binlog:stable`

## 更新内容：

### 1.binlogService 支持自动重连，canal服务重启后，可以重新连接成功，不再需要每次重启此服务。

### 2.优化了日志，日志显示更加详细，发送消息会有topic和offset等

### 3.忽略掉eventType为 QUERY的事件触发

![日志显示优化.png](https://upload-images.jianshu.io/upload_images/6393906-948fb6a98fe6c91f.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## 镜像制作：

- 拉取源码`http://pms.today36524.com.cn:8083/basic-services/kafka-binlog`,切换到分支`maven`
- 在源码`pom.xml`路径下执行`mvn package assembly:single` ，在target下可以打出可执行jar
- 复制该jar到binlog目录下,目录结构
  ![image.png](https://upload-images.jianshu.io/upload_images/6393906-d5a621d3a9d7418f.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

- binlog.sh

```sh
java -Xms256m -Xmx256m -Xss256k -jar ./binlog.jar
```

在`binlog`文件夹同级目录`Dockerfile`

```
FROM java:8
MAINTAiNER hz.lei
RUN mkdir /binlog
ADD ./binlog /binlog/
WORKDIR /binlog
CMD ["sh",  "-c", "/binlog/binlog.sh && tail -F /binlog/binlog.sh"]
```

- 构建镜像` docker build -t docker.today36524.com.cn:5000/basic/binlog:stable`

## 附： docker-compose.yml

```yml
version: '2'
services:
  canal:
     container_name: canall
     image: docker.today36524.com.cn:5000/today/canal:stable
     environment:
       - TZ=CST-8
       - LANG=zh_CN.UTF-8
     ports:
       - "11111:11111"
     extra_hosts:
       - "db-master:${host_ip}"
     volumes:
       - "/data/logs/canal/:/canal/logs"
       - "/data/var/canal/instance.properties:/canal/conf/today/instance.properties"

binlog:
    container_name: binlogService
    image: docker.today36524.com.cn:5000/basic/binlog:stable
    environment:
     - TZ=CST-8
     - canal_canalServerIp=${canal_host_ip}
     - canal_canalServerPort=11111
     - kafka_topic=${binlog_topic}
    extra_hosts:
      - "kafka-host:${kafka_host_ip}"
    volumes:
      - "/data/logs/binlog-service/:/binlog/logs"
    labels:
      - project.source=
      - project.extra=public-image
      - project.depends=mysql,canal,kafka
      - project.owner=LHZ

 kafka:
    container_name: kafka
    image: wurstmeister/kafka
    ports:
      - "${kafka_port}:${kafka_port}"
    environment:
      - TZ=CST-8
      - KAFKA_BROKER_ID=2
      - KAFKA_ZOOKEEPER_CONNECT=${soa_zookeeper_host_ip}:2181
      - KAFKA_LOG_DIRS=/kafka/logs
      - KAFKA_LISTENERS=PLAINTEXT://:${kafka_port}
      - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://${kafka_host_ip}:${kafka_port}
    volumes:
      - "/data/logs/kafka-logs/:/kafka/logs"
    labels:
      - project.source=
      - project.extra=public-image
      - project.depends=zookeeper
      - project.owner=LHZ
```
