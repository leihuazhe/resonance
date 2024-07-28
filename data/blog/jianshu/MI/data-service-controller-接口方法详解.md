## ESController

### queryFast

- 输入参数:

```
cluster: String, index: String, typeName: Option[String], query: String
```

### queryFastWithSQL

- 输入参数:

```
cluster: String, sql: String
```

#### esSql 格式

```
esService.sql = http://%s/_sql?sql=%s
```

范例

```
 http://cluster_info/_sql?sql=sqlInfo
```

### queryFastPost

- 输入参数:

```
cluster: String, index: String, typeName: Option[String]
```

### queryFastAdvance

> 会对输入的 query json 进行过滤和格式化

- 输入参数：

```
cluster: String, index: String, typeName: Option[String], query: String
```

---

## HBaseController

### queryRowWithColumns

> 查询 `Hbase` 一行记录，并且会查询到具体的列信息

- 参数列表

```
cluster: String, table: String, row: String, columns: String, valueType: Option[String]
```

- `cluster:` hbase 集群名称
- `table:` hbase 表名称
- `row:` 行唯一键,rowKey
- `columns:` 列族(格式 eg "maple:name,maple:age,maple:gender")
- `valueType:` 可选字段,在从 hbase 获取到结果后，再根据此 type 进行 parse,最后将结果转换为 Json 对象，然后返回。

### queryRow

> 查询 `Hbase` 一行记录，相对于上一个接口，没有列族信息

- 参数列表

```
cluster: String, table: String, row: String, valueType: Option[String]
```

- `cluster:` hbase 集群名称
- `table:` hbase 表名称
- `row:` 行唯一键,rowKey
- `valueType:` 可选字段,在从 hbase 获取到结果后，再根据此 type 进行 parse,最后将结果转换为 Json 对象，然后返回。

### scanRowRange

> 根据起始和结束 rowKey 扫描 Hbase 中行记录

- 参数列表

```
cluster: String, table: String,
startRow: String, endRow: Option[String], limit: Option[Int], valueType: Option[String]
```

- startRow: 开始扫描的 rowKey
- endRow: 结束扫描的 rowKey，Option
- limit: 限制查询行数，Option (如果为空，则选1条记录)

### scanRowRangeWithColumns

> 根据起始和结束 `rowKey` 扫描 `Hbase` 中行记录,并且带上列族条件

- 参数列表

```
cluster: String, table: String,
startRow: String, columns: String, endRow: Option[String],
limit: Option[Int], valueType: Option[String]
```

- columns: 针对上个 scan 接口新增一个列族的查询条件

---

## HBaseWriteController

### putValue

> 将 String 类型的值(value) 存入 Hbase

- 参数列表及部分参数详解

```
cluster: String, table: String, row: String, cf: String, cq: String, value: String
```

- `row:` rowKey，确定一行记录
- `cf:` column family 列族名称
- `cq:` column qualifier 列值名称
- `value:` 存入 HBase 中的值

### deleteRow

> 根据 `rowKey` 删除 `HBase` 中的一行值

- 参数列表

```
cluster: String, table: String, row: String
```

## OLAPController

###　unionQuery

> 1. 鉴权，然后 validate 请求。2. 选择执行引擎。3. 格式化查询结果并返回。

- 参数列表及部分参数详解

```
engine: String, cluster: String, db: String, query: String
```

- engine: ResourceType value 类型，制定需要的查询的引擎.
- cluster: 各引擎的集群名称
- db: 各引擎的 db
- query: 查询 json 字符串

###　getAllSupportedEngines

> 得到所有支持的引擎，返回 Json
> 没有入参

###　getClustersByEngine

> 入参 engine ，根据此名称查询其 Cluster

###　getSubItemsByCluster

### getSubItemMeta

### queryBatch

### queryMetas

### queryTables

### queryBatchAdvance

### queryLambda
