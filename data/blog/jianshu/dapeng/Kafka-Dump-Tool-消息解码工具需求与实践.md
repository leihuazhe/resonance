![图片发自简书App](http://upload-images.jianshu.io/upload_images/6393906-e7e6da443a3cb1f1.jpg)

# Kafka Dump Tool (以下简称 KDT)

> 目前我司 `Rpc` 框架 `dapeng-soa` 附属周边产品 `Eventbus` 发送和接收的消息是经过 `Thrift` 协议序列化后的。`kafka` 会将消息持久化到 `broker` 端。在开发过程中，可能我们需要知道发送的消息内容是什么。因此需要一个途径能够从 `broker` 已存储的消息中取出自己想要的消息内容。

## Kafka Dump Tool 需求点

1.根据消息 `topic` 和 `offset` 指定获取到具体的消息内容。2.根据 `topic` 和 `offset` 获取一定范围内的消息内容。3.根据消息发送时间模糊查询出这段时间内某个 `topic` 内的消息内容。

## 实现原理

1.消息通过特定的序列化器被序列化后存到了 `kafka` 内。所以要知道指定消息的元数据信息。元数据信息通过 `xml` 或者上传的方式以文件的方式告知给 `KDT`。`KDT` 解析元数据信息。放入内存。这样，前提解码器已经准备就绪。2.通过指定 `offset` 和指定需要解析的消息条数设置拉取消息。

- 原理
  `KDT` 会启动一个消费者，通过 `consumer.peek(offset)` 的形式将消费者拉取偏移量设置到指定设置处。这样可以将 `broker` 中的消息拉取下来。然后通过元数据拿到 `thrift` 消息解码器。将消息解码，展示给用户界面。当拉取了指定数量的消息后，停止消费者（或者暂停）。拉取结束。

  3.通过指定时间的拉取方式。

## Todo

## 注意点

- 关键点就是如何选取 `offset`，最好要提供多种方案。
  比如：指定 `offset`，从最末尾开始，从某个时间点开始。
  以及查询某个 `groupId` 的当前 `offset`。
  输出格式包括 `JSON`, `pretty formatted JSON` 等，能够方便进行 `shell` 的管道操作。
