> 引言，dump 消息需要获取元数据信息

## 打开 dapeng-cli 键入 dump

> cli 控制台打印出了详细的使用方法，具体如图所示

![image.png](https://upload-images.jianshu.io/upload_images/6393906-4475c4417dc67e7c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## 正常消息 dump 后显示形式

![dump tool.png](https://upload-images.jianshu.io/upload_images/6393906-223ad221491ce20c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/840)

## 1.设置 zk

> 设置 zk 的目的是获取到zk中已注册的服务的元数据信息。需要提前设置好，默认是 `127.0.0.1:2181` ，如果为默认情况，不需要进行设置。

```sh
set -zkhost 192.168.10.2:2181
```

## 2. dump

### 1.显示最新的一条消息，以及它的 offset 、partition

> 如果不指定 `-broker` 默认 127.0.0.1:9092

```sh
dump  -topic member_test
dump  -broker 127.0.0.1:9092 -topic member_test
```

初始显示目前消费者持有的当前的 `topic` 的所有分区信息。
![partition&offset.png](https://upload-images.jianshu.io/upload_images/6393906-72bfe73226466219.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

上述命令没有指定具体分区 `partition` 以及分区的 `offset` 信息。默认 `dump tool` 会显示当前 `broker` 中最新的消息的 `offset`，并且没有可 `dump` 消息。如果这时候有新消息发送到 `broker`，这时候 `dump tool` 就会解码最新的消息。

### 2. 指定 offset 不显示指定 partition

```sh
dump -broker 127.0.0.1:9092 -topic member_test -offset 200000
```

命令界面首先会显示用户刚设置的 `offset` 信息。但是可能由于用户设置的 `offset` 超过了目前分区最大的 `offset` 信息，因此kafka 会重新 `Resetting offset` 信息，3s后，显示的最新的信息才是当前最正确的 `offset` 信息。

![显示信息.png](https://upload-images.jianshu.io/upload_images/6393906-85aee5e50622c921.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 3. 指定分区信息和 offset 信息

```sh
dump -broker 127.0.0.1:9092  -topic member_test  -partition 1 -offset 40
```

![指定.png](https://upload-images.jianshu.io/upload_images/6393906-d7a98997e9c93cd1.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/640)

指定分区和 `offset` 信息后，控制台显示当前分区 `1`， 和用户 `seek` 到的 `offset` 40，由于目前 `broker` 最新的偏移量为 `42`，因此这时会 `dump` offset 为 40 和 41两条消息。

### 4.指定消费消息的范围

使用 `-limit` 来限制 从指定的 offset 开始 拉取的消息数量。如下表示，从 offset 20 开始 ，消费 10条消息。

```sh
dump -broker 127.0.0.1:9092 -topic member_test -offset 20 -limit 10
```

这时会 dump 分区 0 1 2 里 以 offset 20 起，一共 dump 20条消息结束。

### 5.通过 -info 只显示消息元信息。

##### 使用如下命令来显示当前消息的元信息，包括创建信息。

```sh
dump -broker 127.0.0.1:9092 -topic member_test -partition 1  -offset 40 -info
```

![image.png](https://upload-images.jianshu.io/upload_images/6393906-19512cb18d222941.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

`info` 会显示该条消息的分区、`offset`、创建时间。不会显示当前 `offset` 消息的详细内容。

##### 多次执行，改变 offset 的值，查询 offset 对应的创建时间

```sh
dump -broker 127.0.0.1:9092 -topic member_test -partition 1  -offset 20 -info
```

通过几次这样的操作后，可以锁定一定时间所对应的 `offset` 为多少。

如果消息存在多个分区中，可以在上述命令中指定 `-partition` 参数来更进一步查询。

## FAQ

### 1.消息 dump 失败，报如下错误信息

![image.png](https://upload-images.jianshu.io/upload_images/6393906-e26fdf30772be59d.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/840)

#### 主要原因：

- 1. 当前事件所属服务元数据信息无法得到。
- 2.服务能获取到，消息的元数据信息获取不到。

#### 举例说明：

`StockEvent` 属于 `StockService` 服务。所以这条消息的元数据信息需要从 StockService 中去拿。
第一，判断 `StockService` 的是否存在于当前zk，是否是启动状态。
第二，如果服务是存在元数据的话，判断event的元数据信息是否暴露出去了。

如何暴露？[dapeng-event-bus 详细指南系列 --- 生产者详解](https://www.jianshu.com/p/be1c7f94dcb5) 文章也有提到，我们再详细说明一遍。

#### IDL服务接口事件声明

> 需要将事件元信息定义到 `xxxservice.thrift` 的元信息中。

- 接口可能会触发一个或多个事件
- 事件必须在触发接口进行声明，否则事件解码器不会生成

`== >user_service.thrift`

```thrfit
namespace java com.github.dapeng.user.service

include "user_domain.thrift"
include "events.thrift"

string register(user_domain.User user
(events="events.RegisteredEvent,events.ActivedEvent")
}
```
