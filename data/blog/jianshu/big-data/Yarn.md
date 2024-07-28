资源调度框架 Yarn

背景：

- MapReduce 1.x 存在的问题：单点故障 & 节点压力大 不易扩展 & 不支持除 MR 之外的框架

- 资源利用率 & 运营成本

![image.png](https://upload-images.jianshu.io/upload_images/6393906-5a8104b5cbe05ae4.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

- 一个集群运行，多框架 共享一个集群的信息和资源。Shared Cluster

![image.png](https://upload-images.jianshu.io/upload_images/6393906-213443a6c57c5ade.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

YARN：

不同计算框架 可以共享同一个 HDFS 集群上的数据，享受整体的资源调度。

XXX on YARN:

Spark/MR/Flink/Storm

与其他计算框架共享集群资源，按资源需要分配，进而提高集群资源的利用率。

YARN： Yet Another Resource Negotiator

- 通用的资源管理系统

- 为上层应用提供统一的资源管理与调度

架构：

ResourceManager RM

- 整个集群同一时间提供服务的 RM 只有一个，负责集群资源的统一管理和调度

- 处理客户端请求：提交一个作业，杀死一个作业。

- 监控 NM，一旦某 NM 挂了，那么该 NM 上运行的任务需要告诉 AM 如何进行处理

NodeManager NM

- 负责自己本身节点资源管理和使用

- 定时向 RM 汇报本节点资源使用情况

- 接受并处理来自 RM 的各种命令：启动 Container

- 处理来自 AM 的命令

- 单个节点资源管理

ApplicationMaster

- 每个应用程序对应一个：MR、Spark，负责应用程序的管理，为应用程序向 RM （core、memory）申请资源，分配给内部 task

- 需要与 NM 通信：启动/停止 task，task 运行在 contaoner 上面，AM 也是运行在container 上

Container

- 封装了 CPU、Memory 等资源的一个容器

- 是一个任务运行环境的抽象

Clinet

- 提交作业

- 查询作业运行进度

- 杀死作业

![image.png](https://upload-images.jianshu.io/upload_images/6393906-5512651e27b6cece.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

yarn-site.xml

### 初次提交 MR 作业

![image.png](https://upload-images.jianshu.io/upload_images/6393906-989a8a5f556879e6.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
