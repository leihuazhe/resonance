> 本文将从三个需求点进行切入，并提供方案选择

- 1.手动选择分区，并指定拉取offset 对消息进行重新消费
- 2.关于消息生产者端，根据bizTag将相同bizTag内容的消息hash发送到一个分区方案
- 3.为业务消费者新增 offset 和 partition 参数

## 关于消息拉取偏移量的重置重新消费

> 关于消息的重新消费问题之前，我们先看现有的 核心重试代码

```java
while (isRunning) {
      try {
            ConsumerRecords<KEY, VALUE> records = consumer.poll(100);
            if (records != null && records.count() > 0) {
                  for (ConsumerRecord<KEY, VALUE> record : records) {
                        try {
                            for (ENDPOINT bizConsumer : bizConsumers) {
                                //处理业务消息
                                dealMessage(bizConsumer, record.value(), record.key());
                            }
                        } catch (Exception e) {
                            logger.error(/*省略...*/);
                            //放入BlockingQueue 重试队列
                            retryMsgQueue.put(record);
                        }

                        try {
                            //record每消费一条就提交一次(性能会低点)
                            consumer.commitSync();
                        } catch (CommitFailedException e) {
                            break;
                        }
                    }
                }
        } catch (Exception e) {
                logger.error("[KafkaConsumer][{}][run] " + e.getMessage(), groupId + ":" + topic, e);
        }
}
```

重试有多种策略:

```java
private void beginRetryMessage() {
        executor.execute(() -> {
            while (true) {
                try {
                    ConsumerRecord<KEY, VALUE> record = retryMsgQueue.take();
                    logger.error("[Retry]: 消息偏移量:[{}],进行重试 ", record.offset());
                    for (ENDPOINT endpoint : bizConsumers) {
                        /**
                         * 将每一条重试逻辑放入新的线程中
                         */
                        executor.execute(() -> retryStrategy.execute(() -> dealMessage(endpoint, record.value(), record.key())));
                    }
                    logger.info("retry result {} \r\n", record);
                } catch (InterruptedException e) {
                    logger.error("InterruptedException error", e);
                }
            }
        });
}
```

重试消费例子日志：

![image.png](https://upload-images.jianshu.io/upload_images/6393906-3bf00b5f58b47b8a.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## `Seek` 重新消费方案

`kafka` 提供的理论基础,订阅 topic 时，加入 `ConsumerRebalanceListener` 监听器,当分区分配好之后，可以将拉取偏移量设置到想要的为止。
我们可以通过这个方案，做到重新开始拉取之前已经消费过的消息的逻辑。

### 实现条件

- 1. `need to know partitions and which offset begin`
     哪个分区的消息需要重新被消费，需要从哪个offset开始消费。
- 2. `eventbus` 会提供一个接口设置消费者启动时，设置分区和需要 `seek` 的偏移量。

```java
public class MsgConsumerRebalanceListener implements ConsumerRebalanceListener {
    public MsgConsumerRebalanceListener(Consumer consumer) {
        this.consumer = consumer;
    }

    @Override
    public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
        logger.info("[RebalanceListener-Assigned]:reblance assigned 触发, partition重新分配");
        partitions.forEach(partition -> {
            //获取消费偏移量，实现原理是向协调者发送获取请求
            OffsetAndMetadata offset = consumer.committed(partition);
            logger.info("onPartitionsAssigned: partition:{}, offset:{}", partition, offset);
            if (offset == null) {
                logger.info("assigned offset is null ,do nothing for it !");
            } else {
                //设置本地拉取分量，下次拉取消息以这个偏移量为准
                consumer.seek(partition, offset.offset());
            }
        });
    }
}
```

# 2. 提供根据业务 `bizTag` 将相同消息 `hash` 后发入同一个分区

> 业务需求，例如根据同一个门店号 `storeId`,将消息发入同一个分区。
> 由于目前 `dp-event-bus` 生产者为保证 消息至少一次和事务保障，采用的消息发送逻辑如下：

## step1

随 `biz` 业务逻辑事务一起，业务在业务上下文中发送事件，事件会存入到 `mysql` 事件表中，和业务上下文一起提交或者回滚。做到事务消息前提。
注意：此时消息内容被编码了，以 `binary` 的形式存入数据库。
| `id` | `eventType` | 内容|
| --- | --- | --- |
| 事件唯一`id`|事件类型 |事件具体内容(`binary`) |

## step2

定时器，每一个有生产者的服务都会有一个事件轮询定时器，默认 `100ms` 轮询一次数据库，可指定。轮询到事件表中的内容后将消息发送到 `kafka` 集群。

## 增加根据 `bizTag hash`

业务在 `EventBus.fireEvent` 时， 需要新增一个 `bizTag` 标示，此标志会一起存入到数据中，数据库中 dp_common_event 表需要加一个标示 `key_hash` 的字
段
| `id` | `eventType` | `hash_key` | 内容|
| --- | --- | --- |---|
| 事件唯一`id`|事件类型 | `bizTag` |事件具体内容(`binary`) |

定时器在发送消息时，可以获取到该 `biztag`
`kafka` 给我们提供了分区 `Partitioner` 策略，只需要我们实现这个接口即可，下面是一个例子。

```java
public class SimplePartitioner implements Partitioner {

    @Override
    public int partition(String topic, Object key, byte[] keyBytes, Object value, byte[] valueBytes, Cluster cluster) {
        List<PartitionInfo> partitions = cluster.partitionsForTopic(topic);
        int numPartitions = partitions.size();
        /**
         *由于我们按key分区，在这里我们规定：key值不允许为null。在实际项目中，key为null的消息*，可以发送到同一个分区。
         */
        if (keyBytes == null) {
            throw new InvalidRecordException("key cannot be null");
        }
        if (((String) key).equals("1")) {
            return 1;
        }
        //如果消息的key值不为1，那么使用hash值取模，确定分区。
        return Utils.toPositive(Utils.murmur2(keyBytes)) % numPartitions;
    }

    @Override
    public void close() {

    }

    @Override
    public void configure(Map<String, ?> configs) {

    }
}
```

这样即可以满足需求

## 3. 将当前消息的 `offset` 和 `partition` 推送给业务。

方法：用户可以定义如下监听方法。

```java
@KafkaConsumer(groupId = "test", topic = "order_test")
@Transactional(rollbackFor = Array(classOf[Throwable]))
class OrderEventConsumer {

  @KafkaListener(serializer = classOf[StockEventSerializer])
  def processStockEventByOrder(event: StockEvent,offset:Long,partition:Long): Unit = {
    logger.info(s"your partition $partition, offset: $offset")
    logger.info(s"开始处理Order库存消息")
    new ProcessStockAction(event.stockList).execute
  }
}
```

我会新增一种策略，将当前消息的分区信息和 `offset` 信息赋值给这两个变量。
