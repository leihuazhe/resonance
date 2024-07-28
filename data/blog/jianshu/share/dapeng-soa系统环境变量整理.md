#### 配置dapeng容器是否启用fluent-bit，默认为false

```
fluent_bit_enable=true
```

#### 超时时间配置

目前将客户端超时和服务端超时设置为统一的一个超时时间，配置如下：

```
soa.service.timeout =1000
```

#### 是否开启监控

```
soa.monitor.enable=false
```

如果使用eventbus，需要配置轮询时间,100ms

```
soa.eventbus.publish.period=100
```

kafka的新配置，消费端

```
kafka.consumer.host=127.0.0.1:9092
```

---

#### idl服务超时/负载均衡策略 配置

```
service UserService{
/**
*  用户注册
*/
string register(user_domain.User user)
(core.timeout="1000",core.loadBalance="Random")
/**
* 用户拉黑
*/
string blackUser(1:i32 userId)
(core.timeout="1200",core.loadBalance="Actived")
}(group="Biz",timeout="1000")
(core.timeout="1000",core.loadBalance="Random")
```

#### 上文配置，分别为方法级别和类级别配置了超时时间和负载策略
