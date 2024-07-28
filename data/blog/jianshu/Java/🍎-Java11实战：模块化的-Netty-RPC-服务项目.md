> 从 Java9 就引入了模块化的新语法了。如果我们想在项目中使用 Java9 及以上的版本的话，模块化是无法忽视的。它不像 Java8 的 lambda 表达式，我们可以不使用 lambda 这个新特性，仍然用老旧的 API 进行替代。但是模块化就不同。我们甚至发现，新的版本里， `rt.jar` 已经不存在了。`JDK` 的结构和基础库率先模块化了。

## 模块化 API

> 模块化的背景和概念本篇文章就不概述了，读者可以查看官方文档或者通过网上不错的博客进行了解。我们主要讲解一下 `module-info.java` 里的一些配置含义。

自定义的 `helo.service` 模块，包含了不少指令，我们分别进行介绍。

```java
module helo.service {
    exports com.maple.netty.handler;
    exports com.maple.hello.service to hello.client;
    requires slf4j.api;
    requires io.netty.all;
    requires gson;
    requires hello.api;
    requires hello.common;
    uses com.google.gson.Gson;
    opens com.maple.hello;
}
```

#### exports 和 exports to 指令

`exports` 指令用于指定一个模块中哪些包对外是可访问的。而 `exports…to` 指令则用来限定哪些模块可以访问当前模块导出的类，通过逗号分隔可以指定多个模块访问当前模块导出的类。这种方式称为**限定导出**(`qualified export`)。

#### require 指令

`require` 指令声明一个模块所依赖的其他模块，在 `Java9` 之后，我们除了引入 `Jar` 包依赖后，如果想要使用它们，还需要在 `module-info.java`中使用 `require` 声明使用。

#### `uses` 指令

`uses` 指令用于指定一个模块所使用的服务，使模块成为服务的消费者。其实就是指定一个模块下的某一个具体的类。
下面是 `requires` 和 `uses` 的 主要区别：

```java
module hello.client {
    requires gson;
    uses com.google.gson.Gson;
}
```

#### provides…with 指令

该指令用于说明模块提供了某个服务的实现，因此模块也称为服务提供者。`provides` 后面跟接口名或抽象类名，与 `uses` 指令后的名称一致，`with` 后面跟实现类该接口或抽象类的类名。
例如`java.base` 模块里的其中一个声明，with后面为前者的一个实现类。

```
provides java.nio.file.spi.FileSystemProvider with jdk.internal.jrtfs.JrtFileSystemProvider;
```

#### open, opens, opens…to 指令

`Java9` 之前，`Java` 类的属性即使定义为 `private` 也是能够被访问到的，我们可以通过反射等手段达到目的。
`Java9` 模块化推出的一个重要目的就是**强封装**，可以完全的将不想暴露的类和属性给保护起来。
默认情况下，除非显式地导出或声明某个类为 `public` 类型，那么模块中的类对外部都是不可见的，模块化要求我们对外部模块以最小范围进行暴露。
`open` 等相关的指令目的就是来限制哪些类或者属性能够通过反射技术访问。

##### `opens` 指令

opens package 指定模块某个包下的所有 `public` 类都能被其他模块通过反射进行访问。

##### `opens ...  to` 指令

`opens package to modules` 指定某些特定的模块才能去对当前 `package` 进行反射访问。

##### `open module` 指令

外部模块对该模块下所有的类在运行时都可以进行反射操作。

```
open module hello.common {
    requires io.netty.all;
    exports com.maple.hello.common;
    exports com.maple.hello.common.netty;
}
```

---

## 实战：基于 Netty 的模块化 RPC 服务例子

> 实战部分将会项目将会基于最新的 `Java11` 版本，使用 `Maven` 进行项目管理。`Netty` 作为网络通讯框架。实现一个简单的RPC功能，hello-client 将会通过 netty客户端发送请求，netty服务端接收请求并返回处理结果。采用 `Gson` 和`Protobuf` 对请求对象进行序列化/反序列化处理。网络通讯采用 Reacter 模式，客户端异步非阻塞模式请求。Netty层进行了 `TCP` 粘包拆包的处理，心跳检测和channel空闲检测，channel断线重连等功能。

本文实现的 `RPC` 例子，涵盖了目前现有的基于Netty的RPC网络通讯部分所有的技术点。

### Maven 环境准备

#### 编译插件

我们需要对 `maven-compiler-plugin` 插件进行升级，以支持最新的 `Java11` 的字节码版本(55)，升级版本为最新版`3.8.0`。

启用 `Java 11` 语言支持

```xml
<properties>
  <maven.compiler.release>11</maven.compiler.release>
  <maven.compiler.source>11</maven.compiler.source>
  <maven.compiler.target>11</maven.compiler.target>
</properties>
```

编译插件配置

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId>
  <version>${maven-compiler-plugin.version}</version>
  <!--
    Fix breaking change introduced by JDK-8178012: Finish removal of -Xmodule
    Reference:  http://bugs.java.com/bugdatabase/view_bug.do?bug_id=8178012
  -->
  <executions>
    <execution>
      <id>default-testCompile</id>
      <phase>test-compile</phase>
      <goals>
        <goal>testCompile</goal>
      </goals>
      <configuration>
        <skip>true</skip>
      </configuration>
    </execution>
  </executions>
  <configuration>
    <showWarnings>true</showWarnings>
    <showDeprecation>true</showDeprecation>
  </configuration>
</plugin>
```

#### 工具链插件

这个插件主要是对Java11和Java8做兼容性选择。由于现在Java版本更新很快，但是大部分项目还是基于 Java8 甚至更低版本。不适宜更改项目所有的环境变量，并将其指向JDK11的主目录。使用 `maven-toolchains-plugin` 使您能够轻松地使用各种环境。

创建 `$HOME/.m2/toolchains.xml`

```xml
<toolchains>
  <toolchain>
    <type>jdk</type>
    <provides>
      <version>11</version>
      <vendor>oracle</vendor>
    </provides>
    <configuration>
      <!-- Change path to JDK9 -->
      <jdkHome>/Library/Java/JavaVirtualMachines/jdk-11.jdk/Contents/Home</jdkHome>
    </configuration>
</toolchain>

<toolchain>
    <type>jdk</type>
    <provides>
      <version>8</version>
      <vendor>oracle</vendor>
    </provides>
    <configuration>
      <jdkHome>/Library/Java/JavaVirtualMachines/jdk-8.jdk/Contents/Home</jdkHome>
    </configuration>
  </toolchain>
</toolchains>
```

注意：将配置文件中 `<jdkHome>` 更改为实际的 `JDK` 安装 `HOME`。

#### 项目主POM 文件 添加 工具链插件

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-toolchains-plugin</artifactId>
  <version>1.1</version>
  <configuration>
    <toolchains>
        <jdk>
            <version>11</version>
            <vendor>oracle</vendor>
        </jdk>
    </toolchains>
  </configuration>
  <executions>
    <execution>
          <goals>
            <goal>toolchain</goal>
        </goals>
    </execution>
  </executions>
</plugin>
```

---

### 构建项目 `Java11-netty-demo`

构建整个项目结构如下

```
├── hello-api
│   ├── src
│   │   ├── main
│   │   │   ├── java
│   │   │   │   ├── com
│   │   │   │   │   └── maple
│   │   │   │   │       └── hello
│   │   │   │   │           ├── HelloRequest.java
│   │   │   │   │           └── HelloResponse.java
│   │   │   │   └── module-info.java
│   │   │   └── resources
│  
├── hello-client
│   ├── src
│   │   ├── main
│   │   │   ├── java
│   │   │   │   ├── com
│   │   │   │   │   └── maple
│   │   │   │   │       └── hello
│   │   │   │   │           └── client
│   │   │   │   │               ├── AppClient.java
│   │   │   │   │               ├── Main.java
│   │   │   │   │               ├── netty
│   │   │   │   │               │   ├── NettyClient.java
│   │   │   │   │               │   └── handler
│   │   │   │   │               │       ├── RpcClientHandler.java
│   │   │   │   │               │       ├── RpcClientMsgDecoder.java
│   │   │   │   │               │       └── RpcClientMsgEncoder.java
│   │   │   │   │               └── service
│   │   │   │   │                   └── HelloClient.java
│   │   │   │   └── module-info.java
│   │   │   └── resources
│   │   │       └── logback.xml
│   │   └── test
│   │       └── java
│  
├── hello-common
│   ├── src
│   │   ├── main
│   │   │   ├── java
│   │   │   │   ├── com
│   │   │   │   │   └── maple
│   │   │   │   │       └── hello
│   │   │   │   │           └── common
│   │   │   │   │               ├── Constants.java
│   │   │   │   │               ├── DumpUtil.java
│   │   │   │   │               ├── RpcException.java
│   │   │   │   │               └── netty
│   │   │   │   │                   └── RpcFrameDecoder.java
│   │   │   │   └── module-info.java
│   │   │   └── resources
│   └──
├── hello-service
│   ├── hello-service.iml
│   ├── pom.xml
│   ├── src
│   │   ├── main
│   │   │   ├── java
│   │   │   │   ├── com
│   │   │   │   │   └── maple
│   │   │   │   │       ├── AppServer.java
│   │   │   │   │       ├── hello
│   │   │   │   │       │   └── service
│   │   │   │   │       │       ├── HelloService.java
│   │   │   │   │       │       └── Person.java
│   │   │   │   │       └── netty
│   │   │   │   │           ├── NettySimpleServer.java
│   │   │   │   │           └── handler
│   │   │   │   │               ├── RpcLogHandler.java
│   │   │   │   │               ├── RpcMsgDecoder.java
│   │   │   │   │               ├── RpcMsgEncoder.java
│   │   │   │   │               └── ServerHandler.java
│   │   │   │   └── module-info.java
│   │   │   └── resources
│   │   │       └── logback.xml
```

从上面的 `Tree` 图，我们可以看到项目分为四大模块：

- hello-api &emsp;&emsp; &emsp;&nbsp; API模块，主要为 `client` 和 `service` 共同依赖
- hello-common &emsp;&nbsp; 公用的类模块
- hello-client &emsp;&emsp;&emsp; rpc客户端模块
- hello-service &emsp;&emsp;&nbsp; rpc服务端模块

每个模块src根目录下都有一个 `module-info.java` 文件用来定义模块

##### hello-api

```
module hello.api {
    exports com.maple.hello;
}
```

##### hello-common

```
module hello.common {
    requires io.netty.all;
    exports com.maple.hello.common;
    exports com.maple.hello.common.netty;
}
```

##### hello-client

```
module hello.client {
    requires hello.api;
    requires io.netty.all;
    requires slf4j.api;
    requires hello.common;

    requires gson;
    uses com.google.gson.Gson;
}
```

##### hello-service

```
module helo.service {
    requires slf4j.api;
    requires io.netty.all;
    requires gson;
    requires hello.api;
    requires hello.common;
}
```

以上 `module-info.java` 主要定义模块的依赖关系和导出关系。

## 运行项目

> 通过上面几步操作之后，我们便可以启动项目运行。

首先我们启动服务端，即 `AppServer`，暴露 `8000` 端口

```java
public class AppServer {
    public static void main(String[] args) {
        NettySimpleServer simpleServer = new NettySimpleServer(8000);
        simpleServer.start();
    }
}
```

然后我们启动客户端程序`Main`，该程序简单模拟控制台输入作为请求

```java
public static void main(String[] args) throws IOException {
        AppClient client = new AppClient(SERVER_URL, SERVER_PORT);
        logger.info("------ 欢迎进入JDK11的世界: 请输入你的昵称 --------- \n");
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        String name = in.readLine();
        while (true) {
            try {
                logger.info("------ 请输入任何你想输入的内容: --------- \n");
                Scanner scanner = new Scanner(System.in);
                if (scanner.hasNext()) {
                    String msg = scanner.next();
                    int seq = SEQ_ID_ATOMIC.incrementAndGet();

                    CompletableFuture<HelloResponse> response = client.sendMessage(new HelloRequest(seq, name, msg));
                    response.whenComplete((result, ex) -> {
                        if (ex != null) {
                            logger.info(ex.getMessage(), ex);
                        }
                        logger.info("seq为 {} 的请求,服务端返回结果为:{}", seq, result.toString());
                    });
                } else {
                    int seq = SEQ_ID_ATOMIC.incrementAndGet();
                    CompletableFuture<HelloResponse> response = client.sendMessage(new HelloRequest(seq, name, "异常准备关闭"));
                    response.whenComplete((result, ex) -> {
                        if (ex != null) {
                            logger.info(ex.getMessage(), ex);
                        }
                        logger.info("seq为 {} 的请求,服务端返回结果为:{}", seq, result.toString());
                    });
                }
            } catch (Exception e) {
                logger.error(e.getMessage(), e);
            }
        }
}
```

我们输入内容后，马上获取到返回结果：
![client.png](https://upload-images.jianshu.io/upload_images/6393906-812b54afc66b0c61.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

服务端处理日志：

```
09-28 00:51:57 271 netty-server-work-group-3-3 INFO - remote server /127.0.0.1:56546, channelRead, msg:com.maple.hello.HelloRequest@6400575a
09-28 00:51:57 271 netty-server-work-group-3-3 INFO - com.maple.hello.service.HelloService: 收到消息 seqId:2, request: com.maple.hello.HelloRequest@6400575a
```

一个简单但功能齐全的基于 `Netty` 的例子演示成功。如果读者对本例子感兴趣，可以访问如下地址获取本项目源码:

**Java11-Netty-Demo**: https://github.com/leihuazhe/Java11-Netty-Demo

## 迁移 Java11 注意事项

#### 1. JavaEE 模块被移除

`Java11` 移除了 `JavaEE` 模块,所以很多诸如 javax JAXB 等已经被移除。
如果旧版本的项目有依赖 Javaee的组件，需要单独加入 javaee-api

```xml
<dependency>
    <groupId>javax</groupId>
    <artifactId>javaee-api</artifactId>
    <version>8.0</version>

</dependency>
```

#### 2.使用最新版本 Netty

由于在Java11中，JDK部分底层的类例如 `Unsafe` 等被移到了 `jdk.internal` 模块。以及Java11 对模块内类的保护，导致暴力反射访问失效等问题。因此在最新的 Netty 版本中对这些做了优化了改变。

## 总结

本文首先从模块化 `API` 及其功能说起，然后以实践为目的介绍如何搭建基于Java11 的工程。通过一个基于 `Netty` 的案例工程来具体学习和深入模块化的使用。

新版本的 `Java11` 对比 `Java8` 的改动个人感觉是有一点大的。如果我们要从一个以 `Java8` 甚至更低版本的项目迁移过来时，首先需要改变的就是一些依赖库的变更，其次就是 模块化的转变，因此整个迁移还是需要考虑一定的兼容性。万幸 `Java11` 是 `Java` 官方准备长期维护的一个版本，未来迁移到这个版本也是大势所趋，后续博主将继续跟进 `Java11` 的更多新特性。

---

本文例子源码： Java11-Netty-Demo: https://github.com/leihuazhe/Java11-Netty-Demo

### 推荐

最后推荐一下本人微信公众号，欢迎大家关注。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-47e180d949563b81.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
