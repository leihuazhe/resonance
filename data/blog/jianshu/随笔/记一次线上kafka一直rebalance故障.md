> 今天我司线上kafka消息代理出现错误日志，异常rebalance，而且平均间隔2到3分钟就会rebalance一次，分析日志发现比较严重。错误日志如下

```
08-09 11:01:11 131 pool-7-thread-3 ERROR [] -
commit failed
org.apache.kafka.clients.consumer.CommitFailedException: Commit cannot be completed since the group has already rebalanced and assigned the partitions to another member. This means that the time between subsequent calls to poll() was longer than the configured max.poll.interval.ms, which typically implies that the poll loop is spending too much time message processing. You can address this either by increasing the session timeout or by reducing the maximum size of batches returned in poll() with max.poll.records.
        at org.apache.kafka.clients.consumer.internals.ConsumerCoordinator.sendOffsetCommitRequest(ConsumerCoordinator.java:713) ~[MsgAgent-jar-with-dependencies.jar:na]
        at org.apache.kafka.clients.consumer.internals.ConsumerCoordinator.commitOffsetsSync(ConsumerCoordinator.java:596) ~[MsgAgent-jar-with-dependencies.jar:na]
        at org.apache.kafka.clients.consumer.KafkaConsumer.commitSync(KafkaConsumer.java:1218) ~[MsgAgent-jar-with-dependencies.jar:na]
        at com.today.eventbus.common.MsgConsumer.run(MsgConsumer.java:121) ~[MsgAgent-jar-with-dependencies.jar:na]
        at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149) [na:1.8.0_161]
        at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624) [na:1.8.0_161]
        at java.lang.Thread.run(Thread.java:748) [na:1.8.0_161]
```

这个错误的意思是，消费者在处理完一批poll的消息后，在同步提交偏移量给broker时报的错。初步分析日志是由于当前消费者线程消费的分区已经被`broker`给回收了，因为kafka认为这个消费者死了，那么为什么呢？

## 分析问题

这里就涉及到问题是消费者在创建时会有一个属性`max.poll.interval.ms`，
该属性意思为kafka消费者在每一轮`poll()`调用之间的最大延迟,消费者在获取更多记录之前可以空闲的时间量的上限。如果此超时时间期满之前`poll()`没有被再次调用，则消费者被视为失败，并且分组将重新平衡，以便将分区重新分配给别的成员。
![image.png](https://upload-images.jianshu.io/upload_images/6393906-b8b55e762acc7b8a.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

如上图，在while循环里，我们会循环调用poll拉取broker中的最新消息。每次拉取后，会有一段处理时长，处理完成后，会进行下一轮poll。引入该配置的用途是，限制两次poll之间的间隔，消息处理逻辑太重，每一条消息处理时间较长，但是在这次poll()到下一轮poll()时间不能超过该配置间隔，协调器会明确地让使用者离开组，并触发新一轮的再平衡。
`max.poll.interval.ms`默认间隔时间为300s

### 分析日志

从日志中我们能看到poll量有时能够达到250多条
![image.png](https://upload-images.jianshu.io/upload_images/6393906-968ca143b04b7343.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
一次性拉取250多条消息进行消费，而由于每一条消息都有一定的处理逻辑，根据以往的日志分析，每条消息平均在500ms内就能处理完成。然而，我们今天查到有两条消息处理时间超过了1分钟。

#### 消息处理日志1

```
08-09 08:50:05 430 pool-7-thread-3 INFO [] - [RestKafkaConsumer] receive message (收到消息，准备过滤，然后处理), topic: member_1.0.0_event ,partition: 0 ,offset: 1504617
08-09 08:50:05 431 pool-7-thread-3 INFO [] - [RestKafkaConsumer]:解析消息成功,准备请求调用!
```

```
08-09 08:51:05 801 pool-7-thread-3 INFO [] - [HttpClient]:response code: {"status":200,"data":{"goodsSendRes":{"status":400,"info":"指>定商品送没有可用的营销活动--老pos机"},"fullAmountSendRes":{"status":400,"info":"满额送没有可用的营销活动--老pos机"}},"info":"发券流程执
行成功"}, event:com.today.api.member.events.ConsumeFullEvent, url:https://wechat-lite.today36524.com/api/dapeng/subscribe/index,event内
容:{"id":36305914,"score":16,"orderPrice":15.9,"payTime":1533775401000,"thirdTransId":"4200000160201808
```

#### 消息处理日志2

```
08-09 08:51:32 450 pool-7-thread-3 INFO [] - [RestKafkaConsumer] receive message (收到消息，准备过滤，然后处理), topic: member_1.0.0_event ,partition: 0 ,offset: 1504674
08-09 08:51:32 450 pool-7-thread-3 INFO [] - [RestKafkaConsumer]:解析消息成功,准备请求调用!
```

```
08-09 08:52:32 843 pool-7-thread-3 INFO [] - [HttpClient]:response code: {"status":200,"data":{"goodsSendRes":{"status":400,"info":"指>定商品送没有可用的营销活动--老pos机"},"fullAmountSendRes":{"status":400,"info":"满额送没有可用的营销活动--老pos机"}},"info":"发券流程执
行成功"}, event:com.today.api.member.events.ConsumeFullEvent, url:https://wechat-lite.today36524.com/api/dapeng/subscribe/index,event内
容:{"id":36306061,"score":3,"orderPrice":3.0,"payTime":1533775482000,"thirdTransId":"420000016320180809
```

我们看到消息消费时间都超过了1分钟。

### 分析原因

如下是我们消费者处理逻辑(省略部分代码)

```java
 while (isRunning) {
            ConsumerRecords<KEY, VALUE> records = consumer.poll(100);
            if (records != null && records.count() > 0) {

            for (ConsumerRecord<KEY, VALUE> record : records) {
                dealMessage(bizConsumer, record.value());
                try {
                    //records记录全部完成后，才提交
                      consumer.commitSync();
                } catch (CommitFailedException e) {
                      logger.error("commit failed,will break this for loop", e);
                        break;
                }
            }
}
```

`poll()`方法该方法轮询返回消息集，调用一次可以获取一批消息。

`kafkaConsumer`调用一次轮询方法只是拉取一次消息。客户端为了不断拉取消息，会用一个外部循环不断调用消费者的轮询方法。每次轮询到消息，在处理完这一批消息后，才会继续下一次轮询。但如果一次轮询返回的结构没办法及时处理完成，会有什么后果呢？服务端约定了和客户端`max.poll.interval.ms`，两次`poll`最大间隔。如果客户端处理一批消息花费的时间超过了这个限制时间，服务端可能就会把消费者客户端移除掉，并触发`rebalance`。

### 拉取偏移量与提交偏移量

`kafka`的偏移量(`offset`)是由消费者进行管理的，偏移量有两种，`拉取偏移量`(position)与`提交偏移量`(committed)。拉取偏移量代表当前消费者分区消费进度。每次消息消费后，需要提交偏移量。在提交偏移量时，`kafka`会使用`拉取偏移量`的值作为分区的`提交偏移量`发送给协调者。
如果没有提交偏移量，下一次消费者重新与broker连接后，会从当前消费者group已提交到broker的偏移量处开始消费。
所以，问题就在这里，当我们处理消息时间太长时,已经被broker剔除，提交偏移量又会报错。所以拉取偏移量没有提交到broker，分区又rebalance。下一次重新分配分区时，消费者会从最新的已提交偏移量处开始消费。这里就出现了重复消费的问题。

### 解决方案

#### 1.增加`max.poll.interval.ms`处理时长

kafka消费者 **默认**此间隔时长为300s，本次故障是300s都没处理完成，于是改成500s。

```
max.poll.interval.ms=500000
```

#### 2.设置分区拉取阈值

kafkaConsumer调用一次轮询方法只是拉取一次消息。客户端为了不断拉取消息，会用一个外部循环不断调用轮询方法poll()。每次轮询后，在处理完这一批消息后，才会继续下一次的轮询。

```
max.poll.records = 50
```

#### 3.poll到的消息，处理完一条就提交一条，当出现提交失败时，马上跳出循环，这时候kafka就会进行`rebalance`,下一次会继续从当前`offset`进行消费。

```java
 while (isRunning) {
            ConsumerRecords<KEY, VALUE> records = consumer.poll(100);
            if (records != null && records.count() > 0) {

            for (ConsumerRecord<KEY, VALUE> record : records) {
                dealMessage(bizConsumer, record.value());
                try {
                    //records记录全部完成后，才提交
                      consumer.commitSync();
                } catch (CommitFailedException e) {
                      logger.error("commit failed,will break this for loop", e);
                        break;
                }
            }
}
```

## 附录 查询日志 某个topic的 `partition` 的rebalance过程

> member_1分区

| 时间     | revoked position | revoked committed | 时间     | assigned |
| -------- | ---------------- | ----------------- | -------- | -------- |
| 08:53:21 | 1508667          | 1508509           | 08:57:17 | 1508509  |
| 09:16:31 | 1509187          | 1508509           | 09:21:02 | 1508509  |
| 09:23:18 | 1509323          | 1508509           | 09:26:02 | 1508509  |
| 09:35:16 | 1508509          | 1508509           | 09:36:03 | 1508509  |
| 09:36:21 | 1508509          | 1508509           | 09:41:03 | 1508509  |
| 09:42:15 | 1509323          | 1508509           | 09:46:03 | 1508509  |
| 09:47:19 | 1508509          | 1508509           | 09:51:03 | 1508509  |
| 09:55:04 | 1509323          | 1509323           | 09:56:03 | 1509323  |
| 多余消费 | 被回滚           | 重复消费          | 10:01:03 | 1509323  |
| 10:02:20 | 1510205          | 1509323           | 10:06:03 | 1509323  |
| 10:07:29 | 1509323          | 1509323           | 10:08:35 | 1509323  |
| 10:24:43 | 1509693          | 1509693           | 10:25:18 | 1509693  |
| 10:28:38 | 1510604          | 1510604           | 10:35:18 | 1510604  |
| 10:36:37 | 1511556          | 1510604           | 10:40:18 | 1510604  |
| 10:54:26 | 1511592          | 1511592           | 10:54:32 | 1511592  |
| -        | -                | -                 | 10:59:32 | 1511979  |
| 11:01:11 | 1512178          | 1512178           | 11:03:40 | 1512178  |
| 11:04:35 | 1512245          | 1512245           | 11:08:49 | 1512245  |
| 11:12:47 | 1512407          | 1512407           | 11:12:49 | 1512407  |
