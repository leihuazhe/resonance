## 1.背景

> 目前有一个kafka消费者工程,此工程会消费kafka中的消息，并通过fastjson解析该消息为java实体，然后存入到阻塞队列 BlockingQueue中。另外有若干个线程会从queue中批量拿消息，然后以批量形式写入到 elasticsearch 中。目前在使用中发现存在性能瓶颈，需要定位是该工程对消息转化处理较慢，还是写es操作比较慢。

[Async-profiler](https://github.com/jvm-profiling-tools/async-profiler)

## 2.改造准备

为测试此工程最大处理速率，并排除写 es 的干扰，于是打算直接将最后写es这一步替换为写入到本地日志文件中，来看看其处理性能如何。

### 2.1 修改写消息到文件代码

1.将写es的逻辑改为直接写入到本地单独的日志文件

2.单独的日志logger 命名为 `dummy.es.transport`

3.使用计数器，每写入一条消息，就记录一次，然后通过定时线程每秒打印一次请求速率。

```java
@Component
public class DummyEsTransportOpt {
    /**
     * 定义 dummy.es.transport 作为logger名,将所有收到的消息追加到指定的日志文件中去.
     */
    private static Logger esLogger = LoggerFactory.getLogger("dummy.es.transport");

    private static Logger logger = LoggerFactory.getLogger(DummyEsTransportOpt.class);

    private static ScheduledExecutorService schedule = Executors.newScheduledThreadPool(1);

    /**
     * 消息插入计数器,记录处理消息数并计算每秒处理速度.
     */
    private static AtomicLong counter = new AtomicLong();

    private static long initialCounter = 0L;

    /**
     * 写 es 消息主要通过这个方法进行批量写，这里直接替换为记录到本地日志中。
     */
    public <T extends BaseElasticsearchEntity> boolean batchAddDocument(List<T> entityList) {

        for (int i = 0; i < entityList.size(); i++) {
            //计数器,以判断速率.
            counter.incrementAndGet();
            T t = entityList.get(i);
            String json = JSON.toJSONString(t);
            if (t instanceof Annotation) {
                //esLogger 为专门的写消息的日志文件 appender.
                esLogger.info("A => " + json);
            } else {
                esLogger.info("S => " + json);
            }
        }
        return true;
    }
    /**
     * schedule 统计
     */
    static {
        schedule.scheduleAtFixedRate(new Runnable() {
            @Override
            public void run() {
                long count = counter.get();
                logger.info("运行已处理消息数量: " + count + ",对比上一秒处理速率: " + (count - initialCounter) + "/s");
                initialCounter = count;
            }
        }, 0, 1, TimeUnit.SECONDS);
    }
}
```

### 2.2 日志输出配置

日志框架使用的是 log4j, 单独配置 `dummyEsAppender`, logger 名为 `dummy.es.transport` 的日志将会写入到 `dummy-es-transport.log` 这个文件中。

```xml

<appender name="dummyEsAppender" class="org.apache.log4j.DailyRollingFileAppender">

    <param name="File" value="./logs/dummy-es-transport.log"/>

    <param name="DatePattern" value="'.'yyyy-MM-dd'.log'"/>

    <layout class="org.apache.log4j.PatternLayout">

        <param name="ConversionPattern"

               value="[%d{yyyy-MM-dd HH:mm:ss SSS\} %-5p] [%t] %c.%M() - %m%n"/>

    </layout>

</appender>

<logger name="dummy.es.transport" additivity="false">

    <level value="info"/>

    <appender-ref ref="dummyEsAppender"/>

</logger>
```

## 3.测试

### 3.1第一次测试

打包程序上线运行,观察定时线程每秒打印的速率，大概每秒处理写入的消息为 23000条/s。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-c32d1dca4781825e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

有点疑惑这个处理速率是不是太低了一点。怀疑日志框架同步 appender 比较慢，于是将其改为异步。

### 3.2 第二次测试

> 日志输出同步转异步

在同步模式的基础上，增加异步的配置模式:

```xml
<logger name="dummy.es.transport" additivity="false">
    <level value="info"/>
    <appender-ref ref="async"/>
</logger>

<appender name="async" class="org.apache.log4j.AsyncAppender">
    <param name="BufferSize" value="500"/>
    <appender-ref ref="dummyEsAppender"/>
</appender>
```

修改好之后，重新启动程序，观察处理速率。此时发现处理速度在 4万/s 左右。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-7d105a67394eca01.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

将日志级别调整为 warn，即不输出日志，重新启动程序，再次观察。此时速度能够达到 70000/s

![image.png](https://upload-images.jianshu.io/upload_images/6393906-0585723340dcf163.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

想不通为什么日志appender的性能消耗这么严重，正当不知道如下下手时，领导推荐使用 async-profiler 来定位时间到底耗在了哪里。

## 4. Async-profiler 和 火焰图分析

> Async-profiler 可以观测运行程序，每一段代码所占用的cpu的时间和比例,从而可以分析并找到项目中占用cpu时间最长的代码片段，优化热点代码，达到优化内存的效果。

### 4.1采集cpu profile数据

我们将代码回退到第一次测试的情况,并启动程序，并找到当前进程号(627891)，然后通过如下命令进行采集，并转换为火焰图格式 svg。

```
./profiler.sh -d 15 -i 50ms -o svg -e cpu 627891  > 627891.svg
```

- -d N   分析持续时间（以秒为单位）。如果未提供启动，恢复，停止或状态选项，则探查器将运行指定的时间段，然后自动停止

- -i N 设置分析间隔(以纳秒或者毫秒等作为单位),默认分析间隔为10ms

- -o  specifies what information to dump when profiling ends,如果选择 svg,produce Flame Graph in SVG format.

等待15s，就会产生结果，生成 627891.svg 文件。vim 627891.svg 并删除第一行，然后下载到本地并使用浏览器打开。

结果如下图，此图俗称火焰图，主要看每个方法的横轴长度，占用横坐标越长的操作，其占用的 cpu 即最长，很直观的。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-8756a436fb1cc406.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 4.2 性能黑点分析

我们首先发现下图红框内的代码存在严重的性能问题。在append的过程中，获取线程 stack 的过程耗时比较大。从火焰图中分析，耗时占据了接近50%的是，一个logger操作中去拿线程堆栈的过程，那么我们打印的日志的时候，为啥会进行这个操作呢？

首先观察消息日志文件,和一般的日志不同,这里还会打印方法名称，即当前日志时在哪个方法下打印出来的。那么日志框架它是通过线程 stack 去获取到方法名称的，如果配置了 %L,即打印日志所在代码行的情况也是同理。

```log
[2019-10-07 11:50:38 251 INFO ] [PoolDrainDataThreadPool-3] dummy.es.transport.batchAddDocument() - A => {"@timestamp":"2019-10-07T03:50:38.251Z","ipv4":"10.0.49.96:14160;10.0.49.85:14159;10.0.49.85:14160;10.0.49.84:14160;10.0.49.97:14160;10.0.49.96:14159;10.0.49.89:14159;10.0.49.97:14159;10.0.49.86:14159;10.0.49.84:14159;10.0.49.86:14160;10.0.49.89:14160","key":"ss","serviceName":"Redis","spanId":"-496431972509502272","startTs":1570420237,"tag":-1,"timestamp":1570420237329,"traceId":"-2375955836973083482"}

[2019-10-07 11:50:38 251 INFO ] [PoolDrainDataThreadPool-3] dummy.es.transport.batchAddDocument() - A => {"@timestamp":"2019-10-07T03:50:38.251Z","ipv4":"10.0.49.96:14160;10.0.49.85:14159;10.0.49.85:14160;10.0.49.84:14160;10.0.49.97:14160;10.0.49.96:14159;10.0.49.89:14159;10.0.49.97:14159;10.0.49.86:14159;10.0.49.84:14159;10.0.49.86:14160;10.0.49.89:14160","key":"ss","serviceName":"Redis","spanId":"6195051521513685066","startTs":1570420237,"tag":-1,"timestamp":1570420237333,"traceId":"-2375955836973083482"}
```

观察配置的日志格式:

```xml
<appender name="dummyEsAppender" class="org.apache.log4j.DailyRollingFileAppender">
    <param name="File" value="./logs/dummy-es-transport.log"/>
    <param name="DatePattern" value="'.'yyyy-MM-dd'.log'"/>
    <layout class="org.apache.log4j.PatternLayout">
        <param name="ConversionPattern"
               value="[%d{yyyy-MM-dd HH:mm:ss SSS\} %-5p] [%t] %c.%M() - %m%n"/>
    </layout>
</appender>
```

注意输出格式中的 `%M()` 一行，这里意味着在打印日志的时候，需要打印当前日志所在执行的方法，这样看来，这个操作严重影响到了性能。

### 4.3 日志配置规则去除方法名

修改一下日志 `append` 格式,去掉方法输出，处理速率一下子就达到了7万多。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-4699528d67f8cd22.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

采用上文中的方法继续使用 `async-profiler` 生成火焰图，并用浏览器打开。这时候,日志 append 操作所占用的横轴长度显著下降，并且此时速度已经达到了关闭日志append 时的速度，说明修改日志输出格式后能够带来显著的性能提升。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-2ae5091724097f79.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

但是观测上图，我们发现了新的性能黑点，如红框所述，我们将其展开,见详细图:

![image.png](https://upload-images.jianshu.io/upload_images/6393906-e234140f78afcddc.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

这里主要是一个 toHexString 的操作，竟然占用的cpu资源这么大，这里需要定位。

### 4.4 ObjectId.toHexString 性能优化

查看这一步转换为16进制的字符串的代码如下，我们结合上面的火焰图可以看出来，主要耗时是在 `String.format()`

这一步操作。

```java

private String toHexString() {

    StringBuilder buf = new StringBuilder(24);

    byte[] bytes = new byte[12];

    bytes[0] = int3(this.timestamp);

    bytes[1] = int2(this.timestamp);

    bytes[2] = int1(this.timestamp);    

    bytes[3] = int0(this.timestamp);

    bytes[4] = int2(this.machineIdentifier);

    bytes[5] = int1(this.machineIdentifier);

    bytes[6] = int0(this.machineIdentifier);

    bytes[7] = short1(this.processIdentifier);

    bytes[8] = short0(this.processIdentifier);

    bytes[9] = int2(this.counter);

    bytes[10] = int1(this.counter);

    bytes[11] = int0(this.counter);

    for (byte b : bytes) {

        buf.append(String.format("%02x", new Object[]{Integer.valueOf(b & 0xFF)}));

    }

    return buf.toString();

}

```

byte 数组转换为 16进制字符串性能最好的代码：

```java

private static final char[] HEX_ARRAY = "0123456789ABCDEF".toCharArray();

private String toHexString2() {
    //这一步获取到bytes数组，和上面的操作相同，单独抽离出来。
    byte[] bytes = this.toByteArray();

    char[] hexChars = new char[bytes.length * 2];

    for (int j = 0; j < bytes.length; j++) {

        int v = bytes[j] & 0xFF;

        hexChars[j * 2] = HEX_ARRAY[v >>> 4];

        hexChars[j * 2 + 1] = HEX_ARRAY[v & 0x0F];

    }

    return new String(hexChars);

}

```

### 4.5 重新测试

修改完耗时的 toHexString() 操作之后，打包上传到服务器，并重新启动程序，此时发现每秒处理速率已经飙升到了 12万。这种使用频繁又耗时的黑点操作解决以后，果然性能能够得到翻倍的提升。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-9200a54bab3aa19b.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

此时日志输出格式已经优化，并且 toHexString(）操作也进行了优化。重新使用 async-profiler 查看一下最新的火焰图信息。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-1755510d2f2ac68d.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

之前的 toHexString() 耗时已经几乎看不到了，但是感觉日志append 的操作横轴还是略长，于是将日志输出关闭来看看极限处理速度。

将日志级别调整为 warn,并启动程序，观测到处理速度已经能够达到 18万/s了，这相当于 toHexString(）优化前的快3倍了。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-03667fe7f23c5e14.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

此时决定再将日志append 模式改为异步模式，然后启动程序，观察，处理速率也能够达到 18万/s。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-e2cc3b819b84139e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## 总结

从最开始的 2万/s 的处理速率提升到 18万/s。这个提升还是很惊人的，而如果没有使用 火焰图进行定位，或许我并不能找到这个程序处理耗时到底耗在哪里。得益于 async-profiler 此神器，能够非常直观的进行定位。

日志框架打印方法名或者行号的模式对比正常模式其性能理论上下降至少有10倍，通过本文的逐步分析，我们也能够看到，确实其性能降低是非常明显的。建议日志框架禁止打印方法名称和行号的操作。
