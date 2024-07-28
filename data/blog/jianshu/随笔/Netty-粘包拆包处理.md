### 心跳机制

心跳是在 `TCP` 长连接中，客户端和服务端定时向对方发送数据包通知对方自己还在线，保证连接的有效性的一种机制。

在服务器和客户端之间一定时间内没有数据交互时, 即处于 `idle` 状态时, 客户端或服务器会发送一个特殊的数据包给对方, 当接收方收到这个数据报文后, 也立即发送一个特殊的数据报文, 回应发送方, 此即一个 `PING-PONG` 交互. 自然地, 当某一端收到心跳消息后, 就知道了对方仍然在线, 这就确保 `TCP` 连接的有效性。

### 心跳实现

- 使用 `TCP` 协议层的 `Keeplive` 机制，但是该机制默认的心跳时间是2小时，依赖操作系统实现不够灵活。
- 应用层实现自定义心跳机制，比如 `Netty` 实现心跳机制；

IdleStateHandler

> Idle 空闲的，闲置的意思。

当一条 `channel` 连接在一定时间内没有执行 `read`、 `write` 操作 或者两者都没有时，`IdleStateHandler` 就会触发一个 `IdleStateEvent` 事件。

| Property       | Meaning                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| readerIdleTime | an `IdleStateEvent` whose state is [`IdleState.READER_IDLE`](https://netty.io/4.0/api/io/netty/handler/timeout/IdleState.html#READER_IDLE) will be triggered when no read was performed for the specified period of time. Specify `0` to disable. |
| writerIdleTime | an `IdleStateEvent`  whose state is `IdleState.WRITER_IDLE` will be triggered when no write was performed for the specified period of time. Specify `0` to disable.                                                                               |
| allIdleTime    | an `IdleStateEvent` whose state is `IdleState.ALL_IDLE` will be triggered when neither read nor write was performed for the specified period of time. Specify `0` to disable.                                                                     |

中文翻译：
| 属性 | 作用含义 |
| --- | --- |
| readerIdleTime |在指定的时间内没有读操作，会触发 `IdleStateEvent` 的 `READER_IDLE` 事件。设置为 0 则会禁用此功能。 |
| writerIdleTime | 在指定的时间内没有写操作，会触发 `IdleStateEvent` 的 `WRITER_IDLE` 事件。设置为 0 则会禁用此功能。|
| allIdleTime |在指定的时间内既没有读操作也没有写操作，会触发 `IdleStateEvent` 的 `ALL_IDLE` 事件。设置为 0 则会禁用此功能。

An example that sends a ping message when there is no outbound traffic for 30 seconds. The connection is closed when there is no inbound traffic for 60 seconds.

一个应用例子是，当在 30s 内当前连接没有写操作 (出站操作) 时，发送一个 ping 心跳消息。
当在 60s 内没有读操作 (入站操作) 时，关闭这条 `channel` 连接。

```java
public class MyChannelInitializer extends ChannelInitializer<Channel> {
    @Override
    protected void initChannel(Channel ch) throws Exception {
        ch.pipeline().addLast("idleStateHandler", new IdleStateHandler(60, 30, 0));
        ch.pipeline().addLast("myHandler", new MyHandler());
    }
}


public class MyHandler extends ChannelDuplexHandler {
    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        if (evt instanceof IdleStateEvent) {
            IdleStateEvent e = (IdleStateEvent) evt;
           // 读事件状态超时，关闭连接
            if (e.state() == IdleState.READER_IDLE) {
                ctx.close();
            // 写事件状态超时，发送心跳
            } else if (e.state() == IdleState.WRITER_IDLE) {
                ctx.writeAndFlush(new PingMessage());
            }
        }
    }
}
```
