镜像来源：

```
https://github.com/wurstmeister/kafka-docker
```

### 只需要内网的配置(docker-compose)

```yml
kafka:
  container_name: kafka
  image: wurstmeister/kafka:1.1.0
  ports:
    - '9092:9092'
  environment:
    - TZ=CST-8
    - KAFKA_BROKER_ID=2
    - KAFKA_ZOOKEEPER_CONNECT=your_zk_host:2181
    - KAFKA_LOG_DIRS=/kafka/logs
    - KAFKA_LISTENERS=PLAINTEXT://:9092
    - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://your_kafka_host:9092
  volumes:
    - '/data/logs/kafka-logs/:/kafka/logs'
```

注:

- your_zk_host 替换为你启动的zk地址
- your_kafka_host 替换为你docker宿主机的ip

### 内外网同时使用配置(docker-compose)

```
kafka:
    container_name: kafka
    image: wurstmeister/kafka:1.1.0
    ports:
      - "${kafka_port}:${kafka_port}"
    environment:
      - TZ=CST-8
      - KAFKA_BROKER_ID=2
      - KAFKA_ZOOKEEPER_CONNECT=${soa_zookeeper_host_ip}:2181
      - KAFKA_LOG_DIRS=/kafka/logs
      - KAFKA_ADVERTISED_LISTENERS=INSIDE://192.168.10.8:9092,OUTSIDE://10.10.10.36:9094
      - KAFKA_LISTENERS=INSIDE://:9092,OUTSIDE://:9094
      - KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=INSIDE:PLAINTEXT,OUTSIDE:PLAINTEXT
      - KAFKA_INTER_BROKER_LISTENER_NAME=INSIDE
    volumes:
      - "/data/logs/kafka-logs/:/kafka/logs"
```

## source-compose

```
kafka:
      container_name: kafka
      image: wurstmeister/kafka:1.1.0
      ports:
        - "${kafka_port}:${kafka_port}"
        - "9094:9094"
      environment:
        - TZ=CST-8
        - KAFKA_BROKER_ID=2
        - KAFKA_ZOOKEEPER_CONNECT=${soa_zookeeper_host_ip}:2181
        - KAFKA_LOG_DIRS=/kafka/logs
        - KAFKA_ADVERTISED_LISTENERS=INSIDE://${kafka_host_ip}:${kafka_port},OUTSIDE://10.10.10.48:9094
        - KAFKA_LISTENERS=INSIDE://:${kafka_port},OUTSIDE://:9094
        - KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=INSIDE:PLAINTEXT,OUTSIDE:PLAINTEXT
        - KAFKA_INTER_BROKER_LISTENER_NAME=INSIDE
      volumes:
        - "/data/logs/kafka-logs/:/kafka/logs"
      labels:
        - project.source=
        - project.extra=public-image
        - project.depends=zookeeper
        - project.owner=LHZ
```

### 配置规则

可以根据环境变量对broker的 server.properties里的配置进行定制配置
如果要对broker进行更多配置，比如关闭自动创建topic

- eg:
  如果需要配置`auto.create.topics.enable`，在环境变量加入一行：

```
 - KAFKA_AUTO_CREATE_TOPICS_ENABLE=false
```

根据如下规则,其他配置依次类推：

- 在前面加kafka前缀
- 全部大写
- `.`用 `_ `代替

### kafka 在 docker 容器中的主目录

```
/opt/kafka
```

### kafka在docker中保存消息日志的目录

```
/kafka/logs
```

### 增加 Kafka 堆的内存大小

```
KAFKA_HEAP_OPTS=-Xmx4G -Xms4G
```

### 附: 一个简单的例子

```yml
kafka:
  container_name: kafka
  image: wurstmeister/kafka:1.1.0
  restart: on-failure:3
  ports:
    - '9092:9092'
  environment:
    - TZ=CST-8
    - KAFKA_LOG_DIRS=/kafka/logs
    - KAFKA_ZOOKEEPER_CONNECT=192.168.1.100:2181
    - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://192.168.1.100:9092
    - KAFKA_LISTENERS=PLAINTEXT://:9092
    - KAFKA_LOG_RETENTION_HOURS=24
  volumes:
    - '/data/logs/kafka-logs/:/kafka/logs'
```
