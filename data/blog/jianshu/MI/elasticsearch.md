### 测试可用集群

目前测试可用的 es 集群，域名：`c3online.api.es.srv`

查询此集群上的所有索引

```
curl -XGET 'c3online.api.es.srv/_cat/indices?v&pretty'
//或者浏览器访问
http://c3online.api.es.srv/_cat/indices?v&pretty
```

查询某个索引的信息

```
http://c3online.api.es.srv/ecom-jingdong-v2-20181230
```
