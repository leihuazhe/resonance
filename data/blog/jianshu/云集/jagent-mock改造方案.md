## 1.mock-filter

针对写压测的影子流量,目前在dubbo服务端对请求进行mock,符合固定的信息之后，match 成功即返回已配置好的mock数据。

### 使用前提

1.配置mock-filter
需要当前服务有MockFilter这个类，并且通过dubbo的SPI配置加载。

`mockFilter=com.yunji.erlang.trace.buriedpoint.core.MockFilter`

2.配置 `mock_config.properties`

```properties
projectName=gatewayOther

interceptSide=provider

shadowForce=false
```

大概需要的配置如上。

3.依赖 `mock-client` 包
依赖 `mock-client` 包后，在 `MockFilter`初始化时，会实例化 MockClient，启动 mock 引擎。

总结:
目前只有根据上述条件配置后的服务可以对影子流量进行mock，如果服务没有配置，则无法进行mock。

## 改进方案

> 现在希望通过调用链插件增强和diamond动态配置来实现对所有应用进行mock化的改造。在diamond配置需要开启mock的applicationName,然后配置香港信息，即可以完成插件化的目的。

- MonitorFilter 中拦截影子流量

  1.新增插件拦截MonitorFilter，在项目初始化的过程中，根据项目名称和diamond中配置的需要mock的名称进行比对，然后确定是否需要初始化 mock-client,如果需要初始化 mock-client,则进行初始化，初始化的拦截的部分信息 从 `mock_config.properties` 中获取。

  2.在每次调用时，判断请求是否为影子流量，不是则直接退出逻辑。

如果是影子流量，判断mock-client是否初始化，如果初始化后，则进行 match，match成功返回 mock 数据。

- jagent 中嵌入 mock-client

在jagent中加入mock-client 的lib 依赖
