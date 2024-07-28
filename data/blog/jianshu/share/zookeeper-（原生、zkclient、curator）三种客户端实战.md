> zookeeper 的三种api
> 采用curator进行简单的配置中心案例学习
> 基于curator 的分布式锁，计数器！

#maple-zookeeper

# zookeeper 学习 ，更多请参阅我的码云，参照源码学习更快,[码云](https://gitee.com/youjie1/maple-zookeeper)

---

### 重点对三种客户端的学习研究，关于zookeeper底层实现，没有过多研究

---

![输入图片说明](https://git.oschina.net/uploads/images/2017/0728/173920_6c0f5000_1147300.jpeg 'center.jpg')

### 1.Zookeeper安装部署

Zookeeper的部署很简单，如果已经有Java运行环境的话，下载tarball解压后即可运行。

```
[root@vm Temp]$ wget http://mirror.bit.edu.cn/apache/zookeeper/zookeeper-3.4.6/zookeeper-3.4.6.tar.gz
[root@vm Temp]$ tar zxvf zookeeper-3.4.6.tar.gz
[root@vm Temp]$ cd zookeeper-3.4.6

[root@vm zookeeper-3.4.6]$ cp conf/zoo_sample.cfg conf/zoo.cfg
[root@vm zookeeper-3.4.6]$ export ZOOKEEPER_HOME=/usr/local/src/zookeeper-3.4.5
[root@vm zookeeper-3.4.6]$ export PATH=$ZOOKEEPER_HOME/bin:$PATH

[root@vm zookeeper-3.4.6]$ bin/zkServer.sh start
[root@vm zookeeper-3.4.6]$ bin/zkCli.sh -server 127.0.0.1:2181
```

### 2.客户端常用操作

用zkCli.sh连接上Zookeeper服务后，用help能列出所有命令：

```
[root@BC-VM-edce4ac67d304079868c0bb265337bd4 zookeeper-3.4.6]# bin/zkCli.sh -127.0.0.1:2181
Connecting to localhost:2181
2015-06-11 10:55:14,387 [myid:] - INFO  [main:Environment@100] - Client environment:zookeeper.version=3.4.6-1569965, built on 02/20/2014 09:09 GMT
    ...
[zk: localhost:2181(CONNECTED) 5] help
ZooKeeper -server host:port cmd args
        connect host:port
        get path [watch]
        ls path [watch]
        set path data [version]
        rmr path
        delquota [-n|-b] path
        quit
        printwatches on|off
        create [-s] [-e] path data acl
        stat path [watch]
        close
        ls2 path [watch]
        history
        listquota path
        setAcl path acl
        getAcl path
        sync path
        redo cmdno
        addauth scheme auth
        delete path [version]
        setquota -n|-b val path
```

### 3.用Curator管理Zookeeper

Curator的Maven依赖如下，一般直接使用curator-recipes就行了，如果需要自己封装一些底层些的功能的话，例如增加连接管理重试机制等，则可以引入curator-framework包。

```
    <dependency>
        <groupId>org.apache.curator</groupId>
        <artifactId>curator-recipes</artifactId>
        <version>2.7.0</version>
    </dependency>
```

#### 3.1 Client操作

```
package com.may.curator.api;

import org.apache.curator.framework.CuratorFramework;
import org.apache.curator.framework.CuratorFrameworkFactory;
import org.apache.curator.retry.RetryNTimes;
/**
 * 利用Curator进行CRUD
 *
 * @author youJie
 * @date 2017-07-28 16:15
 *
 */
public class CuratorClient {

    /** Zookeeper info */
    private static final String ZK_ADDRESS = "10.0.14.79:2181";
    private static final String ZK_PATH = "/zktest";

    public static void main(String[] args) throws Exception {
        // 1.Connect to zk
        CuratorFramework client = CuratorFrameworkFactory.newClient(
                ZK_ADDRESS,
                new RetryNTimes(10, 5000)
        );
        client.start();
        System.out.println("zk client start successfully!");

        /** 2.Client API test*/
        // 2.1 Create node
        String data1 = "hello";
        print("create", ZK_PATH, data1);
        client.create().
                creatingParentsIfNeeded().
                forPath(ZK_PATH, data1.getBytes());

        // 2.2 Get node and data
        print("ls", "/");
        print(client.getChildren().forPath("/"));
        print("get", ZK_PATH);
        print(client.getData().forPath(ZK_PATH));

        // 2.3 Modify data
        String data2 = "world";
        print("set", ZK_PATH, data2);
        client.setData().forPath(ZK_PATH, data2.getBytes());
        print("get", ZK_PATH);
        print(client.getData().forPath(ZK_PATH));

        // 2.4 Remove node
        print("delete", ZK_PATH);
        client.delete().forPath(ZK_PATH);
        print("ls", "/");
        print(client.getChildren().forPath("/"));
    }

    private static void print(String... cmds) {
        StringBuilder text = new StringBuilder("$ ");
        for (String cmd : cmds) {
            text.append(cmd).append(" ");
        }
        System.out.println(text.toString());
    }

    private static void print(Object result) {
        System.out.println(
                result instanceof byte[]
                    ? new String((byte[]) result)
                        : result);
    }

}


```

#### 3.2 监听器

Curator提供了三种Watcher(Cache)来监听结点的变化：

- Path Cache：监视一个路径下1）孩子结点的创建、2）删除，3）以及结点数据的更新。产生的事件会传递给注册的PathChildrenCacheListener。
- Node Cache：监视一个结点的创建、更新、删除，并将结点的数据缓存在本地。
- Tree Cache：Path Cache和Node Cache的“合体”，监视路径下的创建、更新、删除事件，并缓存路径下所有孩子结点的数据。

```
package com.may.curator.api;

import org.apache.curator.framework.CuratorFramework;
import org.apache.curator.framework.CuratorFrameworkFactory;
import org.apache.curator.framework.recipes.cache.ChildData;
import org.apache.curator.framework.recipes.cache.PathChildrenCache;
import org.apache.curator.framework.recipes.cache.PathChildrenCacheEvent;
import org.apache.curator.framework.recipes.cache.PathChildrenCacheListener;
import org.apache.curator.framework.recipes.cache.PathChildrenCache.StartMode;
import org.apache.curator.retry.RetryNTimes;

public class CuratorPathWatcher {
    /** Zookeeper info */
    private static final String ZK_ADDRESS = "10.0.14.79:2181";
    private static final String ZK_PATH = "/zktest";

    public static void main(String[] args) throws Exception {
        // 1.Connect to zk
        CuratorFramework client = CuratorFrameworkFactory.newClient(
                ZK_ADDRESS,
                new RetryNTimes(10, 5000)
        );
        client.start();
        System.out.println("zk client start successfully!");

        // 2.Register watcher
        PathChildrenCache watcher = new PathChildrenCache(
                client,
                ZK_PATH,
                true    // if cache data
        );
        watcher.getListenable().addListener(new PathChildrenCacheListener() {

            @Override
            public void childEvent(CuratorFramework client, PathChildrenCacheEvent event) throws Exception {
                ChildData data = event.getData();
                if (data == null) {
                    System.out.println("No data in event[" + event + "]");
                } else {
                    System.out.println("Receive event: "
                            + "type=[" + event.getType() + "]"
                            + ", path=[" + data.getPath() + "]"
                            + ", data=[" + new String(data.getData()) + "]"
                            + ", stat=[" + data.getStat() + "]");
                }

            }
        });

        /*watcher.getListenable().addListener((client1, event) -> {
            ChildData data = event.getData();
            if (data == null) {
                System.out.println("No data in event[" + event + "]");
            } else {
                System.out.println("Receive event: "
                        + "type=[" + event.getType() + "]"
                        + ", path=[" + data.getPath() + "]"
                        + ", data=[" + new String(data.getData()) + "]"
                        + ", stat=[" + data.getStat() + "]");
            }
        });*/
        watcher.start(StartMode.BUILD_INITIAL_CACHE);
        System.out.println("Register zk watcher successfully!");

        Thread.sleep(Integer.MAX_VALUE);
    }
}

```

### 4.Curator“菜谱”

既然Maven包叫做curator-recipes，那说明Curator有它独特的“菜谱”：

- 锁：包括共享锁、共享可重入锁、读写锁等。
- 选举：Leader选举算法。
- Barrier：阻止分布式计算直至某个条件被满足的“栅栏”，可以看做JDK Concurrent包中Barrier的分布式实现。
- 缓存：前面提到过的三种Cache及监听机制。
- 持久化结点：连接或Session终止后仍然在Zookeeper中存在的结点。
- 队列：分布式队列、分布式优先级队列等。

#### 4.1 分布式锁

分布式编程时，比如最容易碰到的情况就是应用程序在线上多机部署，于是当多个应用同时访问某一资源时，就需要某种机制去协调它们。例如，现在一台应用正在rebuild缓存内容，要临时锁住某个区域暂时不让访问；又比如调度程序每次只想一个任务被一台应用执行等等。

下面的程序会启动两个线程t1和t2去争夺锁，拿到锁的线程会占用5秒。运行多次可以观察到，有时是t1先拿到锁而t2等待，有时又会反过来。Curator会用我们提供的lock路径的结点作为全局锁，这个结点的数据类似这种格式：[_c_64e0811f-9475-44ca-aa36-c1db65ae5350-lock-0000000005]，每次获得锁时会生成这种串，释放锁时清空数据。

#### 4.2 Leader选举

当集群里的某个服务down机时，我们可能要从slave结点里选出一个作为新的master，这时就需要一套能在分布式环境中自动协调的Leader选举方法。Curator提供了LeaderSelector监听器实现Leader选举功能。同一时刻，只有一个Listener会进入takeLeadership()方法，说明它是当前的Leader。注意：当Listener从takeLeadership()退出时就说明它放弃了“Leader身份”，这时Curator会利用Zookeeper再从剩余的Listener中选出一个新的Leader。autoRequeue()方法使放弃Leadership的Listener有机会重新获得Leadership，如果不设置的话放弃了的Listener是不会再变成Leader的。
