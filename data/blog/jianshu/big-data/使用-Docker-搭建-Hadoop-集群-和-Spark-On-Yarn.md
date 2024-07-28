> 本文仅作搭建介绍，方便本地搭建起来进行测试而用

### 镜像选择

选择 **[uhopper](https://hub.docker.com/u/uhopper)** 定制的一系列hadoop生态镜像来搭建docker集群，这些镜像具体包括:

- hdfs
  - [hadoop-namenode](https://hub.docker.com/r/uhopper/hadoop-namenode)
  - [hadoop-datanode](https://hub.docker.com/r/uhopper/hadoop-datanode)
- yarn
  - [hadoop-resourcemanager](https://hub.docker.com/r/uhopper/hadoop-resourcemanager)
  - [hadoop-nodemanager](https://hub.docker.com/r/uhopper/hadoop-nodemanager)
- spark
  - [hadoop-spark](https://hub.docker.com/r/uhopper/hadoop-spark)

### 使用 docker-compose 构建 hadoop 集群

> 在同一个宿主机上搭建 hadoop 集群，采用 1个 namenode 容器，3个 datanode 容器（分别为 datanode1,datanode2,datanode3）,1个 resourceManager容器，1个 nodeManager 容器。spark docker 容器可选，我们可以使用宿主机启动 spark，并通过 yarn 提交模式提交 spark job。

```yaml
version: '2'
services:
  namenode:
    image: uhopper/hadoop-namenode:2.8.1
    # 配置好 docker 内的假域名
    hostname: namenode
    container_name: namenode
    networks:
      - hadoop
    volumes:
      # 自行修改数据卷的映射位置
      - /namenode:/hadoop/dfs/name
    environment:
      - CLUSTER_NAME=datanode1
      - CLUSTER_NAME=datanode2
      - CLUSTER_NAME=datanode3
      # 配置 hdfs 用户权限问题,不需要只允许 hadoop 用户访问
      - HDFS_CONF_dfs_permissions=false
    ports:
      # 接收Client连接的RPC端口，用于获取文件系统metadata信息
      - 8020:8020
      # nameNode http服务的端口
      - 50070:50070
      # nameNode https 服务的端口
      - 50470:50470

  datanode1:
    image: uhopper/hadoop-datanode:2.8.1
    hostname: datanode1
    container_name: datanode1
    networks:
      - hadoop
    volumes:
      - /datanode1:/hadoop/dfs/data
    environment:
      # 等价于在 core-site.xml 中配置 fs.defaultFS
      - CORE_CONF_fs_defaultFS=hdfs://namenode:8020
      # 等价于在 hdfs-site.xml 中配置 dfs.datanode.address
      - HDFS_CONF_dfs_datanode_address=0.0.0.0:50010
      # dfs.datanode.ipc.address 不使用默认端口的意义是在同一机器起多个 datanode，暴露端口需要不同
      - HDFS_CONF_dfs_datanode_ipc_address=0.0.0.0:50020
      # dfs.datanode.http.address
      - HDFS_CONF_dfs_datanode_http_address=0.0.0.0:50075
    ports:
      - 50010:50010
      - 50020:50020
      - 50075:50075

  datanode2:
    image: uhopper/hadoop-datanode:2.8.1
    hostname: datanode2
    container_name: datanode2
    networks:
      - hadoop
    volumes:
      - /datanode2:/hadoop/dfs/data
    environment:
      - CORE_CONF_fs_defaultFS=hdfs://namenode:8020
      - HDFS_CONF_dfs_datanode_address=0.0.0.0:50012
      - HDFS_CONF_dfs_datanode_ipc_address=0.0.0.0:50022
      - HDFS_CONF_dfs_datanode_http_address=0.0.0.0:50072
    ports:
      - 50012:50012
      - 50022:50022
      - 50072:50072

  datanode3:
    image: uhopper/hadoop-datanode:2.8.1
    hostname: datanode3
    container_name: datanode3
    networks:
      - hadoop
    volumes:
      - /datanode3:/hadoop/dfs/data
    environment:
      - CORE_CONF_fs_defaultFS=hdfs://namenode:8020
      - HDFS_CONF_dfs_datanode_address=0.0.0.0:50013
      - HDFS_CONF_dfs_datanode_ipc_address=0.0.0.0:50023
      - HDFS_CONF_dfs_datanode_http_address=0.0.0.0:50073
    ports:
      - 50013:50013
      - 50023:50023
      - 50073:50073

  resourcemanager:
    image: uhopper/hadoop-resourcemanager:2.8.1
    hostname: resourcemanager
    container_name: resourcemanager
    networks:
      - hadoop
    environment:
      - CORE_CONF_fs_defaultFS=hdfs://namenode:8020
      - YARN_CONF_yarn_log___aggregation___enable=true
    ports:
      - 8030:8030
      - 8031:8031
      - 8032:8032
      - 8033:8033
      - 8088:8088

  nodemanager:
    image: uhopper/hadoop-nodemanager:2.8.1
    hostname: nodemanager
    container_name: nodemanager
    networks:
      - hadoop
    environment:
      - CORE_CONF_fs_defaultFS=hdfs://namenode:8020
      - YARN_CONF_yarn_resourcemanager_hostname=resourcemanager
      - YARN_CONF_yarn_log___aggregation___enable=true
      - YARN_CONF_yarn_nodemanager_remote___app___log___dir=/app-logs
    ports:
      - 8040:8040
      - 8041:8041
      - 8042:8042

  spark:
    image: uhopper/hadoop-spark:2.1.2_2.8.1
    hostname: spark
    container_name: spark
    networks:
      - hadoop
    environment:
      - CORE_CONF_fs_defaultFS=hdfs://namenode:8020
      - YARN_CONF_yarn_resourcemanager_hostname=resourcemanager
    command: tail -f /var/log/dmesg

networks:
  hadoop:
```

上述关于端口映射部分，对每个容器端口的说明可 **[参考](https://blog.csdn.net/baiBenny/article/details/53887328)**

### 启动容器

docker-compose up -d

### 宿主机 spark 连接 docker 中的 hadoop 集群

> 不管是使用 spark 还是其他服务，只要我们要连接使用 docker 搭建的 hadoop 集群，我们需要配置一些参数。如果使用 spark，宿主机需要有 spark 和 hadoop 的完整程序包。

#### 1.宿主机配置 docker 假域名

在 /etc/hosts 下配置上述 docker 容器中出现的 hostname，将这些域名都指向本机(宿主机) IP，192.168.1.100 为本机 ip，仅供参考。

```
192.168.1.100 namenode
192.168.1.100 resourcemanager
192.168.1.100 nodemanager
192.168.1.100 datanode1
192.168.1.100 datanode2
192.168.1.100 datanode3
```

#### 2.配置 $HADOOP_HOME/etc/hadoop 目录下 core-site.xml 和 yarn-site.xml

core-site.xml 增加指向 namenode 的配置，其中 hdfs://namenode:8020 指向 docker 容器中的 namenode host，因此这里我们需要在 /etc/hosts 中加入此域名，并配置为宿主机 ip

```xml
<configuration>
    <property>
        <name>fs.defaultFS</name>
        <value>hdfs://namenode:8020</value>
    </property>
</configuration>
```

yarn-site.xml

```xml
<configuration>
  <property>
    <name>yarn.resourcemanager.hostname</name>
    <value>resourcemanager</value>
  </property>
</configuration>
```

### 3.配置 $SPARK_HOME/conf/spark-env.sh，暴露 hadoop_home 目录

```sh
export HADOOP_CONF_DIR=/home/maple/app/hadoop-2.8.5/etc/hadoop
```
