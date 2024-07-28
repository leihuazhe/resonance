![kafka.images](https://upload-images.jianshu.io/upload_images/6393906-846338bab943fa19.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 解决方案

自己实现自定义的反序列化器

```
package com.today.eventbus.serializer;

import org.apache.kafka.common.serialization.Deserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * desc: kafka long类型消息反序列化器. 如果消息 key 不为 long型,将返回 -1L
 *
 * @author hz.lei
 * @since 2018年07月25日 下午6:37
 */
public class KafkaLongDeserializer implements Deserializer<Long> {

    private Logger logger = LoggerFactory.getLogger(getClass());

    public void configure(Map<String, ?> configs, boolean isKey) {
        // nothing to do
    }

    public Long deserialize(String topic, byte[] data) {
        if (data == null)
            return null;
        if (data.length != 8) {
            logger.error(" 收到的消息Key不是Long类型,Size of data received by LongDeserializer is not 8,key内容: " + new String(data));
            return -1L;
        }

        long value = 0;
        for (byte b : data) {
            value <<= 8;
            value |= b & 0xFF;
        }
        return value;
    }

    public void close() {
        // nothing to do
    }
}
}
```
