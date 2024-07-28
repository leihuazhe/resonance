```
.
├── build.sbt
├── build.yaml
├── data-service
│   ├── app
│   │   ├── authz
│   │   │   ├── AccessControlAction.scala
│   │   │   ├── AccessControlManager.scala
│   │   │   ├── ProfileLoader.scala
│   │   │   └── ProfileManager.scala
│   │   ├── bindable
│   │   │   ├── BindingPair.scala
│   │   │   └── package.scala
│   │   ├── common
│   │   │   ├── Const.scala
│   │   │   └── Response.scala
│   │   ├── controllers
│   │   │   ├── ESController.scala
│   │   │   ├── HBaseController.scala
│   │   │   ├── HBaseWriteController.scala
│   │   │   ├── Home.scala
│   │   │   ├── IAuthController.scala
│   │   │   ├── ManagementController.scala
│   │   │   ├── OLAPController.scala
│   │   │   ├── PegasusController.scala
│   │   │   ├── RequestUtils.scala
│   │   │   ├── TDataServiceActions.scala
│   │   │   └── TestController.scala
│   │   ├── entity
│   │   │   ├── Cluster.scala
│   │   │   ├── Engine.scala
│   │   │   ├── es
│   │   │   │   ├── EsCluster.scala
│   │   │   │   └── EsIndex.scala
│   │   │   ├── kylin
│   │   │   │   └── KyCluster.scala
│   │   │   └── pegasus
│   │   │       └── PegasusCluster.scala
│   │   ├── filters
│   │   │   ├── DataServiceFilter.scala
│   │   │   └── LoggingFilter.scala
│   │   ├── models
│   │   │   ├── cube
│   │   │   │   └── CubeManager.scala
│   │   │   ├── DataServiceException.scala
│   │   │   ├── engine
│   │   │   │   ├── EngineManager.scala
│   │   │   │   ├── es
│   │   │   │   │   ├── ESCertificateManager.scala
│   │   │   │   │   ├── ESQueryBuilder.scala
│   │   │   │   │   └── ESQueryProxy.scala
│   │   │   │   ├── hbase
│   │   │   │   │   ├── HBaseHelper.scala
│   │   │   │   │   ├── HBaseProxy.scala
│   │   │   │   │   ├── HClientManager.scala
│   │   │   │   │   ├── HTableManager.scala
│   │   │   │   │   └── result
│   │   │   │   │       └── Types.scala
│   │   │   │   ├── kudu
│   │   │   │   │   ├── KerberosLoginManager.scala
│   │   │   │   │   ├── KuduManager.scala
│   │   │   │   │   ├── KuduMetaData.scala
│   │   │   │   │   └── KuduResultSet.scala
│   │   │   │   ├── kylin
│   │   │   │   │   ├── Cubebuilder.scala
│   │   │   │   │   ├── Cube.scala
│   │   │   │   │   ├── JobDetails.scala
│   │   │   │   │   ├── Job.scala
│   │   │   │   │   ├── KylinManager.scala
│   │   │   │   │   ├── KylinQueryBuilder.scala
│   │   │   │   │   └── Model.scala
│   │   │   │   ├── LambdaManager.scala
│   │   │   │   └── pegasus
│   │   │   │       ├── PegasusClusterManager.scala
│   │   │   │       ├── PegasusManager.scala
│   │   │   │       └── PegasusProxy.scala
│   │   │   └── query
│   │   │       ├── QueryBuilderTrait.scala
│   │   │       ├── QueryResult.scala
│   │   │       ├── QueryRouter.scala
│   │   │       ├── QuerySegmentTrait.scala
│   │   │       └── SelectQuery.scala
│   │   ├── modules
│   │   │   └── DSModule.scala
│   │   ├── monitor
│   │   │   ├── FreshnessMonitor.scala
│   │   │   └── MonitorUtils.scala
│   │   └── public
│   │       ├── images
│   │       │   └── logo.png
│   │       ├── javascripts
│   │       │   ├── bootstrap.min.js
│   │       │   ├── jquery.min.js
│   │       │   ├── jquery.min.map
│   │       │   └── jquery-ui.min.js
│   │       └── stylesheets
│   │           ├── bootstrap.min.css
│   │           └── jquery-ui.min.css
│   ├── conf
│   │   ├── application-c3.conf
│   │   ├── application.conf
│   │   ├── application-local.conf
│   │   ├── application-staging.conf
│   │   ├── core-site.xml
│   │   ├── cubes.xml
│   │   ├── engines.xml
│   │   ├── es-clusters.xml
│   │   ├── hbase-site.xml
│   │   ├── hdfs-site.xml
│   │   ├── hive-site.xml
│   │   ├── ky-clusters.xml
│   │   ├── logback-lcs.xml
│   │   ├── logback.xml
│   │   ├── pegasus-clusters.xml
│   │   ├── pegasus.properties
│   │   └── routes
│   │
│   └── test
│       ├── ControllerSpec.scala
│       ├── models
│       │   ├── cube
│       │   │   └── CubeManagerSpec.scala
│       │   ├── engine
│       │   │   ├── es
│       │   │   │   ├── ESQueryBuilderSpec.scala
│       │   │   │   └── ESQueryProxySpec.scala
│       │   │   ├── kudu
│       │   │   │   └── KuduManagerTest.scala
│       │   │   ├── kylin
│       │   │   │   └── CubebuilderTest.scala
│       │   │   └── pegasus
│       │   │       └── PegasusSimpleTest.scala
│       │   ├── hbase
│       │   │   └── ResultSerializationTest.scala
│       │   └── query
│       │       ├── KylinQueryBuilderTest.scala
│       │       └── QueryRouterSpec.scala
│       └── monitor
│           └── FreshnessMonitorSpec.scala
│  
│  
│  
│  
├── data-service-authz
│   ├── app
│   │   ├── bindable
│   │   │   ├── BindingPair.scala
│   │   │   └── package.scala
│   │   ├── controllers
│   │   │   ├── AdminController.scala
│   │   │   └── ResourceController.scala
│   │   ├── db
│   │   │   ├── AccessControlDAO.scala
│   │   │   └── HasDecryptDatabaseConfigProvider.scala
│   │   └── modules
│   │       └── DSResControlModule.scala
│   ├── conf
│   │   ├── application-c3.conf
│   │   ├── application.conf
│   │   ├── application-staging.conf
│   │   ├── logback-lcs.xml
│   │   ├── logback.xml
│   │   └── routes
│   ├── script
│   │   ├── db_dataservice_ac_prod.sql
│   │   └── db_dataservice_ac_staging.sql
│  
│
│
│
├── data-service-common
│   ├── app
│   │   ├── controllers
│   │   │   └── UsageTelemetryAction.scala
│   │   ├── types
│   │   │   └── authz
│   │   │       ├── ResourceFormat.scala
│   │   │       └── Resource.scala
│   │   └── utils
│   │       ├── DataServiceException.scala
│   │       ├── EnumUtils.scala
│   │       ├── ErrorHandlingUtils.scala
│   │       ├── IAuthUtils.scala
│   │       ├── LogUtils.scala
│   │       ├── PerfCounterNames.scala
│   │       └── statistic
│   │           ├── QueryCategory.scala
│   │           └── UsageTelemetryBuilder.scala
│  
├── README.md
```
