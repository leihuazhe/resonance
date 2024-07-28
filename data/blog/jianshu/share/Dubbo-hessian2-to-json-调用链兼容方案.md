> 这里我们主要分析如何兼容原 Dubbo 的调用链关系,主要分析的是 decode这个模块。

### Decode 流程

- 1 InternalDecoder：

```java
protected void decode(ChannelHandlerContext ctx, ByteBuf input, List<Object> out) throws Exception {

    ChannelBuffer message = new NettyBackedChannelBuffer(input);

    NettyChannel channel = NettyChannel.getOrAddChannel(ctx.channel(), url, handler);

    try {
        // decode object.
        do {
            int saveReaderIndex = message.readerIndex();
            //最重要的一行，这里的 codec 就是 DubboCountCodec.
            Object msg = codec.decode(channel, message);
            if (msg == Codec2.DecodeResult.NEED_MORE_INPUT) {
                message.readerIndex(saveReaderIndex);
                break;
            } else {
                //is it possible to go here ?
                if (saveReaderIndex == message.readerIndex()) {
                    throw new IOException("Decode without read data.");
                }
                if (msg != null) {
                    out.add(msg);
                }
            }
        } while (message.readable());
    } finally {
        NettyChannel.removeChannelIfDisconnected(ctx.channel());
    }
}
```

- 2. DubboCountCodec
     在 DubboCountCodec 中马上调用 DubboCodec 进行了解码操作

```java
@Override
public Object decode(Channel channel, ChannelBuffer buffer) throws IOException {
    int save = buffer.readerIndex();
    MultiMessage result = MultiMessage.create();
    do {
    	//重点代码，这里的 codec 是 DubboCodec
       //这里得到的 obj 是 Response, 其中包含了 mResult: DecodeableRpcResult 其中包含了结果 result.
        Object obj = codec.decode(channel, buffer);
        if (Codec2.DecodeResult.NEED_MORE_INPUT == obj) {
            buffer.readerIndex(save);
            break;
        } else {
            result.addMessage(obj);
            logMessageLength(obj, buffer.readerIndex() - save);
            save = buffer.readerIndex();
        }
    } while (true);
    if (result.isEmpty()) {
        return Codec2.DecodeResult.NEED_MORE_INPUT;
    }
    if (result.size() == 1) {
        return result.get(0);
    }
    return result;
}
```

上述会调用父类 `ExchangeCodec`,DubboCodec主要需要实现的类是 `decodeBody`，从ExchangeCodec调用过来，模板方法。

```java
protected Object decodeBody(Channel channel, InputStream is, byte[] header) throws IOException {
    // 省略部分代码 ....
    try {
            if (status == Response.OK) {
                Object data;
                if (res.isHeartbeat()) {
                    ObjectInput in = CodecSupport.deserialize(channel.getUrl(), is, proto);
                    data = decodeHeartbeatData(channel, in);
                } else if (res.isEvent()) {
                    ObjectInput in = CodecSupport.deserialize(channel.getUrl(), is, proto);
                    data = decodeEventData(channel, in);
                } else {
                    DecodeableRpcResult result;
                    if (channel.getUrl().getParameter(DECODE_IN_IO_THREAD_KEY, DEFAULT_DECODE_IN_IO_THREAD)) {
                    	//主要逻辑在这里
                        result = new DecodeableRpcResult(channel, res, is,
                                (Invocation) getRequestData(id), proto);
                        result.decode();
                    } else {
                        result = new DecodeableRpcResult(channel, res,
                                new UnsafeByteArrayInputStream(readMessageData(is)),
                                (Invocation) getRequestData(id), proto);
                    }
                    data = result;
                }
                res.setResult(data);
            } else {
                ObjectInput in = CodecSupport.deserialize(channel.getUrl(), is, proto);
                res.setErrorMessage(in.readUTF());
            }
        } catch (Throwable t) {
            if (log.isWarnEnabled()) {
                log.warn("Decode response failed: " + t.getMessage(), t);
            }
            res.setStatus(Response.CLIENT_ERROR);
            res.setErrorMessage(StringUtils.toString(t));
        }
    return res;
}
```

我们需要自定义的重点代码在 `DecodeableRpcResult` 中，在此代码的下面方法中，嵌入类似 dapeng json 的做法。

```java
private void handleValue(ObjectInput in) throws IOException {
    try {
        Type[] returnTypes = RpcUtils.getReturnTypes(invocation);
        Object value = null;
        if (ArrayUtils.isEmpty(returnTypes)) {
            value = in.readObject();
        } else if (returnTypes.length == 1) {
            value = in.readObject((Class<?>) returnTypes[0]);
        } else {
            value = in.readObject((Class<?>) returnTypes[0], returnTypes[1]);
        }
        setValue(value);
    } catch (ClassNotFoundException e) {
        rethrow(e);
    }
}
```

在上述代码中，ObjectInput in 实现类就是 `Hessian2ObjectInput`，所以这里的 decode 操作都是采用 hessian2 协议进行反序列化的。那么我的想法是在 hessian2 反序列化的过程中，我们嵌入类似 dapeng-json 的做法，每次hessian2 解析一个字段时，我们将其对应的转换到 json 中，最终会将返回的结果转换为
json 形式返回。

## 总结

如果我们在这里实现了，那么我们怎么去改变 `dubbo` 的调用链来兼容我们的做法呢?

- 1.自定义一个Codec2，与 DubboCountCodec 类似，暂时命名为 CustomDoubleCountCodec,因为这个类是通过 扩展点机制加载的，我们在 url 中将默认的codec dubbo 改为我们实现的这个类即可。

- 2.但是我们将不再持有 DubboCodec，而持有自己实现的 CustomDubboCodec。

- 3.这个新类主要改变的代码逻辑就是其 decodeBody，例如在 new 的result结果中，将 DecodeableRpcResult 替换为我们自己实现的类，
  然后这里的 result 始终将返回的是 String 类型。
