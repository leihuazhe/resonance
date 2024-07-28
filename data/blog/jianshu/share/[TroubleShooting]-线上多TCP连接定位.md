1.获取线程号

![image.png](https://upload-images.jianshu.io/upload_images/6393906-4dac0ed833af6bb6.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

2.出现大量的 TCP 链接

![image.png](https://upload-images.jianshu.io/upload_images/6393906-4d657559fcdd22a4.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![image.png](https://upload-images.jianshu.io/upload_images/6393906-9bbb936cdf478fd0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

2\. strace -f -p 952865 -e trace=network

![image.png](https://upload-images.jianshu.io/upload_images/6393906-fa934ad26102120d.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

3.strace -p 952970

![image.png](https://upload-images.jianshu.io/upload_images/6393906-61ffec99d908a485.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

观测这个线程，将此线程号转为 16进制

![image.png](https://upload-images.jianshu.io/upload_images/6393906-4a1f8fadf0171070.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![image.png](https://upload-images.jianshu.io/upload_images/6393906-41b39150ae206862.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![image.png](https://upload-images.jianshu.io/upload_images/6393906-745b398ac309274f.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

观测此进程，476线程

ls -l /proc/952865/fd/476

![image.png](https://upload-images.jianshu.io/upload_images/6393906-7e826337da960a89.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

打开日志，发现 出现报错信息

![image.png](https://upload-images.jianshu.io/upload_images/6393906-f657700216320363.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

2019-10-10 15:38:27,739 INFO RocketmqRemoting(456) - [traceId: spanId: pSpanId:] createChannel: begin to connect remote host[10.0.42.98:9876] asynchronously

2019-10-10 15:38:27,739 WARN RocketmqRemoting(481) - [traceId: spanId: pSpanId:] createChannel: connect remote host[10.0.42.98:9876] failed, DefaultChannelPromise@12f84a88(failure: io.netty.channel.ChannelException: Unable to create Channel from class class io.netty.channel.socket.nio.NioSocketChannel)

io.netty.channel.ChannelException: Unable to create Channel from class class io.netty.channel.socket.nio.NioSocketChannel

at io.netty.channel.ReflectiveChannelFactory.newChannel(ReflectiveChannelFactory.java:40)

at io.netty.bootstrap.AbstractBootstrap.initAndRegister(AbstractBootstrap.java:321)

at io.netty.bootstrap.Bootstrap.doResolveAndConnect(Bootstrap.java:163)

at io.netty.bootstrap.Bootstrap.connect(Bootstrap.java:145)

at com.alibaba.rocketmq.remoting.netty.NettyRemotingClient.createChannel(NettyRemotingClient.java:454)

at com.alibaba.rocketmq.remoting.netty.NettyRemotingClient.getAndCreateNameserverChannel(NettyRemotingClient.java:400)

at com.alibaba.rocketmq.remoting.netty.NettyRemotingClient.getAndCreateChannel(NettyRemotingClient.java:361)

at com.alibaba.rocketmq.remoting.netty.NettyRemotingClient.invokeSync(NettyRemotingClient.java:616)

at com.alibaba.rocketmq.client.impl.MQClientAPIImpl.getTopicRouteInfoFromNameServer(MQClientAPIImpl.java:1298)

at com.alibaba.rocketmq.client.impl.factory.MQClientInstance.updateTopicRouteInfoFromNameServer(MQClientInstance.java:573)

at com.alibaba.rocketmq.client.impl.factory.MQClientInstance.updateTopicRouteInfoFromNameServer(MQClientInstance.java:549)

at com.alibaba.rocketmq.client.impl.factory.MQClientInstance.updateTopicRouteInfoFromNameServer(MQClientInstance.java:543)

at com.alibaba.rocketmq.client.impl.factory.MQClientInstance$3.run(MQClientInstance.java:225)

at com.alibaba.ttl.TtlRunnable.run(TtlRunnable.java:47)

at java.util.concurrent.Executors$RunnableAdapter.call(Executors.java:511)

at java.util.concurrent.FutureTask.runAndReset(FutureTask.java:308)

at java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.access$301(ScheduledThreadPoolExecutor.java:180)

at java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run(ScheduledThreadPoolExecutor.java:294)

at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1142)

at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:617)

at java.lang.Thread.run(Thread.java:745)

Caused by: java.lang.NoClassDefFoundError: Could not initialize class io.netty.buffer.ByteBufAllocator

at io.netty.channel.DefaultChannelConfig.<init>(DefaultChannelConfig.java:56)

at io.netty.channel.DefaultChannelConfig.<init>(DefaultChannelConfig.java:69)

at io.netty.channel.socket.DefaultSocketChannelConfig.<init>(DefaultSocketChannelConfig.java:46)

at io.netty.channel.socket.nio.NioSocketChannel$NioSocketChannelConfig.<init>(NioSocketChannel.java:486)

at io.netty.channel.socket.nio.NioSocketChannel$NioSocketChannelConfig.<init>(NioSocketChannel.java:484)

at io.netty.channel.socket.nio.NioSocketChannel.<init>(NioSocketChannel.java:99)

at io.netty.channel.socket.nio.NioSocketChannel.<init>(NioSocketChannel.java:88)

at io.netty.channel.socket.nio.NioSocketChannel.<init>(NioSocketChannel.java:81)

at io.netty.channel.socket.nio.NioSocketChannel.<init>(NioSocketChannel.java:74)

at sun.reflect.GeneratedConstructorAccessor87.newInstance(Unknown Source)

at sun.reflect.DelegatingConstructorAccessorImpl.newInstance(DelegatingConstructorAccessorImpl.java:45)

at java.lang.reflect.Constructor.newInstance(Constructor.java:423)

at java.lang.Class.newInstance(Class.java:442)

at io.netty.channel.ReflectiveChannelFactory.newChannel(ReflectiveChannelFactory.java:38)

... 20 more

(END)

![image.png](https://upload-images.jianshu.io/upload_images/6393906-837c74ffb713a6a4.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

Netty 版本冲突
