### 1.rbacAction

由以下几个 Action 使用 andThen 组合而成，一共 4个 Action

authedAction ===>   PerfCounterAction andThen IAuthAction(scopes)

PerfCounterAction 此 Action 在 xiaomi-commons-play 1.1.6-SNAPSHOT 中

在一次记录中记录全部的内容，主要是用于记录请求时间和请求的方法等

IAuthAction 此 Action 在 xiaomi_lauth_sdk_play 1.0.7 jar 中

AccessControlAction 本项目内的 Action ，检测本次请求是否有权限

UsageTelemetryAction 遥测 Action 作用？？？

### 2.Scala Xml

#### 3.TemporalAccessor

### 关于 Play Modules 和依赖注入

请参考 文章  [http://www.hzways.com/2018/12/25/play-learning-04/](http://www.hzways.com/2018/12/25/play-learning-04/)

**Data-Service 启动流程**

项目中用 keyCenter 解密的部分代码

- ESCertificateManager

```scala
@Singleton

class ESCertificateManager @Inject()(conf: Configuration) {

    private val AnonymousCertificate = EsCertificate(None, None)

    private val KerberosCertificate = EsCertificate(conf.getString("dataservice.source.es.cert.name"),

        Some(KeycenterUtil.decryptString(conf.getString("dataservice.source.es.cert.password.encrypted").get)))

    private lazy val clusterCertMap = Map(

        "c3-data-es-ssd-privacy01.bj:9200" -> EsCertificate(Some("xuhanqiu"), Some("xuhanqiu")),

        "c3-data-es-ssd-privacy01:9200" -> EsCertificate(Some("xuhanqiu"), Some("xuhanqiu")),

        "c4-data-es-client01:9200" -> KerberosCertificate,

        "c4-data-es-client02:9200" -> KerberosCertificate

    )

    def findCertificate(cluster: String) ={

        clusterCertMap.getOrElse(cluster.toLowerCase, AnonymousCertificate)

    }

}
```

### EngineManager 查询引擎管理器

这里集成了多种查询应用。目前包括 `Kylin` 和 `es`

- kylin => KylinManager
- es => ESQueryProxy

他们统一的父接口为 `OLAPEngine`

#### ES

### LambdaManager

> 集成了更多的查询引擎
