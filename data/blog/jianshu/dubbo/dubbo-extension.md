> JDK SPI 一次性实例化所有实例扩展，如果有实例扩展初始化很耗时，但是加载后又没有用上，会浪费资源。

## Dubbo 的 SPI extension

### @SPI注解

定义统一的接口，该接口会有多个实现类的情况下,我们在此接口上定义该注解。
`@SPI` 会标记此接口为扩展接口。

```java
@SPI
public interface Registry {
    /**
     * register something
     *
     * @param msg input msg
     * @return result string
     */
    String register(String msg);
}
```

如果在扩展实现中有静态字段或方法引用的第三方库，

- 如果不存在第三方库，则其类将\*失败初始化。在这种情况下，
- dubbo无法确定扩展的id \*，因此如果使用前面的格式，
- 则无法将异常信息与扩展映射。

### @Activate 注解

在扩展接口的实现类中进行定义。例如我们定义5个实现Registry的实现类，每个实现类上定义 `@Activate` 和一些信息。
ZookeeperRegistry

```java
@Activate(group = {"default_group"})
public class ZookeeperRegistry implements Registry {

    @Override
    public String register(String msg) {

        return "Zookeeper register already! ";
    }
}
```

EtcdRegistry

```java
@Activate(order = -1, group = {"etcd"})
public class EtcdRegistry implements Registry {

    @Override
    public String register(String msg) {

        return "Etcd register already! ";
    }
}
```

Etcd2Registry

```
@Activate(order = 1, group = {"etcd"})
public class Etcd2Registry implements Registry {

    @Override
    public String register(String msg) {

        return "Etcd2Registry register already! ";
    }
}
```

DapengRegistry

```java
@Activate(value = {"dapeng"}, group = {"dapeng"})
public class DapengRegistry implements Registry {

    @Override
    public String register(String msg) {

        return "DapengRegistry register already! ";
    }
}
```

`@Activate `对于自动激活给定的某些标准扩展很有用，例如:@Activate 当Filter有多个实现时,可以用于加载某些Filter扩展
