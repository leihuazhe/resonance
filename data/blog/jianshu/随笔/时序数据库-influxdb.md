> influxdb 已经在我们整个架构中应用的越来越广泛，除了我们自研的 RPC 框架 使用 influxdb 存储服务调用次数、耗时等信息外，我们还将每一个微服务实例的 GC 日志信息存入 influxdb。前端采用 Grafana 读取 influxdb 数据，然后形成非常炫酷而又清晰的监控视图。本文将分享 来自 struy 对 influxdb 基本操作的总结。

### 哪些情况下用tag

一般来说，你的查询可以指引你哪些数据放在tag中，哪些放在field中。

- 把你经常查询的字段作为tag
- 如果你要对其使用GROUP BY()，也要放在tag中
- 如果你要对其使用InfluxQL函数，则将其放到field中
- 如果你需要存储的值不是字符串，则需要放到field中，因为tag value只能是字符串

### 终端操作数据库

```
查看所有数据库
show databases;

// 添加数据库
create database [database]

// 删除数据库
drop datebase [databese]

// 指定数据库
use [database]

// 查看指定数据库下所有measurement
show measurements

// 删除measurement
drop measurement [measurement]

// 用drop从索引中删除series
drop series from <measurement_name[,measurement_name]> where <tag_key>='<tag_value>'

// 从单个measurement删除所有series：
drop series from "h2o_feet"

//从单个measurement删除指定tag的series：
drop series from "h2o_feet" where "location" = 'santa_monica'


从数据库删除有指定tag的所有measurement中的所有数据：
drop series where "location" = 'santa_monica'

//用delete删除series
delete from <measurement_name> where [<tag_key>='<tag_value>'] | [<time interval>]

//删除measurementh2o_feet的所有相关数据：
delete from "h2o_feet"

// 删除measurementh2o_quality并且tagrandtag等于3的所有数据：
delete from "h2o_quality" where "randtag" = '3'

// 删除数据库中2016年一月一号之前的所有数据：
delete where time < '2016-01-01'
```

### 终端插入数据

```
格式：

<measurement>[,<tag-key>=<tag-value>...] <field-key>=<field-value>[,<field2-key>=<field2-value>...] [unix-nano-timestamp]

示例：
insert cpu,host=servera,region=us_west value=0.64

insert temperature,machine=unit42,type=assembly external=25,internal=37
```

### 数据写入(网络通讯)

- 使用http接口创建/删除数据库

```
curl -i -xpost http://localhost:8086/query --data-urlencode "q=create database dapengstate"

curl -i -xpost http://localhost:8086/query --data-urlencode "q=drop database dapengstate"
```

- 使用http接口写数据

> 通过http接口post数据到/write路径是我们往influxdb写数据的主要方式。下面的例子写了一条数据到mydb数据库。这条数据的组成部分是measurement为cpu_load_short，tag的key为host和region，对应tag的value是server01和us-west，field的key是value，对应的数值为0.64，而时间戳是1434055562000000000

```
curl -i -xpost 'http://localhost:8086/write?db=dapengstate' --data-binary 'cpu_load_short,host=server01,region=us-west value=0.64 1434055562000000000'
```

- 写入多个点

```
curl -i -xpost 'http://localhost:8086/write?db=mydb' --data-binary 'cpu_load_short,host=server02 value=0.67
cpu_load_short,host=server02,region=us-west value=0.55 1422568543702900257
cpu_load_short,direction=in,host=server01,region=us-west value=2.0 1422568543702900257'
```

- 通过文件写入数据
  > 可以通过curl的@filename来写入文件中的数据，且这个文件里的数据的格式需要满足influxdb那种行的语法。

cup_data.txt

```
cpu_load_short,host=server02 value=0.67
cpu_load_short,host=server02,region=us-west value=0.55 1422568543702900257
cpu_load_short,direction=in,host=server01,region=us-west value=2.0 1422568543702900257
```

写入

```
curl -i -xpost 'http://localhost:8086/write?db=mydb' --data-binary @cpu_data.txt

```

### 查询数据

```
curl -g 'http://localhost:8086/query?pretty=true' --data-urlencode "db=mydb" --data-urlencode "q=select \"value\" from \"cpu_load_short\" where \"region\"='us-west'"

```

返回值(json)

```json
{
  "results": [
    {
      "statement_id": 0,
      "series": [
        {
          "name": "cpu_load_short",
          "columns": ["time", "value"],
          "values": [["2015-06-11t20:46:02z", 0.64]]
        }
      ]
    }
  ]
}
```

- pretty=ture参数在url里面，是为了让返回的json格式化。这在调试或者是直接用curl的时候很有用，但在生产上不建议使用，因为这样会消耗不必要的网络带宽。

- 多个查询

```
curl -g 'http://localhost:8086/query?pretty=true' --data-urlencode "db=mydb" --data-urlencode "q=select \"value\" from \"cpu_load_short\" where \"region\"='us-west';select count(\"value\") from \"cpu_load_short\" where \"region\"='us-west'"

```

### 数据采样/数据保留策略

需求：

- 自动将十秒间隔数据聚合到30分钟的间隔数据
- 自动删除两个小时以上的原始10秒间隔数据
- 自动删除超过52周的30分钟间隔数据
- 如果我们写数据的时候没有指定rp的话，influxdb会使用默认的rp

创建一个保留两小时的数据的rp

```
create retention policy "two_hours" on "food_data" duration 2h replication 1 default

```

> 创建数据库时，influxdb会自动生成一个叫做autogen的rp，并作为数据库的默认rp，autogen这个rp会永远保留数据。在输入上面的命令之后，two_hours会取代autogen作为food_data的默认rp。

- 创建一个保留52周数据的RP

```
create retention policy "a_year" on "food_data" duration 52w replication 1

```

### 创建CQ(Continuous Query/连续查询)

```
create continuous query "cq_30m" on "food_data" begin
  select mean("website") as "mean_website",mean("phone") as "mean_phone"
  into "a_year"."downsampled_orders"
  from "orders"
  group by time(30m)
end
```

> 注意到我们在into语句中使用了”“.”“这样的语句，当要写入到非默认的rp时，就需要这样的写法。

上面创建了一个叫做cq_30m的cq作用于food_data数据库上。cq_30m告诉influxdb每30分钟计算一次measurement为orders并使用默认rptow_hours的字段website和phone的平均值，然后把结果写入到rp为a_year，两个字段分别是mean_website和mean_phone的measurement名为downsampled_orders的数据中。influxdb会每隔30分钟跑对之前30分钟的数据跑一次这个查询。

- 创建数据库时指定保留策略

```
create database "noaa_water_database" with duration 3d replication 1 shard duration 1h name "liquid"

```

> 该语句创建了一个叫做noaa_water_database的数据库，并且创建了liquid作为数据库的默认保留策略，其持续时间为3天，副本数是1，shard group的持续时间为一个小时。

- 修改保留策略

```
alter retention policy <retention_policy_name> on <database_name> duration <duration> replication <n> shard duration <duration> default
```

创建保留策略what_is_time其持续时间为两天

```
create retention policy "what_is_time" on "noaa_water_database" duration 2d replication 1

```

修改what_is_time的持续时间为3个星期，shard group的持续时间为30分钟，并将其作为数据库noaa_water_database的默认保留策略：+

```
alter retention policy "what_is_time" on "noaa_water_database" duration 3w shard duration 30m default

```

- 删除保留策略

```
drop retention policy <retention_policy_name> on <database_name>

```

### 如何查看InfluxDB的版本

终端:

```
influxd version

```

- curl：

```
curl -i 'http://localhost:8086/ping'
```
