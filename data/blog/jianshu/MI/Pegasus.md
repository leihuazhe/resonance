### 1. 使用

配置文件:

```properties
meta_servers = 127.0.0.1:34601,127.0.0.1:34602,127.0.0.1:34603
operation_timeout = 1000
async_workers = 4
```

配置文件在创建 `Client` 实例的时候使用，如在下面需传入 `configPath` 参数

```java
PegasusClientInterface client = PegasusClientFactory.getSingletonClient(configPath);
```

configPath 定位方式

### PerfCounter支持

- 提供一种实时的数据监控机制
- 帮助用户对于线上所关注的数据进行监控并设置预警

要开启PerfCounter，只需要在“pegasus.properties”中增加了以下配置项：

```properties
enable_perf_counter = true
perf_counter_tags = cluster=onebox,app=unit_test
```

### pegasus 原理

HashKey + SortKey -> Value

HashKey 决定数据属于哪个分片
SortKey 决定数据在分片内的排序
使用表（Table）实现业务数据隔离

partition#0  
partition#1
partition#2

ReplicaServer

分布式复制
一致性协议 => pacificA
类似 kafka

### 写流程

> 类似两阶段 提交

### pegasus client

1.初始化，读取 pegasus.properties 2.连接 MetaServer 3. 获取路由表4.存取数据

**Note:**

- 寻址过程不依赖 Zookeeper
- 用户直接提供 MetaServer 地址列表 (MetaServer 可以主备)
- Client 端本地缓存路由表，失效自动更新

![image.png](https://upload-images.jianshu.io/upload_images/6393906-90239ea6391897fc.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 客户端借口

- get 原子操作，读单条数据
  hashKey、SortKey => 获取到 Value

- multiGet 原子操作
  一次读取同一 HashKey 下的多条数据

- batchGet 非原子操作
  Get 的批量封装，可能需要访问多个节点获取数据

### Java 客户端最佳实践

- 线程安全
  所有接口都是线程安全的、不用担心多线程问题
- 并发性能
- 客户端底层是异步方式实现的，可支持较大并发，不用担心性能问题。
- Client 单例
  通过 `getSingletonClient()` 获得的 `Client` 是单例，可以重复使用，避免重复开辟资源
- 翻页功能
  通过客户端提供的接口，能够轻松实现数据翻页功能

### 高级使用 TTL

> 支持对数据指定过期时间、数据过期后就无法读取到
> ttl: expireTime = currentTime + TTL

### 高级使用 单行事务

对同一个 `HashKey` 的写操作，保证总是原子的，包括 set、multiSet、del、multiDel、incr、checkAndSet、checkAndMutate

### 高级使用 条件过滤

对 `HashKey` 或者 `SortKey` 进行字符串匹配，只有符合条件的结果才会返回
匹配类型：

- 前缀匹配
- 后缀匹配
- 任意位置匹配

支持操作：

- multiGet 对 SortKey 过滤
- scan 对 HashKey 和 SortKey 过滤

### 高级使用 流量控制

- Why 很多业务是定期灌数据模式、可以容忍 QPS 限制
- 如果写压力太大，会影响读写的延迟性能

Java Client中提供了流量控制辅助类 FlowController，每次写操作之前只需要调用 getToken() 来获得流量配额。如果超过流量限制，getToken()将会阻塞一段时间返回

## Java 客户端使用

### 写流程

- set

```java
public void set(String tableName, byte[] hashKey, byte[] sortKey, byte[] value, int ttl_seconds) throws PException;
public void set(String tableName, byte[] hashKey, byte[] sortKey, byte[] value) throws PException;
```

- batchSet
  > 写一批数据，对 `set` 函数的批量封装。该函数并发地向 `server` 发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常。

```java
public void batchSet(String tableName, List<SetItem> items) throws PException;
```

该方法不是原子的，可能部分成功、部分失败

- batchSet2
  > 对 `set` 函数的批量封装。该函数并发地向 `server` 发送异步请求，并等待结果。但与上面 `batchSet` 不同的是，无论请求成功还是失败，它都会等待所有请求结束。

用户可以根据 `results` 中的 `PException` 是否设置来判断请求成功还是失败，并可以选择只使用成功的结果。

```java
public int batchSet2(String tableName, List<SetItem> items, List<PException> results) throws PException;
```

参数：

- 传入参数：TableName、Items。
- 传出参数：Results。该变量需由调用者创建；`Results[i]` 中存放 `Items[i]` 对应的结果；如果 `Results[i]`不为 null（PException已设置），表示对 `Items[i]` 的请求失败。
- 返回值：请求成功的个数。
- 异常：如果出现异常，譬如参数错误、表名不存在等，会抛出 `PException`。
- 注意：该方法不是原子的，有可能出现部分成功部分失败的情况，用户可以选择只使用成功的结果。

- multiSet
  > 写同一 `HashKey` 下的多行数据。

```java
public void multiSet(String tableName, byte[] hashKey, List<Pair<byte[], byte[]>> values, int ttl_seconds) throws PException;
public void multiSet(String tableName, byte[] hashKey, List<Pair<byte[], byte[]>> values) throws PException;
```

- `values` 是 `Pair` 列表，`Pair` 的第一个元素是 `SortKey`，第二个元素为 `value`。

- batchMultiSet
  > 对 `multiSet` 函数的批量封装。该函数并发地向 `server` 发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常。

```java
public void batchMultiSet(String tableName, List<HashKeyData> items, int ttl_seconds) throws PException;
public void batchMultiSet(String tableName, List<HashKeyData> items) throws PException;
```

- sortKeyCount
  > 获取某个 `HashKey` 下所有 `SortKey` 的个数。
- multiGetSortKeys
  > 获取某个 `HashKey`下的 `SortKey` 列表
- getScanner
  > 获取遍历某个 `HashKey` 下所有数据的迭代器，用于局部扫描

---

- [更多详情](<https://wiki.n.miui.com/pages/viewpage.action?pageId=25065979#id-(5)Java%E5%BC%80%E5%8F%91-PegasusClientInterface%E6%8E%A5%E5%8F%A3>)

一些经验

https://wiki.n.miui.com/pages/viewpage.action?pageId=127944166

CMS和G1区别？

能聊到一个不做compact，一个做compact。g1分区，cms不分区。更深入的就没有了。
