> 如今 `Spring Boot` 在微服务领域已十分风靡，开箱即用的特性，简化了很多开发工作。而 `Dubbo` 在 `2017` 年重新得到维护以后，社区逐渐活跃，`Dubbo RPC` 十分优秀，本文我们将通过一个例子来构建一个基于 `Spring Boot` 的`Dubbo` 微服务工程。

### Dubbo Spring Boot Starter 项目

> 我们在采用 `Dubbo` 作为 微服务框架时，可以通过依赖这个项目来轻松整合 `SpringBoot`

![dubbo-spring-boot.png](https://upload-images.jianshu.io/upload_images/6393906-5a4c995a12ed2093.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1000)

上面是 Dubbo Spring Boot 工程地址 。[Dubbo](https://github.com/alibaba/dubbo) Spring Boot 工程致力于简化 Dubbo RPC 框架在 [Spring Boot](https://github.com/spring-projects/spring-boot/) 应用场景的开发。同时也整合了 Spring Boot 特性：

### SpringBoot Dubbo 项目实战

> 我们将实现一个简单的基于SpringBoot 和 Dubbo 的微服务例子来进行讲解。
> 项目采用多模块的形式打包。分为如下三个工程：

- dubbo-boot-api  
  统一使用的API工程，提供给生产者和消费者，包括服务接口等，实体模型等。
- dubbo-boot-consumer
  服务消费端，该工程将会提供web服务，并调用 Dubbo 提供的微服务。
- dubbo-boot-provider
  服务提供方，提供服务供消费者进行调用

### POM 依赖

> 项目根 `POM` 文件 需要依赖 SpringBoot 的 Parent 工程 作为 父工程以方便管理Spring的版本，我们采用的版本号为 `Spring Boot 2.0.0.RELEASE `

```xml
<parent>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-parent</artifactId>
      <version>2.0.0.RELEASE</version>
</parent>
```

> 服务提供者 (`dubbo-boot-provider`) 、服务消费者 (`dubbo-boot-consumer`) 都需要依赖 `dubbo` 整合 `Spring` 的`dubbo-spring-boot-starter`工程，以及 `spring-boot-starter-web`，通过 `web` 作为服务启动运行载体。

```xml
<!-- Dubbo 整合 Boot Dubbo 依赖 -->
<dependency>
    <groupId>com.alibaba.spring.boot</groupId>
    <artifactId>dubbo-spring-boot-starter</artifactId>
    <version>2.0.0</version>
</dependency>

<!-- Spring Boot Web 依赖 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

```

### API 工程 `dubbo-boot-api`

> api工程主要提供实体类和公用服务接口， `provider`、`consumer` 都会依赖它

实体类 `City`

```java
public class City implements Serializable {
  private String name;
  private String from;
```

服务接口 `CityService`

```java
public interface CityService {
    /**
     * 根据城市名称，查询城市信息
     *
     * @param cityName
     */
    City findCityByName(String cityName);
}
```

### Provider 服务提供工程 `dubbo-boot-provider`

服务提供实现 `CityServiceImpl`

```java
@Service(
       version = "${demo.service.version}",
       application = "${dubbo.application.id}",
       protocol = "${dubbo.protocol.id}",
       registry = "${dubbo.registry.id}"
)
public class CityServiceImpl implements CityService {

   public City findCityByName(String cityName) {
       System.out.println("request cityName: " + cityName);
       return new City("武汉", "湖北");
   }
}
```

启动类 `AppProvider`

> 使用非 `web` 的形式启动 `SpringBoot` 容器，提供 `Dubbo Rpc` 服务

```java
@SpringBootApplication
@EnableDubboConfiguration
public class App {
    public static void main(String[] args) {
          //使用非 Web 环境启动 Spring容器，提供dubbo rpc 服务
           new SpringApplicationBuilder().sources(AppProvider.class)
                .web(WebApplicationType.NONE)
                .run(args);
    }
}
```

#### application.properties

```properties
# Spring boot application
spring.application.name = dubbo-provider-demo

## Provider类配置
demo.service.version=1.0.0
dubbo.application.id = dubbo-boot-provider
dubbo.application.name = dubbo-boot-provider

## 使用通讯协议、暴露端口
dubbo.protocol.id = dubbo
dubbo.protocol.name = dubbo
dubbo.protocol.port = 20880

## 注册中心 （不使用，直接本地互连）
dubbo.registry.id = my-registry
dubbo.registry.address = N/A
```

### Consumer 消费者工程 `dubbo-boot-provider`

> `Spring Boot` `Controller` 类，提供 `Rest` 接口。引用 `Dubbo` 服务接口 `CityService`

```java
@RestController
public class HelloController {

    @Reference(version = "${demo.service.version}",
            application = "${dubbo.application.id}",
            url = "${dubbo.service.url}")
    private CityService cityService;

    @RequestMapping("/hello")
    public Object hello() {
        return cityService.findCityByName("武汉");
    }
}
```

#### 启动类

> 提供 `web` 服务供前端调用

```java
@SpringBootApplication
public class AppConsumerServer {

    public static void main(String[] args) {
        SpringApplication.run(AppConsumerServer.class, args);
    }
}
```

#### application.properties

> 本例子没有采用注册中心，而是通过本地 `url` 互相直连服务端进行调用。

```prop
spring.application.name=dubbo-boot-consumer

demo.service.version=1.0.0

dubbo.application.id=dubbo-boot-consumer
dubbo.application.name=dubbo-boot-consumer

# 通过直连方式
dubbo.service.url=dubbo://127.0.0.1:20880
```

### 测试

分别运行启动服务端(`AppServer`) 和消费端(`AppConsumerServer`) 类。然后打开浏览器访问 `localhost:8080/hello`
![调用结果.png](https://upload-images.jianshu.io/upload_images/6393906-c9fecdee1b122e3e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1000)

结果显示已经调用成功。整个执行链为，前端访问 `url` 调用消费端 `Spring Rest`接口，`Controller` 里通过 `Dubbo Rpc` 调用 服务端提供的服务，然后返回。

### 总结

采用 `Spring Boot` 工程，引入 `Dubbo` 整合 `Spring Boot` 的 依赖，将会使我们非常简单轻松的使用 `Dubbo` 来提供微服务。我们可以充分利用 `Spring Boot` 的 注解驱动、自动装配、外部化配置、`Actuator` 监控等特性，来轻松管理基于`Dubbo` 的微服务。

社区提供的 `dubbo-spring-boot-starter` 工程 整合了与 `Spring Boot` 这些自动配置、依赖等。所以下一步我们将会研究 它是如何实现与 `Spring Boot` 无缝整合的。
