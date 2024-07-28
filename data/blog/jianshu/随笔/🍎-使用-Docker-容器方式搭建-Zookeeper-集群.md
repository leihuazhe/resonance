## 1. Zookeeper是什么

`Zookeeper` 分布式服务框架是 `Apache Hadoop` 的一个子项目，它主要是用来解决分布式应用中经常遇到的一些数据管理问题，如：统一命名服务、状态同步服务、集群管理、分布式应用配置项的管理等。

`Zookeeper` 作为一个分布式的服务框架，主要用来解决分布式集群中应用系统的一致性问题，它能提供基于类似于文件系统的目录节点树方式的数据存储， `Zookeeper` 作用主要是用来维护和监控存储的数据的状态变化，通过监控这些数据状态的变化，从而达到基于数据的集群管理

简单的说，`Zookeeper` =文件系统+通知机制。

## 2. Zookeeper集群介绍

要搭建一个高可用的 `ZooKeeper` 集群，我们首先需要确定好集群的规模。为了使得 `ZooKeeper` 集群能够顺利地选举出 `Leader`，必须将 `ZooKeeper` 集群的服务器数部署成奇数。其实任意台 `ZooKeeper` 服务器都能部署且能正常运行。

一个 `ZooKeeper` 集群如果要对外提供可用的服务，那么集群中必须要有过半的机器正常工作并且彼此之间能够正常通信。

`ZooKeeper` 集群有一个特性：过半存活即可用

`Zookeeper` 的启动过程中 `leader` 选举是非常重要而且最复杂的一个环节。`Zookeeper` 的选举过程速度很慢，一旦出现网络隔离，`Zookeeper` 就要发起选举流程。`Zookeeper` 的选举流程通常耗时 `30` 到 `120` 秒，期间 `Zookeeper` 由于没有 `master`，都是不可用的

## 3. 集群搭建

> 我们将介绍两种搭建方式，分别在一台机器上启动三个节点使用不同端口号完成伪分布式和在三台节点上完全搭建 `Zookeeper` 集群。

### 伪分布式

在 `docker` 容器中搭建 `zookeeper` 集群，可以用`docker-compose.yml` 文件 (本教程使用3个容器做集群)

![伪分布式.png](https://upload-images.jianshu.io/upload_images/6393906-3050ccefdecbceb1.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

执行 `docker-compose up -d` 启动容器，启动成功如下图所示：

![image.png](https://upload-images.jianshu.io/upload_images/6393906-16e0b30ef3bac284.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

查看 `Zookeeper` 节点状态:

`docker exec -it zoo2 sh` 进入容器 ，执行 `zkServer.sh status`

![查看](https://upload-images.jianshu.io/upload_images/6393906-3b261ce89dfa484f.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 完全分布式

利用 `docker-compose` 搭建 `Zookeeper` 集群,本教程使用3个节点，每个节点启动一个 `docker` 容器做集群，配置和单机节点没啥区别，注意配置

```
network_mode: "host"
```

![image.png](https://upload-images.jianshu.io/upload_images/6393906-917d57d68062c6f3.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## 4. 水平扩容

> 简单地讲，水平扩容就是向集群中添加更多的机器，以提高系统的服务质量。
> 很遗憾的是，`ZooKeeper` 在水平扩容扩容方面做得并不十分完美，需要进行整个集群的重启。

通常有两种重启方式，一种是集群整体重启，另外一种是逐台进行服务器的重启。

### (1) 整体重启

所谓集群整体重启，就是先将整个集群停止，然后更新 `ZooKeeper` 的配置，然后再次启动。如果在你的系统中，`ZooKeeper` 并不是个非常核心的组件，并且能够允许短暂的服务停止（通常是几秒钟的时间间隔），那么不妨选择这种方式。在整体重启的过程中，所有该集群的客户端都无法连接上集群。等到集群再次启动，这些客户端就能够自动连接上——注意，整体启动前建立起的客户端会话，并不会因为此次整体重启而失效。也就是说，在整体重启期间花费的时间将不计入会话超时时间的计算中。

### (2) 逐台重启

这种方式更适合绝大多数的实际场景。在这种方式中，每次仅仅重启集群中的一台机器，然后逐台对整个集群中的机器进行重启操作。这种方式可以在重启期间依然保证集群对外的正常服务。

## 5. 客户端使用配置

客户端使用 `Zookeeper` 集群，只需要修改之前的`Zookeeper` 集群的地址即可

```
zookeeper.host=127.0.0.1:2181,127.0.0.1:2182,127.0.0.1:2183
```
