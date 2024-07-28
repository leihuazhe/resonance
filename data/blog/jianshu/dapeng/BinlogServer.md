# Kafka Binlog Service

> 旨在订阅 canal 的 消息，然后将此消息序列化为 json 后 发往 kafka。 业务可以订阅 kafka 对应的 topic 接收消息，然后进行变更。

## 源码地址

- Today内网
  http://pms.today36524.td/basic-services/binlog-server-new
- Github
  https://github.com/leihuazhe/kafka-binlog

## Docker 镜像

> 目前已存在打好的镜像，`tag` 号为 `stable`，很稳定的版本。后续可以根据升级 canal client 的版本来进行升级。
> 源码直接执行 `mvn package` 也可以自动打出 `docker` 镜像。

```
docker.today36524.com.cn:5000/basic/binlog:stable
```

## tscompose (docker-compose)

```yml
binlog:
  container_name: binlogService
  image: docker.today36524.com.cn:5000/basic/binlog:stable
  restart: on-failure:3
  environment:
    - TZ=CST-8
    - canal_canalServerIp=${canal_host_ip}
    - canal_canalServerPort=${canal_port}
    - kafka_topic=${binlog_topic}
  extra_hosts:
    - 'kafka-host:${kafka_host_ip}'
  volumes:
    - '/data/logs/binlog-service/:/opt/binlog/logs'
  labels:
    - project.source=
    - project.extra=public-image
    - project.depends=mysql,canal,kafka
    - project.owner=LHZ
```

注意事项：
环境变量需要配置 binlogServer 消费的 canal ip和port，发送到 kafka 的 地址,binlog 的日志

- canal_host_ip canal ip
- canal_port canal 端口号，一般为 11111
- binlog_topic 配置 Binlog 目前消费者都监听这个 topic
- canal.kafka.host 配置 kafka 集群地址信息
