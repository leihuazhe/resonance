cluster 会转换为如下形式：

```
hbase://${s.trim}
```

#### hbase column

colums 输入表达式如下：

```
maple:name,maple:age,maple:gender
//第二种情形(特殊情形)，只存在列族名
maple:name,maple:age,maple:gender
```

- 按 `,` 划分出多个列
- 按 `:` 将列族名和列分开

组合为 `Hbase Column`

```scala
case class Column(family: String, qualifier: Option[String])
```

### HbaseProxy.get

```scala
def get(cluster: String, table: String, row: String, columns: Array[Column])
           (implicit telemetryBuilder: UsageTelemetryBuilder): Array[Cell] = {
      val perfScope = telemetryBuilder.startTimeRange(s"hbase|$cluster|$table|get")
        val htable = HTableManager.getHTable(cluster, table)

        try{
            val get = new Get(Bytes.toBytes(row))
            columns.foreach { column =>
                column.qualifier match {
                    case Some(q) =>
                        get.addColumn(Bytes.toBytes(column.family), Bytes.toBytes(q))
                    case _ =>
                        get.addFamily(Bytes.toBytes(column.family))
                }
            }

            val result = htable.get(get)
            result.rawCells()
        } finally {
            // return the table to pool, caller need to aware the exceptions if any
            HTableManager.returnTable(cluster, htable)
            perfScope.stop
        }
}
```

- 1.获取 `HTableInterface`
  > 根据 `cluster` 和 `table` 名称去进行获取。`HTable` 实例不是线程安全的，我们来看其API中的说明。
  > "This class is not thread safe for updates; the underlying write buffer can be corrupted if multiple threads contend over a single HTable instance."

`Htable` 实例创建是一个代价非常昂贵的操作。所以尽量使用 HtablePool 来获取 Htable

```scala
def getHTable(clusterName : String, tableName: String): HTableInterface ={
     try {
          val pool = getHTablePool(clusterName)

          val now = System.currentTimeMillis
          if (now - lastWriteStatisticTime > logInterval){
              val s = pool.getStatistics(tableName)
              logger.infoTag(s"table:$tableName, conrrentUsingHTableCount:${s.concurrentUsingHTableCount}, pooledHTableCount:${s.pooledHTableCount}", LogTag.HbaseSetting)
              lastWriteStatisticTime = now
          }
          pool.getTable(tableName)
      } catch {
          case e: HException => logger.error("Failed to get HTable from HBase", e)
              throw e
          case e: Exception => logger.error("other exception", e)
              throw e
      }
}
```

如何获取 HtablePool ?

```
 val clusterConf = NameService.resolve(clusterName).createClusterConf(HBaseConfiguration.create)
```

- NameService NameServiceEntity 这两个是根据 cluster 等创建最终的 clusterConf 对象

然后直接通过构造函数创建出 HTablePool

```
new HTablePool(clusterConf, 100)
```

其中 `100` 表示 每个 `Pool` 表示最大引用数

最后通过 `HTablePool.getTable` 获取到 `HTableInterface`

![htable_get.png](https://upload-images.jianshu.io/upload_images/6393906-d330e79078dbae2c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### HbaseProxy.get2

> 主要使用了 `HBaseClientInterface` 来代替上面的 `Htable` 来作为访问 `Hbase` 的客户端。

- 根据 `clusterName` 并利用 `NameService` 获取到当前 cluster 的配置文件 `conf`
- HBaseClientFactory.createClient(clusterConf) 创建并返回 `HBaseClientInterface`

#### 使用

-Get

```scala
 def get2(cluster: String, table: String, row: String, columns: Array[Column])
            (implicit telemetryBuilder: UsageTelemetryBuilder): Array[Cell] = {
        val perfScope = telemetryBuilder.startTimeRange(s"hbase|$cluster|$table|get2")
        val hclient = hclientManager.getHClient(cluster)
        try{
            val get = new Get(Bytes.toBytes(row))
            columns.foreach { column =>
                column.qualifier match {
                    case Some(q) =>
                        get.addColumn(Bytes.toBytes(column.family), Bytes.toBytes(q))
                    case _ =>
                        get.addFamily(Bytes.toBytes(column.family))
                }
            }

            val result = hclient.get(table, get)
            result.rawCells()
        } finally {
            HBaseClientFactory.closeSingletonClient()
            perfScope.stop
        }
    }
```

- put

```scala
def put(cluster: String, table: String, row: String, family: String, qualifier: String, value: String)
           (implicit telemetryBuilder: UsageTelemetryBuilder): Unit = {
       // get the client
        val hclient = hclientManager.getHClient(cluster)
        try{
            val put = new Put(Bytes.toBytes(row))
            put.add(Bytes.toBytes(family), Bytes.toBytes(qualifier), java.util.Base64.getDecoder.decode(value))
            hclient.put(table, put)
        } finally {
            perfScope.stop
        }
}
```

### 查询结构返回 parse 阶段

> 详询查询接口 `performGet` 的 `valueType` 字段。此字段的主要作用是 `define` 返回 `Result` 的类型。
> 缺省返回类型为 `base64`
> 目前可选 `ResultValueType` 如下:

```scala
object ResultValueType extends Enumeration {
    type ResultValueType         = Value

    val string: ResultValueType  = Value("string")
    val boolean: ResultValueType = Value("boolean")
    val int: ResultValueType     = Value("int")
    val long: ResultValueType    = Value("long")
    val double: ResultValueType  = Value("double")
    val float: ResultValueType   = Value("float")
    val base64: ResultValueType  = Value("base64")
}
```

#### parseReslut

前文提到，从 `HBase` 中查询返回的内容为 `Cell` 列表(`Array[Cell]`)，然后我们要做的就是将这个列表的值根据我们想要返回的类型进行转换。

- 1. 将 `cellList` 转为 ResultCell ，ResultCell有很多子类。我们会在其 apply 方法中根据传入的 valueType 判断其类型来进行对应的转换，最终得到 `Array[ResultCell] `
- 2. 使用 `Row` 将结果包装并返回, `Row(Some(rowKey), cells)` 。
- 3. 使用 `Json.toJson(resultRow)` 将结果转换为 `Json` 返回。
