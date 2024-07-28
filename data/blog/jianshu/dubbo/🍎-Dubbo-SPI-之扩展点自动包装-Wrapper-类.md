> 之前的文章我们分析了 `Dubbo` 的扩展点自适应机制。`Dubbo SPI` 主要思想也是来自于 `JDK` 原生的 `SPI` 机制。框架定义好扩展点接口，服务提供者实现接口。框架可以通过`SPI`机制动态的将服务提供商切入到应用中。使我们的程序可以面向接口，对扩展开放。

### Dubbo SPI 与 JDK SPI

`JDK SPI` 需要在 `classpath` 下 `META-INF/services` 目录下创建以扩展点接口全限定名命名的文件，里面内容为实现类的名称(完整包名)，多个实现类换行分隔。
文件名称:
![spi.png](https://upload-images.jianshu.io/upload_images/6393906-ea0373f3e7076c3d.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![spi内容.png](https://upload-images.jianshu.io/upload_images/6393906-cdd545e8de3cbd87.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

JDK加载扩展点实现类的方式:

```java
Iterator<Registry> registryImpls = ServiceLoader.load(Registry.class).iterator();
```

结论
`JDK SPI` 会加载 `classpath` 下的所有 `META-INF/services` 下的所有接口对应的实现类。如果该实现类在 `classpath` 存在，则会通过`ServiceLoader`加载出来。如果有多个实现类，多个实现类都会被加载出来，用户则会选择使用哪个。

`Dubbo SPI` 改进

- 不一次性实例化扩展点所有实现，再用到的时候，再选择性加载，可以减少资源浪费。
- 扩展点加载失败异常跑出更明确的信息
- 提供扩展点实现类与实现类之间的Wrapper 操作，可以用来聚合公共部分逻辑。
- 提供 `IOC` 和 `AOP` 等功能。

### Dubbo 扩展点包装 Wrapper 类

一个典型的Wrapper类如下:

```java
public class CommonRegistry implements Registry {
   // 持有 扩展点接口
   private Registry registry;
   // 构造器注入
   public CommonRegistry(Registry registry) {
       this.registry = registry;
   }

   @Override
   public String register(URL url, String msg) {
       // doSomething
      return  registry.register(url,msg);
   }

   @Override
   public String discovery(URL url, String content) {
      // doSomething
      return  registry.register(url,msg);
   }
}
```

分析上面的包装类，我们得出 `Dubbo` 认为的包装类需要满足的两个条件

- 1.持有扩展点接口对象属性，并通过构造器方式初始化该属性
- 2.这个类也要实现扩展点接口类，并在实现方法中进行增强操作

### Wrapper 包装类实战

> 上一篇文章 [`Dubbo SPI 之 Adaptive 自适应类`] 我们介绍过两个注册中心的实现。这里我们有一个新的需求，需要对每一个注册中心的注册服务和发现服务统计一下耗时，增加一些共有逻辑。所以我们定义一个 `Wrapper` 类。

```java
public class CommonRegistry implements Registry {
    private Logger logger = LoggerFactory.getLogger(CommonRegistry.class);
    // 持有 扩展点接口
    private Registry registry;
    // 构造器注入
    public CommonRegistry(Registry registry) {
        this.registry = registry;
    }

    @Override
    public String register(URL url, String msg) {
        long begin = System.currentTimeMillis();
        String register = registry.register(url, msg);
        long end = System.currentTimeMillis();
        logger.info("register method 处理耗时 cost: {} ms", end - begin);
        return register;
    }

    @Override
    public String discovery(URL url, String content) {
      //...实现同上
    }
}
```

在 `META-INF/dubbo/com.maple.spi.Registry`里面增加 `wrapper` 类的信息：

```
common=com.maple.spi.impl.CommonRegistry
```

测试 `Main`

```java
public static void main(String[] args) {
     URL url = URL.valueOf("test://localhost/test")
                  .addParameter("service", "helloService")
                  .addParameter("registry","etcd");
                  //.addParameter("registry","zookeeper");

     Registry registry = ExtensionLoader.getExtensionLoader(Registry.class)
                                        .getAdaptiveExtension();

     System.out.println(registry.register(url, "maple"););
}
```

分别尝试使用 `etcd` 和 `zookeeper`，控制台打印如下：

```
//Etcd
09-26 00:55:16 707 main INFO - 服务: helloService 已注册到 Etcd 上，备注: maple
09-26 00:55:16 709 main INFO - register method 处理耗时 cost: 2 ms
Etcd register already!
// zookeeper
09-26 00:56:17 282 main INFO - 服务: helloService 已注册到zookeeper上，备注: maple
09-26 00:56:17 284 main INFO - register method 处理耗时 cost: 2 ms
Zookeeper register already!
```

我们看到了 `register method 处理耗时 cost: 2 ms` 这条日志，说明 `CommonRegistry` 的逻辑已经运行了。程序先构造 `CommonRegistry`，从它的构造器中传入的是扩展点实现类，程序会先调用wrapper类对应的方法， 然后在方法内部再调用扩展点实现类的对应方法。类似于装饰器模式，为扩展点实现类增强了功能。
通过这种设计模式，我们可以将多个扩展点实现共用的公共逻辑都移到此类中来。

#### Wrapper 类不属于候选的扩展点实现

> `Wrapper` 类不属于扩展点实现，我们可以通过如下代码进行验证:

```java
Set<String> extens = ExtensionLoader
                        .getExtensionLoader(Registry.class)
                        .getSupportedExtensions();
//结果
[etcd, zookeeper]
```

通过 `getSupportedExtensions` 可以获取扩展点接口 `Registry` 当前所有的服务扩展实现的 `key` 值。控制台的结果只有 `etcd` 和 `zookeeper`。 因此，`wrapper` 不属于 扩展点实现，同理 上一篇文章介绍的自适应类 `Adaptive`， 也不属于扩展点实现。

### 总结

通过本文总结 `JDK SPI` 原理和使用方式，然后和 Dubbo SPI 进行对比。

Dubbo 扩展点自动包装Wrapper类，类似与AOP，为扩展点实现增加更多前置或者后置功能模块。实现原理采用装饰器设计模式，将真正的扩展点实现包装在Wrapper类中。扩展点的Wrapper可以有多个，可以根据需求新增。
