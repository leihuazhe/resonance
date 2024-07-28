# Dubbo Json 方案

## 网关

网关嵌入 Dubbo 的 service-discovery,loadbalance, router 等等，再最终发送消息给 provider 时，是直接通过传入
json 的形式做到的，请求的时候和 dubbo 现有的泛化调用类似。

当服务端返回数据给网关时，这时候和泛化调用方式则不同了。这里直接使用 hessian2 的时候，直接反序列化成 String Json 的形式。

## Provider

几乎不需要什么改变。

## Detail

send 之后，拿到返回的 ByteBuf 直接对这个 byteBuf 进行解析，如何解析，这个解析器就得自己来写了。

类似 dapeng soa 里面的 JsonSerializer，dapeng 里面使用的是 thrift 协议，比如：

```java
private void read(TProtocol iproto, JsonCallback writer) throws TException {
        iproto.readStructBegin();
        writer.onStartObject();

        while (true) {
            TField field = iproto.readFieldBegin();
            if (field.type == TType.STOP) break;

            Field fld = optimizedStruct.get(field.id);

            boolean skip = fld == null;

            if (!skip) {
                writer.onStartField(fld.name);
                readField(iproto, fld.dataType, field.type, writer);
                writer.onEndField();
            } else { // skip reading
                TProtocolUtil.skip(iproto, field.type);
            }

            iproto.readFieldEnd();
        }


        iproto.readStructEnd();
        writer.onEndObject();
    }
```

上面一段代码是通过 `TProtocol` 来读取 bytebuf,然后在读取的过程中，使用 JsonCallback 的 writer 将读取出来的结果直接写成json。

那么换成 `dubbo` 的话，这里的协议直接改为 `hessian2` 协议即可，然后再读取的过程中，也通过 JsonCallback 来将 hessian 解析的值写入到 writer 中，
达到基本目的。
