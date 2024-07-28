> 本文将介绍的是我们自研的RPC框架Dapeng-soa(https://github.com/dapeng-soa/dapeng-soa)，使用 etcd 作为新的注册中心的一种方案

## Dapeng注册中心节点

### 基本根节点

```
/soa/runtime/services
/soa/config/services
/soa/config/routes
```

### 节点目录图

```

├── soa
│   ├── runtime
│   │   │   ├── services
│   │   │   │   └── com.today.service.goods.GoodsService
│   │   │   │                                       └── 192.168.10.121:9071
                                                   └── 192.168.10.121:9072
                                                   └── 192.168.10.121:9073
                                                   └── 192.168.10.121:9074
│   ├── config
│   │   │   ├── services
│   │   │   │   └── com.today.service.goods.GoodsService
│   │   │   │                                       └──

│   │   │   ├── routes
│   │   │   │   └── com.today.service.goods.GoodsService
```

- 1.除了带有IP,端口信息的节点为临时节点(相对于zk),其他均为永久性节点
- 2.zk类似与文件系统，父节点，子节点的模式。`192.168.10.121:9071`在zk中为一个临时子节点
- 3.`etcd`是以`key-value`形式进行存储的,`/soa/runtime/services/`和`/soa/runtime/services/com.UserService`对应etcd中的两个key，他们之间没有什么联系，只有在查询key时，指定`--prefix`时，会根据前缀进行搜寻key

## etcd租约节点 实现类似zookeeper的临时节点方案

- 1.etcd使用租约的方式,对创建的`key`设置超时时间,当超时时,该节点就会被删除。
- 2.我们可以为此节点续租,当节点即将超时时，就进行续租。这样就可以达到类似于zookeeper临时节点的作用。
- 3.当客户端由于什么原因挂掉以后,etcd上的节点由于没有被继续续租，很快就会到期被删除。

### Java客户端实现租约与续租的代码逻辑

```java
public Main(String registryAddress, String host) {
        Client client = Client.builder().endpoints(registryAddress).build();
        this.lease = client.getLeaseClient();
        this.kv = client.getKVClient();
        try {
            this.leaseId = lease.grant(5).get().getID();
        } catch (Exception e) {
            LOGGER.error(e.getMessage(), e);
        }

        keepAlive();

        try {
            int port = 1000;
            register("com.DemoService", host, port + 50);
            logger.info("provider-agent provider register to etcd at port {}", port + 50);
        } catch (Exception e) {
           logger.error(e.getMessage,e);
        }
    }

    /**
     * 向 ETCD 中注册服务
     */
    public void register(String serviceName, String host, int port) throws Exception {
        String strKey = MessageFormat.format("/{0}/{1}/{2}:{3}", rootPath, serviceName, host, String.valueOf(port));
        ByteSequence key = ByteSequence.fromString(strKey);
        String weight = "50";
        ByteSequence val = ByteSequence.fromString(weight);


        kv.put(key, val, PutOption.newBuilder().withLeaseId(leaseId).withPrevKV().build()).get();
        kv.txn();
        logger.info("Register a new service at:{},weight:{}", strKey, weight);
    }

    /**
     * 发送心跳到ETCD,表明该host是活着的
     */
    public void keepAlive() {
        Executors.newSingleThreadExecutor().submit(
                () -> {
                    try {
                        Lease.KeepAliveListener listener = lease.keepAlive(leaseId);
                        listener.listen();
                        logger.info("KeepAlive lease:" + leaseId + "; Hex format:" + Long.toHexString(leaseId));
                    } catch (Exception e) {
                        logger.error(e.getMessage(), e);
                    }
                }
        );
    }
```

- 1.通过`this.leaseId = lease.grant(5).get().getID();`注册租约,然后再注册服务到etcd上时，使用该租约.
- 2.`keepAlive()`方法保持客户端与etcd的联系，并对租约进行续租，一旦将要超时时，马上就行续租。
- 3.当客户端掉线或者关闭后，`keepAlive`将不会继续续租，5s后，租约到期，节点就会被删除.

## `etcd`有序节点与`zookeepr`有序节点

- 1.zookeeper临时节点会在节点最后生成一个序列串，在相同父节点下每次创建子节点时，节点最后的序列串会有序递增
- 2.`etcd`创建的每一个节点都会带有如下几个信息:

```
message KeyValue {
  bytes key = 1;
  int64 create_revision = 2;
  int64 mod_revision = 3;
  int64 version = 4;
  bytes value = 5;
  int64 lease = 6;
}
```

- 1.etcd服务段有一个机制，他会对每一次请求创建的任何key提供create_revision和mod_revision的递增，递增时全局性的，任何key的操作都会在全局的举出上面进行递增。
- 2.那么在服务节点下，我们每一次创建一个key时,Create_Revision都会在之前最后创建的节点的基础上增加1。

- 3.每一次修改一个key的内容时,`mod_Revision`就会在全局计数器上增加一次。

#### 结论，etcd的key支持天然的有序性。可以根据这两个属性来判断key创建的先后顺序。

## etcd watch机制

- 1.`zookeeper`的`watch`机制时一次性的，当`watch`的节点发生变更后，会通知客户端，同时watch失效
- 2.`etcd`的`watch`机制时一直生效的，`watch`一次，一直可以得到`watch`的节点的变更信息。但是，etcd的watch时阻塞模式的，watch某个节点后，就会阻塞等待回应。

```java
public static void etcdWatch(Watch watch, String key, Boolean usePrefix, WatchCallback callback) {
        executorService.execute(() -> {
            try {
                Watch.Watcher watcher;
                if (usePrefix) {
                    watcher = watch.watch(ByteSequence.fromString(key), WatchOption.newBuilder().withPrefix(ByteSequence.fromString(key)).build());
                } else {
                    watcher = watch.watch(ByteSequence.fromString(key));
                }
                List<WatchEvent> events = watcher.listen().getEvents();
                callback.callback(events);
            } catch (InterruptedException e) {
                logger.error(e.getMessage(), e);
            }
        });
}
```

- 1.使用异步线程对key进行watch，注意，我们如果要watch，一个服务节点下的多个实例的变更，需要在watch时指定前缀，即watch当前key为一个前缀，这样后面的所有实例key的变化都能够watch到。
- 2.当watch事件触发后，回调`watchCallBack`方法进行相应的处理，这个内容需要我们自己实现。

## etcd 获取节点和节点内容

- 1.etcd为key-value形式存储数据,所以获取key的数据非常简单

```java
private String getEtcdValue(String path, Boolean usePrefix) {
    try {
        KV kv = client.getKVClient();
        ByteSequence seqKey = ByteSequence.fromString(path);
        GetResponse response = kv.get(seqKey).get();
        String key = response.getKvs().get(0).getKey().toStringUtf8();
        String value = response.getKvs().get(0).getValue().toStringUtf8();
        logger.info("Get data from etcdServer, key:{}, value:{}", key, value);
        return value;
    } catch (InterruptedException e) {
        e.printStackTrace();
    } catch (ExecutionException e) {
        e.printStackTrace();
    }
    return null;
}
```

---

### Etcd Key-Value Api

> 键值API操作存储在etcd中的键值对

对`etcd`来说,键值对(`key-value pair`)是最小可操作单元，每个键值对都有许多字段,以`protobuf`格式定义。

```protobuf
message KeyValue {
  bytes key = 1;
  int64 create_revision = 2;
  int64 mod_revision = 3;
  int64 version = 4;
  bytes value = 5;
  int64 lease = 6;
}
```

- key: 以字节为单位的键。不允许使用空密钥。
- value: 以字节为单位的值。
- version: 版本是密钥的版本。删除将版本重置为零，任何对密钥的修改都会增加版本号
- Create_Revision: 修改键上的最后一个创建.
- Mod_Revision: 修改最后修改的密钥.
- Lease(租约): 附在钥匙上的租约的ID。如果租约是0，则没有租约附在钥匙上。

除了键和值之外，**`etcd`还将附加的修订元数据作为键消息的一部分**。该修订信息按创建和修改的时间对键进行排序，这对于管理分布式同步的并发性非常有用。etcd客户端的分布式共享锁使用创建修改来等待锁定所有权。类似地，修改修订用于检测软件事务内存读集冲突并等待领导人选举更新。

---

## Etcd vs Zookeeper

#### 相较之下，Zookeeper有如下缺点。

- 1.复杂。Zookeeper的部署维护复杂，管理员需要掌握一系列的知识和技能；而Paxos强一致性算法也是素来以复杂难懂而闻名于世；另外，Zookeeper的使用也比较复杂，需要安装客户端，官方只提供了java和C两种语言的接口。
- 2.Java编写。这里不是对Java有偏见，而是Java本身就偏向于重型应用，它会引入大量的依赖。而运维人员则普遍希望机器集群尽可能简单，维护起来也不易出错。
- 3.发展缓慢。Apache基金会项目特有的“Apache Way”在开源界饱受争议，其中一大原因就是由于基金会庞大的结构以及松散的管理导致项目发展缓慢。

#### 而etcd作为一个后起之秀，其优点也很明显。

- 1.简单。使用Go语言编写部署简单；使用HTTP作为接口使用简单；使用Raft算法保证强一致性让用户易于理解。
- 2.数据持久化。etcd默认数据一更新就进行持久化。
- 3.安全。etcd支持SSL客户端安全认证。
  最后，etcd作为一个年轻的项目，正在高速迭代和开发中，这既是一个优点，也是一个缺点。优点在于它的未来具有无限的可能性，缺点是版本的迭代导致其使用的可靠性无法保证，无法得到大项目长时间使用的检验。然而，目前CoreOS、Kubernetes和Cloudfoundry等知名项目均在生产环境中使用了etcd，所以总的来说，etcd值得你去尝试。

---

## etcd 基本操作

### docker-compose形式启动etcd单节点服务

```yml
etcd:
  container_name: etcd
  # image: quay.io/coreos/etcd:v3.1
  image: registry.cn-hangzhou.aliyuncs.com/coreos_etcd/etcd:v3
  ports:
    - '2379:2379'
    - '4001:4001'
    - '2380:2380'
  environment:
    - ETCDCTL_API=3
    - TZ=CST-8
    - LANG=zh_CN.UTF-8
  command: /usr/local/bin/etcd
    -name node1
    -data-dir /etcd-data
    -advertise-client-urls http://${host_ip}:2379,http://${host_ip}:4001
    -listen-client-urls http://0.0.0.0:2379,http://0.0.0.0:4001
    -initial-advertise-peer-urls http://${host_ip}:2380
    -listen-peer-urls http://0.0.0.0:2380
    -initial-cluster-token docker-etcd
    -initial-cluster node1=http://${host_ip}:2380
    -initial-cluster-state new
  volumes:
    - '/data/config/etcd/ca-certificates/:/etc/ssl/certs'
    - '/data/conf/etcd/data:/etcd-data'
```

### etcd v3 基本api

- 1.进入容器

```
docker exec -it etcd sh
```

- 2.设置键、修改键

```
etcdctl put /maple value
```

- 3.删除键

```
etcdctl del /maple
```

- 4.删除所有/test前缀的节点

```
etcdctl del  /test --prefix
```

- 5.查询`Key`

```
etcdctl get /test/ok
```

- 6.前缀查询

```
etcdctl get /test/ok --prefix
```

- 7.watch key

```
etcdctl watch /maple/services
```

- 8.watch子节点

```
etcdctl watch /maple/services --prefix
```

- 9.申请租约、授权租约

申请租约

```
etcdctl lease grant 40
    result: lease 4e5e5b853f528859 granted with TTL(40s)
```

授权租约

```
etcdctl put --lease=4e5e5b853f528859 /maple/s 123
```

撤销

```
etcdctl lease revoke 4e5e5b853f5286cc
```

租约续约

```
etcdctl lease keep-alive 4e5e5b853f52892b
```
