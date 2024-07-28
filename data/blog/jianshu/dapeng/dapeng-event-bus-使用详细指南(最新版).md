## EventBus 生产者

> 事件消息产生的一方微服务，例如订单和采购服务。门店订货、`POS` 订单完成时，需要触发一个事件，将此事件发送给 `Kafka`，后续消息的处理订阅等生产者方的服务不用再关心，只需发送消息即可。

### 1.引入依赖

> 在 `build.sbt` 中引入 事件消息 `lib` 依赖，如果项目是 `maven` 工程，按照 `maven` 的格式在 `pom` 中引入即可。

- sbt

```
"com.today" % "event-bus_2.12" % "2.1.1"
```

- maven

```xml
<dependency>
    <groupId>com.today</groupId>
    <artifactId>event-bus_2.12</artifactId>
    <version>2.1.1</version>
</dependency>
```

---

### 2.生产者消息原理

> 为了保证发送的消息的一致性以及事务性质，我们为消息建立了一个临时的中转站，将序列化的消息保存到数据库中。借助于数据库事务，我们能够将消息的存储和业务逻辑置于一个事务下，可以一起提交和回滚。我们可以模拟一个步骤。

#### 1). 时刻A

业务逻辑处理一半，因为某些功能完成，于是调用 `EventBus.fireEvent` 触发事件。此时事件消息会序列化为二进制，并存储在我们后面要讲的事件表中。
<br/>

#### 2). 时刻B

业务逻辑继续往下执行。这里会有两种情况：

- 1.整个流程处理成功，没有异常，事务提交。随着事务的提交消息也存储到事件表中成功。并会打印如下日志。

```log
11-26 19:24:58 801 dapeng-container-biz-pool-9 INFO [ac180007c16816b1] -
save message unique id: 12233961,
eventType: com.today.api.order.scala.events.StoreOrderEndEventNew successful
```

该日志存储在某个业务项目的 eventbus日志下。
格式为:`detail-xxx-eventbus.2018-11-26.log`。
如果出现这条日志，说明业务逻辑处理成功，并且成功触发了消息。**注意，这里触发了消息不一定意味着消息发送出去了**，第二个步骤我在下面讲。

- 2.业务流程在某一个环节出错 ，并抛了异常，此时整个事务会回滚，存储的消息也会回滚，整个过程下来，没有产生消息，就像一切未发生一样。
  <br/>

#### 3). 时刻C

> 这个过程与上面的两个过程 **时刻A** 和 **时刻B** 是解耦的关系。换句话说，这个过程是一个独立的过程，因为上面的步骤已经将序列化后的消息**存储**到了**事件表**中。上一个步骤不用再关心后续逻辑。

有需要生产消息的微服务需要配置一个**定时消息轮询组件**，传入数据源等信息。

```xml
 <!--messageScheduled 单独事务管理,不需要敏感性数据源-->
<bean id="messageTask" class="com.today.eventbus.scheduler.MsgPublishTask" init-method="startScheduled">
        <constructor-arg name="topic" value="${kafka_topic}"/>
        <constructor-arg name="kafkaHost" value="${kafka_producer_host}"/>
        <constructor-arg name="tidPrefix" value="${kafka_tid_prefix}"/>
        <constructor-arg name="dataSource" ref="order_dataSource"/>
        <property name="serviceName" value="com.today.api.order.service.OrderService2"/>
</bean>
```

**上述配置解析**
该配置为一个 `Spring Bean` ，初始化方法指定 `startScheduled`，该方法会启动一个定时器，由 `ScheduledExecutorService` 实现，默认的定时触发时间为 `300ms`，我们可以通过设置环境遍历来修改此值。
单位为毫秒

```properties
soa.eventbus.publish.period = 500
```

定时器组件主要的作用是去轮询查找刚才**时刻AB**成功后存储到事件表中的事件消息。每次会最多查询50条记录，然后将这些消息直接发送到kafka中去，如果发送成功了，会打印如下日志。然后发送成功的消息会被删除。

**所以正常情况下**，事件表（`dp_common_event`）表是一个空表，在事件产生的高峰期可能会有一定的堆积。所以，这一个环节，事件表的堆积情况可以反应生产者消息产生的速度，某些情况下需要对其进行监控。

```log
11-26 19:24:59 072 dapeng-eventbus--scheduler-0 INFO [] -
bizProducer:批量发送消息 id:(List(12233961, 12233962, 12233963)),size:[3]
 to kafka broker successful
```

如果我们看到上面这个日志，说明消息是真正的发送 `kafka` 上面了。此时，发送端圆满完成任务，后续过程会将由消费端去进行处理了。
<br/>

#### 4). 生产者原理总结

- **步骤1**: 业务逻辑处理成功，调用 `EventBus.fireEvent()`(需要用户手动调用)
- **步骤2**: 定时器自动轮询消息并发送(配置好即可，对用户不可见)
- **细节**：注意查看两个步骤的 **日志** 来定位消息是否发送成功。

---

### 3.数据库消息表准备

> 这里我们需要两个表。存储业务触发事件的事件表（**`dp_common_event`**）和针对微服务多个实例定时器的**分布式锁**，采用数据库**悲观锁**实现。这个专用事件锁的表为（**`dp_event_lock`**）。

#### 1). dp_common_event 表 schema

```sql
CREATE TABLE `dp_common_event` (
  `id` bigint(20) NOT NULL COMMENT '事件id，全局唯一, 可用于幂等操作',
  `event_type` varchar(255) DEFAULT NULL COMMENT '事件类型',
  `event_biz` varchar(255) DEFAULT NULL COMMENT '事件biz内容(分区落地)',
  `event_binary` blob COMMENT '事件内容',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='事件存储表';
```

我们详细来说明事件表各个字段的作用：

- **`id`**: 此为每一条事件消息的唯一id，由分布式取号服务生成，全局唯一。
- **`event_type`**: 此为当前消息的类型。因为每一个微服务可能存在多个事件类型，所以一个topic产生的消息会有多种类型。该字段保存的是事件类的全限定名。
- **`event_biz`**: **可选项**，如果消费者需要对事件发送按顺序消费，即将相同的 `biztag` 业务内容的消息发送到一个分区去，避免了业务消费方并行消费多个分区相同业务 `bizTag` 时导致数据库竞争死锁等等一系列异常。如果发送事件时，没有带 `bizTag`，则此处存储为 `null`。
- **`event_binary`:** 为事件消息序列化为二进制后存储字段。
- **`updated_at `:** 消息创建时间。

需要注意的是，`blob` 最大存储字节为 `65k`，如果我们一次产生的消息过大，超过了这个大小，将会导致消息存储失败，进而影响整个业务逻辑。所以如果有这种情况，我们可以将 `event_binary` 字段的类型改为 `MediumBlob` ，它支持 `16M` 的字节大小。

#### 2). dp_event_lock 表 schema

```sql
CREATE TABLE `dp_event_lock` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='事件锁Lock表';
```

**注意**：事件锁表在创建之后需要新增一条数据，用这条数据来作为锁。利用了 mysql 的读行级锁的特性。

```sql
insert into `dp_event_lock` set id = 1, name = 'event_lock';
```

`eventbus` 定时轮询生产者内部会使用这条记录来锁住当前操作，相关源码如下：

```scala
withTransaction(dataSource)(conn => {
  //如果生产部署多实例，这里同时有多个定时器会去处理事件，所以利用下面这句话来在
  //同一时间有且仅有一个定时器组件进来并做后续消息的 fetch 和 send 操作
  val lockRow = row[Row](conn, sql"SELECT * FROM dp_event_lock WHERE id = 1 FOR UPDATE")
  // 做后面消息的的 fetch 和 send 逻辑
})
```

---

### 4.事件 IDL 定义

> 事件类型和业务内容需要定义为结构体。待后续序列化和反序列化。

#### 1). 消息定义格式注意事项

1.以事件双方约定的消息内容定义IDL结构体2. 规定必须为每个事件定义事件ID，以便消费者做消息幂等

`==> events.thrift`

```thrift
namespace java com.github.dapeng.user.events

/**
* 注册成功事件, 由于需要消费者做幂等,故加上事件Id
**/
struct RegisteredEvent {
    /**
    * 事件Id
    **/
    1: i64 id,
    /**
    * 用户id
    **/
    2: i64 userId
}
```

#### 2). IDL服务接口事件声明(是谁触发当前事件)

- 接口可能会触发一个或多个事件
- 事件必须在触发接口进行声明，否则事件解码器不会生成

`== >user_service.thrift`

```thrfit
namespace java com.github.dapeng.user.service

include "user_domain.thrift"
include "events.thrift"

/**
* 事件发送端业务服务
**/
service UserService{
/**
# 用户注册
## 事件
    注册成功事件，激活事件
**/
    string register(user_domain.User user)
    (events="events.RegisteredEvent,events.ActivedEvent")

}(group="EventTest")
```

#### 3). 在spring的配置文件`spring/services.xml`进行定义，注意`init-method`指定`startScheduled`

> 上面我们在讲解生产者原理时，讲解到了定时器组件，作用是查询事件表中的消息，并将此消息发送到 `Kafka` 上。

```xml
<!--messageScheduled 定时发送消息bean-->
<bean id="messageTask" class="com.today.eventbus.scheduler.MsgPublishTask" init-method="startScheduled">
    <constructor-arg name="topic" value="${kafka_topic}"/>
    <constructor-arg name="kafkaHost" value="${kafka_producer_host}"/>
    <constructor-arg name="tidPrefix" value="${kafka_tid_prefix}"/>
    <constructor-arg name="dataSource" ref="demo_dataSource"/>
    <!--可选项 >>1  -->
    <property name="serviceName" value="com.today.api.order.service.OrderService2"/>
</bean>
```

#### 4). 各个配置含义详解

- **`topic`**
  Kafka 消息 topic，每一个微服务区分(建议:**服务简名\_版本号\_event**)。
  例如 `order`，使用 topic 为 `order_1.0.0_event`

- **`kafkaHost`**
  kafka集群地址，例如：
  **`192.168.100.1:9092,192.168.100.2:9092,192.168.100.3:9092`**

- **`tidPrefix`**
  kafka事务生产者的前缀，我们规定按服务名来界定。例如
  **`kafka_tid_prefix=order_1.0.0`**

- **`dataSource`**
  使用业务的 `dataSource` ,这里不需要使用事务敏感的 `datasource`，因为事务由定时器组件自己管理。该 `datasource` `ref `在 `spring` 中配置的 `datasource`。

#### 5). 一个完整的配置如下

> **`config_user_service.properties`**

```xml
# event config
kafka_topic=user_1.0.0_event
kafka_producer_host=127.0.0.1:9092
kafka_tid_prefix=user_1.0.0
```

定时器轮询间隔默认为 `100ms`，上面已经有提到。我们可以通过环境变量修改默认的轮询时间，如果是在开发环境下，或者在测试环境下，我们可以将轮询时间设置长一点，比如2s:

```
soa.eventbus.publish.period=2000
```

代表轮询数据库消息库时间，如果对消息及时性很高，请将此配置调低，建议最低为100ms，默认配置是300ms。

---

### 5.生产者消息事件管理器EventBus

> 在做事件触发前,你需要实现 `AbstractEventBus` ,并将其交由spring托管，来做自定义的本地监听分发。

#### 1). 定义消息管理器 EventBus

直接在你项目下定义如下类,注意 dispatchEvent 内的内容可根据具体业务要求实现，**如果没有本地订阅，直接为一个空方法即可**。

```scala
object EventBus extends AbstractEventBus {

  /**
    * 事件在触发后，可能存在本地的监听者，以及跨领域的订阅者
    * 本地监听者可以通过实现该方法进行分发
    * 同时,也会将事件发送到其他领域的事件消息订阅者
    * @param event
    */
  override def dispatchEvent(event: Any): Unit = {
    //此内容可为空
    event match {
      case e: RegisteredEvent => // do somthing
      case _ =>  log.trace(" do nothing ")
    }
  }

  override def getInstance: EventBus.this.type = this
}
```

#### 2). 在 **`Spring`** 的配置文件 `services.xml` 中 注册这个 `EventBus` `Bean`

> spring/services.xml

```xml
<bean id="eventBus" class="com.github.dapeng.service.commons.EventBus" factory-method="getInstance">
    <property name="dataSource" ref="tx_demo_dataSource"/>
</bean>
```

**注意细节**
该 `eventbus` 需要传入业务的事务敏感性 dataSource ，这样可以保证，eventbus 存储消息时，可以和业务逻辑使用同一个连接，这样就可以处于同一个事务之中。
如果是手动管理事务的情况，请参考后文。

#### 3). 业务事件发布(触发)

> 目前由于一些业务，需要对相同的 `BizTag` 分组，希望相同的 `Tag` 的消息能够发送到相同的 `Kafka` 分区中去。所以这里提供两种触发事件的方法，第一种是对没有此需求的普通生产者而言，第二种需要加入一个 bizTag，我们分别介绍。

在 `EventBus` 的父类 `AbstractEventBus` 中定义了两个触发事件的方法，如下

```scala
def fireEvent(event: Any): Unit = {
    dispatchEvent(event)
    persistenceEvent(None, event)
}
/**
* 顺序的触发事件，需要多传入一个业务内容。
* 然后会根据这个内容将相同的tag消息发送到一个分区。
*/
def fireEventOrdered(biz: String, event: Any): Unit = {
    dispatchEvent(event)
    persistenceEvent(Option.apply(biz), event)
}
```

#### 4). 不需要对消息做分区要求的触发事件方式

```scala
EventBus.fireEvent(RegisteredEvent(event_id,user.id))
```

#### 5). 需要对消息做分区要求的触发事件方式

我们这里要传入定义的具有业务意义的 `bizTag`，这个具体需由业务决定。
例如现在有一个订单的完成事件，我们希望相同门店的订单都发往一个分区，因此这里的 `BizTag` 可以选择订单号。相关发送消息如下：

```scala
val orderNo = "123456"
EventBus.fireEvent(orderNo,RegisteredEvent(event_id,user.id))
```

通过上述这种方式，就可以做到根据订单号进行 hash 然后指定到 Kafka 某一个分区，只要是此门店产生的消息都会路由到一个分区中去。关于 kafka 分区的概念，如果比较模糊，可以从网上查询相关资料了解。

---

### 6.记录日志屏蔽

> 生产方因为轮询数据库发布消息，如果间隔很短，会产生大量的日志，需要修改级别，在logback下进行如下配置。

**注意**：配置文件中会对 `eventbus` 的日志单独使用一个文件进行存储，该文件名需要用户根据自己的微服务进行自定义。例如下面配置中的 `detail-goods-eventbus`，中间的 `goods` 就代表当前微服务为 `goods` 服务。**所以注意不要照着下面配置完全复制到你的项目下的 `logback` 配置下**。

```xml
<!--将eventbus包下面的日志都放入单独的日志文件里 dapeng-eventbus.%d{yyyy-MM-dd}.log-->
<appender name="eventbus" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <prudent>true</prudent>
    <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">

        <fileNamePattern>${soa.base}/logs/detail-goods-eventbus.%d{yyyy-MM-dd}.log</fileNamePattern>
        <maxHistory>30</maxHistory>
    </rollingPolicy>
    <encoder>
        <pattern>%d{MM-dd HH:mm:ss SSS} %t %p - %m%n</pattern>
    </encoder>
</appender>

    <!-- additivity:是否向上级(root)传递日志信息, -->
    <!--com.today.eventbus包下的日志都放在上面配置的单独的日志文件里-->
    <logger name="com.today.eventbus" level="INFO" additivity="false">
        <appender-ref ref="eventbus"/>
    </logger>

    <!--sql 日志显示级别-->
    <logger name="druid.sql" level="OFF"/>
    <logger name="wangzx.scala_commons.sql" level="INFO"/>
    <logger name="org.apache.kafka.clients" level="INFO"/>
    <logger name="org.springframework.jdbc.datasource.DataSourceUtils" level="INFO"/>
```

---

## 事件消费者 Consumer

![-x-Brii2QaM.jpg](https://upload-images.jianshu.io/upload_images/6393906-64d03671c762606c.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/640)

### 1. Step1: 消费者项目依赖

#### 1). eventbus 组件依赖

- sbt 工程

```
"com.today" % "event-bus_2.12" % "2.1.1"
```

- maven 工程

```xml
<dependency>
    <groupId>com.today</groupId>
    <artifactId>event-bus_2.12</artifactId>
    <version>2.1.1</version>
</dependency>
```

#### 2). 事件结构体 `API` 的依赖

dapeng的 eventbus发送的消息是通过 thrift 序列化为 byte 数组的，所以消费者再获取到消息后，需要根据事件对应的序列化器/反序列化器 将消息解码为消息对象。这个对象就是消息结构体。我们再之前的生产者中定义了，所以这里就要依赖生产者的API。
例子，我们依赖发送端 demo的 api

- sbt project

```
"com.today" % "event-bus_2.12" % "2.1.1",
"com.today" % "user-api_2.12" % "1.0.0"
```

- maven

```xml
<dependency>
    <groupId>com.today</groupId>
    <artifactId>event-bus_2.12</artifactId>
    <version>2.1.1</version>
</dependency>
<!--事件发送方api-->
<dependency>
    <groupId>com.today</groupId>
    <artifactId>user-api_2.12</artifactId>
    <version>1.0.0</version>
</dependency>
```

### 2. Step2-1: 定义消费者类和监听方法

> 我们的业务服务采用 `Spring` 作为容器，采用 `Spring` 的声明式事务管理。因此，`eventbus` 消费者类设计为一个 `Spring` 类，可以使用到 `Spring` 的事务管理和其他很多特性。

#### 1). 前提和注意事项 (划重点)

- 第一点，消费者类必须是一个 `Spring bean` ，所以要么使用 `xml` 定义该`bean`，要么利用注解加扫包的逻辑，最终该类需要被 `Spring` 管理。
- 第二点，该类的类上需要加上 `eventbus` 中定义的注解 `@KafkaConsumer`，并且配置相应信息。相关例子如下:

```java
@KafkaConsumer(groupId = "demo_subscribe", topic = "member_test",sessionTimeout = 60000)
@Transactional(rollbackFor = Array(classOf[Throwable]))
class DemoConsumer {

}
```

#### 2). **`@KafkaConsumer`** 注解配置详解

![config.png](https://upload-images.jianshu.io/upload_images/6393906-99ec36d3e00f17e9.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/640)

- 一个消费者类上必须定义 `@KafkaConsumer`。然后配置该消费者的 `groupId`，需要定义的 `topic` 和 消费者与 `kafka` 的会话超时时间（此项可选，大多数情况下不用填，默认即可。）

#### 3). 定义消费者方法

> 我们通过 `@KafkaConsumer` 来标明一个消费者 `Bean` 之后，就可以使用
> `@KafkaListener` 注解来 `subscribe` 订阅和消费指定的事件了。

```java
//订阅事件1
@KafkaListener(serializer = classOf[RegisteredEventSerializer])
def subscribeRegisteredEvent(event: RegisteredEvent): Unit = {
    println(s"收到消息 RegisteredEvent  ${event.id} ${event.userId}")
}
//订阅事件2
@KafkaListener(serializer = classOf[ActivedEventSerializer])
def subscribeRegisteredEvent(event: ActivedEvent): Unit = {
  println(s"收到消息 ActivedEvent  ${event.id} ${event.userId} ")
}
```

#### 4). 消费者类和方法注意事项

对于一个 `topic` ，例如 `member_test`，它是 `member` 微服务所有事件的 `Topic`(主题)，也就是说，这个 `topic` 中存了很多种类型的事件，因此。此时我们就通过 `@KafkaListener` 来订阅具体事件类型的消息。

如上面的例子中，在 `member_test` 这个主题中，有两种事件 `RegisteredEvent` 和 `ActivedEvent`。我们需要在 `KafkaListener` 定义该事件的序列化器。

最后，我们需要注意,**监听方法中 `序列化器` 和 `事件类型` 都要采用生成的 `Scala` 版本的代码。**

### 3. Step2-2: 定义消费者类和监听方法 (接收消息元数据信息)

> 在第2点中我们介绍了，怎么定义消费者类和方法来接收消息。此时，我们可以对监听方法新增一个 `ConsumerContext` 参数，来让业务得到当前接受到的消息的元信息。比如消息所属的 `topic`，消息的 `offset` 和 `partition` ，以及消息的创建时间等等。

#### 1). 自定义带有 `ConsumerContext` 方法参数的监听方法

在自定义的消费者方法的参数中加入 `ConsumerContext` 参数，**注意此参数需要放在第一个位置**。

```scala
@KafkaListener(serializer = classOf[RegisteredEventSerializer])
def subscribeRegisteredEvent(context:ConsumerContext, event: RegisteredEvent): Unit = {
    println(s"消息元信息 $context.toString")
    println(s"收到消息 RegisteredEvent  ${event.id} ${event.userId}")
}
```

通过上面这种方式，我们就能过获取到当前消费者订阅的事件的信息。
**建议在日常开发中使用这种方式**，我们的代码只需要增加这个参数即可。关于数据的填充等 **`eventbus`** 内部会自动完成，无需我们自己操心。

#### 2). 关于 ConsumerContext 元信息的内容如下:

```java
public class ConsumerContext {
    //消息的key，可能为消息id，或者消息业务bizTag经过hash后的值。
    //取决于消息发送端有没有使用根据业务tag进行指定发送分区的策略。如果没有，则此key即为消息唯一id。
    private final long key;
    //消息所属 topic
    private final String topic;
    //消息的 offset
    private final long offset;
    //消息的分区信息
    private final int partition;
    //消息产生的时间戳
    private final long timestamp;
    //格式化后的消息创建时间 2018-11-26 12:21:21 321
    private final String timeFormat;
    //创建时间 or 更新时间，一般为创建时间
    private final String timestampType;

    //省略构造函数、getter setter 等
```

---

### 4. Step3: 配置注解支持组件

> 使用 `eventbus` 组件来定义一个一个消费者很容易。只需要借助于几个注解。我们得益于基于 `Spring IOC` 强大的能力来做到这一点。为了能够让 `Spring` 来发现我们定义的消费者，我们还需要进行一些配置。

#### 1). 消费者类Bean 的发现与创建原理

注意，我们刚刚使用了 `@KafkaConsumer` 来标志一个消费者类。但是原生的Spring容器它是没办法知道你这个类就是消费者类的。所以我们还要向Spring 注册一个 `Bean`，该 `Bean` 实现了 `Spring` 的 `BeanPostProcessor` 接口，是Spring的一个扩展接口。我们注册这个bean的作用就是，让它去发现刚才用我们自定义的注解`@KafkaConsumer` 标注的类，让它成为一个消费者类。

#### 2). 配置自定义组件 MsgAnnotationBeanPostProcessor

`xml` 注册只需如下配置，注意该 `bean` 只能在 `Spring` 中注册一次。请不要注册多次(曾经发生过注册多次的现象，导致消费者不生效)。

```xml
<bean class="com.today.eventbus.spring.MsgAnnotationBeanPostProcessor"/>
```

#### 3).注解支持总结(划重点)

- 1.需要注册 **`MsgAnnotationBeanPostProcessor`** 这个 `bean`
- 2. 这个 `bean` 只能注册一次，请勿在 `spring` 配置文件中注册多次( `id` 不同注册多次)

### 5. Step4: 消费者kafka日志多余`debug`日志的屏蔽

`==>logback.xml`

```xml
<logger name="org.apache.kafka.clients.consumer" level="INFO"/>
```

## 消费者重试机制

> 消费者处理消息时，如果业务抛出异常的情况下，消息是会进行重试的。目前默认重试次数为`3`次，初始间隔时间为 `2000ms` 即 `2s` ，每次重试会以 `2` 的倍速增大重试间隔，直到重试结束。并且每次重试时间间隔会逐渐增大。

#### 消息重试前提

- 1.监听方法需要主动抛出异常，如果没有异常抛出，那么**`eventbus`** 组件不会对消息进行重试。
- 2.监听方法如果抛出 **`SoaException`**，组件会认为这是单纯的业务 **`assert`** 异常，消息不会进行重试。

因此，在业务上，我们需要明确什么情况下消息会重试。如果业务在消费消息之前会做前置检查，此时前置检查不通过抛 **`SoaException`**，那么消息重试也没有意义，无论怎么重试，都是报一样的错。

---

#### 消息重试原理

> 消息重试机制底层使用的是 `Spring Retriy`,有兴趣可以学习，相关 [学习资料](https://blog.csdn.net/u011116672/article/details/77823867)

下面是业务消息订阅消费使用的重试策略。默认使用 `DefaultRetryStrategy`，重试次数为 `3` 次。

```java
public class DefaultRetryStrategy extends RetryStrategy {
   /**
     * 重试次数...
     */
    private final int maxAttempts;
    /**
     * 重试间隔时间
     */
    private final int retryInterval;

    public DefaultRetryStrategy(int maxAttempts, int retryInterval) {
        this.maxAttempts = maxAttempts;
        this.retryInterval = retryInterval;
    }
    /**
     * 默认 SimpleRetryPolicy 策略
     * maxAttempts         最多重试次数
     * retryableExceptions 定义触发哪些异常进行重试
     */
    @Override
    protected RetryPolicy createRetryPolicy() {
        SimpleRetryPolicy simpleRetryPolicy = new SimpleRetryPolicy(maxAttempts, Collections.singletonMap(Exception.class, true));
        return simpleRetryPolicy;
    }

    /**
     * 指数退避策略，需设置参数sleeper、initialInterval、maxInterval和multiplier，
     * <p>
     * initialInterval 指定初始休眠时间，默认100毫秒，
     * multiplier      指定乘数，即下一次休眠时间为当前休眠时间*multiplier
     * maxInterval      最大重试间隔为 30s
     * <p>
     * 目标方法处理失败，马上重试，第二次会等待 initialInterval， 第三次等待  initialInterval * multiplier
     * 目前重试间隔 0s 4s 16s 30
     */

    @Override
    protected BackOffPolicy createBackOffPolicy() {
        ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(retryInterval);
        backOffPolicy.setMultiplier(2);
        return backOffPolicy;
    }
}
```

上述 `maxAttempts` 和 `retryInterval` 的默认值分别为 `3` 和 `2000`(ms)
根据上述类的配置，我们可以得到结论：

- 1.第一次重试与消息失败后立刻重试，几乎是马上就进行重试了。
- 2.消息第二次重试会间隔4s，第三次就是 4s \* 4 = 16s
- 3.由于spring retry 最大的重试间隔时间为30s，所以间隔不会大于30s

由上面 `3` 个结论我们可以得出消息重试情况如下，一旦消息重试成功，马上可以`break` 出去，重试结束。
| 次数 | 间隔时间 |
| --- | --- |
| 1 | 立刻重试 |
| 2 | 2s |
| 3 | 4s |
| 4 | 8s |
| 5 | 16s |
|6|30s|

#### 自定义重试次数和重试策略

> 如果上述 `DefaultRetryStrategy` 类无法满足业务需求，比如某些需求对事件消息有严格的要求，需要重试很多次，那么 `eventbus` 类库需要提供这个功能，可以由用户自己设定重试次数和重试间隔时间。
> 我们可以在消费者类注解 `@KafkaConsumer` 中显示的注明重试次数和间隔时间。如下:

```scala
@KafkaConsumer(groupId = "demo_subscribe", topic = "member_test", maxAttempts = 5, retryInterval = 6000)
@Transactional(rollbackFor = Array(classOf[Throwable]))
class DemoConsumer {
    @KafkaListener(serializer = classOf[RegisteredEventSerializer])
    def subscribeRegisteredEvent(event: RegisteredEvent): Unit = {
       println(s"收到消息 RegisteredEvent  ${event.id} ${event.userId}")
    }

    @KafkaListener(serializer = classOf[ActivedEventSerializer])
    def subscribeRegisteredEvent(context: ConsumerContext, event: ActivedEvent): Unit = {
        println(s"收到消息 ActivedEvent  ${event.id} ${event.userId} ")
    }
}
```

上面例子中，我们指定当前消费者类下面的所有订阅方法的重试次数次数为 `5`次，重试间隔时间为 `6s`，一次递增，最大重试间隔为 `30s`。

#### 消费者重试机制总结和划重点

- 消息默认就开启了重试机制，默认 `3` 次，初始间隔 `2s`，然后以 `2` 的倍速增加，最大间隔 `30s`。
- 消息重试的前提是，业务需要抛出除 `SoaException` 以外的异常。
- 用户可以通过在消费者类上自己定义重试次数来覆盖默认重试次数，**建议修改重试次数，不要修改重试间隔时间**。

---

## Kafka Message Agent 消息代理

![image.png](https://upload-images.jianshu.io/upload_images/6393906-52e184e4040870f6.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/640)

---

## END

##### 重点可以看如下发布者demo

```xml
https://github.com/leihuazhe/publish-demo
```

# 示例项目 Samples

- [生产者demo](https://github.com/leihuazhe/producer-demo)
- [消费订阅者demo](https://github.com/leihuazhe/consumer-demo)

- [dapeng eventBus](https://github.com/dapeng-soa/dapeng-event-bus)
