## 目的

> 我们希望对所有有趣的`traces`进行采样，而不是盲目地根据固定采样率对所有`traces`进行采样。什么叫有趣的traces呢？例如耗时很久的链路，调用错误的链路，各种意外结束的链路等等，都是业务非常感兴趣的。换个说法，我们希望对这些链路全部采样，这样非常有助于工程师们来定位问题。

## 实现原理

- agent
- collector

客户端(各类业务服务) 内嵌了链路收集agent，或者在业务服务当前机器启动一个收集agent。我们谈论后者， 以 TCP/UDP 的方式像 agent 发送全量 Spans 信息，不采样，直接全量。

本地 采集agent 会将所有 Spans 存储在内存中，并将有关 spans 的最小 statistics(统计信息) 提交给中央采集 collector。在上报的时候使用一致性hash策略(consistent hashing)，这样有关给定traces的statistics是从单个jaeger-collector上的多个主机收集的。
一旦 trace 整个链路收集完成后，collector 会判断当前的 trace 是不是我们感兴趣的。如果是感兴趣的链路，它将从其他采集agent中提取其余的链路详情数据 (complete spans, with tags, events, and micro-logs) ，并将其转发到Kafka/ES等中间件中，以便后续存储。如果认为当前trace无关紧要，则 collector 将通知 采集agents可以丢弃数据。

Tail-based采集 对比 Head-based采集需要更多的资源占用，但是好处也很多，我们需要在中间做一个平衡。
