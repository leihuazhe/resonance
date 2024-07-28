> 记录一次比较诡异的mysql死锁日志。系统运行几个月来，就在前几天发生了一次死锁，而且就只发生了一次死锁，整个排查过程耗时将近一天，最后感谢我们的DBA大神和老大一起分析找到原因。

### 诊断死锁

> 借助于我们dapeng开源的分布式日志查询系统(EFF)及日志告警系统，我们得益于及时发现了业务中的死锁日志。([想了解dapeng分布式日志查询系统请点击](https://www.jianshu.com/p/ce30c31111ca))

```log
08-02 08:46:24 787 dapeng-eventbus--scheduler-0 ERROR [] -
eventbus: 定时轮询线程内出现了异常，已捕获 msg:Deadlock found when trying to get lock; try restarting transaction
com.mysql.jdbc.exceptions.jdbc4.MySQLTransactionRollbackException: Deadlock found when trying to get lock; try restarting transaction
        at sun.reflect.NativeConstructorAccessorImpl.newInstance0(Native Method) ~[na:1.8.0_161]
        at sun.reflect.NativeConstructorAccessorImpl.newInstance(NativeConstructorAccessorImpl.java:62) ~[na:1.8.0_161]
        at sun.reflect.DelegatingConstructorAccessorImpl.newInstance(DelegatingConstructorAccessorImpl.java:45) ~[na:1.8.0_161]
        at java.lang.reflect.Constructor.newInstance(Constructor.java:423) ~[na:1.8.0_161]
        at com.mysql.jdbc.Util.handleNewInstance(Util.java:400) ~[mysql-connector-java-5.1.36.jar:5.1.36]
        at com.mysql.jdbc.Util.getInstance(Util.java:383) ~[mysql-connector-java-5.1.36.jar:5.1.36]
        at com.mysql.jdbc.SQLError.createSQLException(SQLError.java:987) ~[mysql-connector-java-5.1.36.jar:5.1.36]
        at com.mysql.jdbc.MysqlIO.checkErrorPacket(MysqlIO.java:3847) ~[mysql-connector-java-5.1.36.jar:5.1.36]
        at com.mysql.jdbc.MysqlIO.checkErrorPacket(MysqlIO.java:3783) ~[mysql-connector-java-5.1.36.jar:5.1.36]
       // 省略部分...
        at com.today.eventbus.scheduler.ScalaSql$.executeUpdateWithGenerateKey(ScalaSql.scala:104) ~[event-bus_2.12-2.0.4.jar:2.0.4]
        at com.today.eventbus.scheduler.ScalaSql$.executeUpdate(ScalaSql.scala:57) ~[event-bus_2.12-2.0.4.jar:2.0.4]
        at com.today.eventbus.scheduler.MsgPublishTask.$anonfun$doPublishMessagesAsync$1(MsgPublishTask.scala:154) ~[event-bus_2.12-2.0.4.jar:2.0.4]
        at com.today.eventbus.scheduler.MsgPublishTask.$anonfun$doPublishMessagesAsync$1$adapted(MsgPublishTask.scala:144) ~[event-bus_2.12-2.0.4.jar:2.0.4]
        at com.today.eventbus.scheduler.ScalaSql$.withTransaction(ScalaSql.scala:26) ~[event-bus_2.12-2.0.4.jar:2.0.4]
        at com.today.eventbus.scheduler.MsgPublishTask.doPublishMessagesAsync(MsgPublishTask.scala:144) ~[event-bus_2.12-2.0.4.jar:2.0.4]
        at com.today.eventbus.scheduler.MsgPublishTask.$anonfun$startScheduled$2(MsgPublishTask.scala:95) ~[event-bus_2.12-2.0.4.jar:2.0.4]
        //省略部分...
```

当我们找到业务中的ERROR日志后，发现只有如下简单的一句发现死锁的日志，无法进行死锁定定位，我们需要诊断分析当时出现死锁的上下文信息以及相关的执行语句。这时候就需要查看`mysql`死锁日志了。

首先，需要打开mysql死锁日志开关，我们线上是已经打开的。打开方式

```
set global innodb_print_all_deadlocks=on
```

然后我们去mysql错误日志中捞这次的死锁日志

```
2018-08-02T08:46:24.758848+08:00 871635 [Note] InnoDB:
*** (1) TRANSACTION:

TRANSACTION 206663716, ACTIVE 0 sec fetching rows
mysql tables in use 1, locked 1
LOCK WAIT 5 lock struct(s), heap size 1136, 10 row lock(s), undo log entries 5
MySQL thread id 872226, OS thread handle 140243727415040, query id 461709452 192.168.10.126 today_user updating
DELETE FROM dp_common_event WHERE id in (268241,268242,268243,268810,268811)
2018-08-02T08:46:24.758879+08:00 871635 [Note] InnoDB: *** (1) WAITING FOR THIS LOCK TO BE GRANTED:

RECORD LOCKS space id 812 page no 3 n bits 80 index PRIMARY of table `order_db`.`dp_common_event` trx id 206663716 lock_mode X waiting
Record lock, heap no 10 PHYSICAL RECORD: n_fields 6; compact format; info bits 0
 0: len 8; hex 8000000000041a0c; asc         ;;
 1: len 6; hex 00000c517014; asc    Qp ;;
 2: len 7; hex b5000006a20110; asc        ;;
 3: len 30; hex 636f6d2e746f6461792e6170692e6f726465722e7363616c612e6576656e; asc com.today.api.order.scala.even; (total 52 bytes);
 4: len 30; hex 636f6d2e746f6461792e6170692e6f726465722e7363616c612e6576656e; asc com.today.api.order.scala.even; (total 371 bytes);
 5: len 4; hex 5b625460; asc [bT`;;

2018-08-02T08:46:24.759242+08:00 871635 [Note] InnoDB: *** (2) TRANSACTION:

TRANSACTION 206663700, ACTIVE 0 sec inserting, thread declared inside InnoDB 5000
mysql tables in use 1, locked 1
10 lock struct(s), heap size 1136, 6 row lock(s), undo log entries 6
MySQL thread id 871635, OS thread handle 140243167844096, query id 461709463 192.168.10.126 today_user update
INSERT INTO  dp_common_event set id=268244, event_type='com.today.api.order.scala.events.StoreOrderEndEventNew', event_binary=x'636F6D2E746F6461792E6170692E6F726465722E7363616C612E6576656E74732E53746F72654F72646572456E644576656E744E65770016A8DF2015181C16F8E9111814313136303035303135333331373037353336373615061504180731322E35303030180731322E353030304806302E30303030F806302E30303030080E01311808313136303035303016E699A80436D0EBCC819F59280018001680DCCC819F59150216D0F7C8819F5915021680DCCC819F5915DEB1931E00192C16EEFC1E18143131363030353031353333313730373533363736180832303531383430301502180CE7899BE88289E58DA4E7B289160018003806302E303030301502180731302E30303030180015002806302E3030303016000016F0FC1E181431313630303530313533333137303735333637361808323034373138303415041812E9A699E88F87E6B2B9E88F9CE58C85383067160018003806302E3030303015021806322E35303030180015002806302E30303030160000190800'
2018-08-02T08:46:24.759270+08:00 871635 [Note] InnoDB: *** (2) HOLDS THE LOCK(S):

RECORD LOCKS space id 812 page no 3 n bits 80 index PRIMARY of table `order_db`.`dp_common_event` trx id 206663700 lock_mode X locks rec but not gap
Record lock, heap no 10 PHYSICAL RECORD: n_fields 6; compact format; info bits 0
 0: len 8; hex 8000000000041a0c; asc         ;;
 1: len 6; hex 00000c517014; asc    Qp ;;
 2: len 7; hex b5000006a20110; asc        ;;
 3: len 30; hex 636f6d2e746f6461792e6170692e6f726465722e7363616c612e6576656e; asc com.today.api.order.scala.even; (total 52 bytes);
 4: len 30; hex 636f6d2e746f6461792e6170692e6f726465722e7363616c612e6576656e; asc com.today.api.order.scala.even; (total 371 bytes);
 5: len 4; hex 5b625460; asc [bT`;;

2018-08-02T08:46:24.759691+08:00 871635 [Note] InnoDB: *** (2) WAITING FOR THIS LOCK TO BE GRANTED:

RECORD LOCKS space id 812 page no 3 n bits 80 index PRIMARY of table `order_db`.`dp_common_event` trx id 206663700 lock_mode X locks gap before rec insert intention waiting
Record lock, heap no 6 PHYSICAL RECORD: n_fields 6; compact format; info bits 32
 0: len 8; hex 8000000000041a0a; asc         ;;
 1: len 6; hex 00000c517024; asc    Qp$;;
 2: len 7; hex 40000001ac0a84; asc @      ;;
 3: len 30; hex 636f6d2e746f6461792e6170692e6f726465722e7363616c612e6576656e; asc com.today.api.order.scala.even; (total 54 bytes);
 4: len 30; hex 636f6d2e746f6461792e6170692e6f726465722e7363616c612e6576656e; asc com.today.api.order.scala.even; (total 476 bytes);
 5: len 4; hex 5b625460; asc [bT`;;

2018-08-02T08:46:24.760094+08:00 871635 [Note] InnoDB: *** WE ROLL BACK TRANSACTION (1)
```

#### 解读死锁日志

死锁日志里面记录了两个事务，`事务1`，`事务2`，其中`事务1`最终被回滚了

- 事务1

**持有的锁**
事务1锁住了5个对象，持有10把锁。执行的sql语句为

```sql
DELETE FROM dp_common_event WHERE id in (268241,268242,268243,268810,268811)
```

**等待的锁**
等待`order_db.dp_common_event`的主键的排他锁(X锁)

- 事务2

**持有的锁**
事务2锁住了10个对象，持有6把锁，sql语句如下

```sql
INSERT INTO  dp_common_event set id=268244, event_type='com.today.api.order.scala.events.StoreOrderEndEventNew', event_binary=x'二进制数据(略)'
```

**等待的锁**
`lock_mode X locks gap before rec insert intention waiting`
意思为事务2正在向表`dp_common_event`插入一行数据,在获取意向插入锁之前需要先获取到当前表的一个排他锁(`LOCK_X`)。

#### 查看发生死锁时间上下文业务日志

```
//省略
08-02 08:46:24 684 dapeng-container-biz-pool-79 DEBUG [ac1e0002a068ab95] - SQL Preparing: INSERT INTO  dp_common_event set id=?, event_type=?, event_binary=? args: WrappedArray(JdbcValue(268812), JdbcValue(com.today.api.order.scala.events.CreateOrderEventNew), JdbcValue([B@255b9459))
08-02 08:46:24 688 dapeng-container-biz-pool-79 DEBUG [ac1e0002a068ab95] - SQL result: 1
// 省略中间业务代码
08-02 08:46:24 758 dapeng-container-biz-pool-79 DEBUG [ac1e0002a068ab95] - SQL Preparing: INSERT INTO  dp_common_event set id=?, event_type=?, event_binary=? args: WrappedArray(JdbcValue(268244), JdbcValue(com.today.api.order.scala.events.StoreOrderEndEventNew), JdbcValue([B@3f796e10))
08-02 08:46:24 762 dapeng-container-biz-pool-79 DEBUG [ac1e0002a068ab95] - SQL result: 1
```

在一个事务中(根据死锁日志，此事务为**事务2**)，我们先后向`dp_common_event `表插入了两次数据，然后就在这时候发生了死锁。

```sql
//第一条数据
 INSERT INTO  dp_common_event set id= 268812, event_type='com.today.api.order.scala.events.CreateOrderEventNew', event_binary= [B@255b9459);
//第二条数据
 INSERT INTO  dp_common_event set id= 268244, event_type='com.today.api.order.scala.events.StoreOrderEndEventNew', event_binary=[B@3f796e10)
```

与此同时，事务1（发生死锁后被回滚的一方）的操作如下：

```
DELETE FROM dp_common_event WHERE id in (268241,268242,268243,268810,268811)
```

#### 查看表结构

```sql
CREATE TABLE `dp_common_event` (
  `id` bigint(20) NOT NULL COMMENT '事件id，全局唯一, 可用于幂等操作',
  `event_type` varchar(255) DEFAULT NULL COMMENT '事件类型',
  `event_binary` blob COMMENT '事件内容',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_dp_common_event` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
```

可以看到，该表`id`字段为主键，`update_at`是普通索引。

#### 分析

**时间线分析**

> 通过比对，我们整理出事务1和事务2执行的先后顺序，如下图:

![时间线.png](https://upload-images.jianshu.io/upload_images/6393906-b93035d76f94f73c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

##### t1 时刻

**事务2**向`dp_common_event`表插入一条数据，插入的数据id为`268812`，插入完成后，此时**事务2**会持有锁,锁住的是一行记录。` lock_mode X locks rec but not gap`代表锁住的是一个索引，不是一个范围。

##### t2 时刻

**事务1**开启事务,并删除 `dp_common_event`一部分数据，使用的条件是`in`的形式，删除的数据为`(268241,268242,268243,268810,268811) `。
我们在本地模拟插入上述5条数据，并使用desc分析这条删除语句。

```sql
desc delete from dp_common_event where id in (268241,268242,268243,268810,268811);
```

结果如下图:

![desc.png](https://upload-images.jianshu.io/upload_images/6393906-4bcda4ec66373d36.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

- **`key`栏为空,说明`mysql`并没有走主键索引，这是为什么呢？**

原来，当mysql走索引查询的数据占全表30%以上时，mysql就不会选择走索引。由于`dp_common_event`表的数据量很少，使用 in 的模式并没有走索引。因此这里没有加行锁。这里加的锁就是Gap锁。需要锁住的是一个范围。

本例中,gap锁从左至右依次锁住 268241 到 268811之间的每一条记录,以及268811以上的所有的记录。由于事务2中锁住的记录`id`为`268812`，该条记录的锁被事务2。因此gap锁当锁到`268812`这条记录时，会进行等待。等待巨鹿如下。`lock_mode X locks rec but not gap`代表的意思是等待的是一条记录而不是一个范围。

##### t3 时刻

**事务2**继续向下执行，插入第二条数据，id为`268244`，由于`268244`这条记录已经在**事务1**中被`gap锁锁。因此,这时候事务2反过来要去等待事务1的gap锁，而上一步事务1再等待事务2的记录锁。这就造成了循环等待，出现死锁。于是**事务1**回滚，**事务2**提交了。

t3时刻mysql错误日志日下

```
RECORD LOCKS space id 812 page no 3 n bits 80 index PRIMARY of table `order_db`.`dp_common_event` trx id 206663716 lock_mode X waiting
Record lock, heap no 10 PHYSICAL RECORD: n_fields 6; compact format; info bits 0
```

### 如何避免死锁

首先,上述例子中，如果事务2的两条插入语句的id是顺序递增的,那么再第二条语句插入时，它的id值不会被事务1的gap锁锁住，这样也不会造成死锁。

其次,如果事务2中每次往`dp_common_event`中只插入一条数据，也不会造成死锁。

第三，如果事务1中使用的时精确单条删，以多条语句单独删的形式，那么就不会锁住范围，而是精确的锁住每一行，这样也不回出现死锁。

总结，由于每次插入的id是通过一个分布式取号服务获取的，该取号服务会有两个节点，两个节点的id会有一个区间的差距，比如a节点目前取号的起始值为268241，那么b节点的起始值为268810。因此，每次插入时不能严格保证id的绝对递增。

因此，我们决定在删除操作时，精确到一行一行进行删除。

## 案例2

> 由于某次需要删除线上的脏数据时,与生产的业务相冲出现了死锁，如下日志显示。

```
08-05 18:55:56 582 dapeng-container-biz-pool-1 ERROR [ac190004bcca51e5] -
Deadlock found when trying to get lock; try restarting transaction
com.mysql.jdbc.exceptions.jdbc4.MySQLTransactionRollbackException:
Deadlock found when trying to get lock; try restarting transaction
         // 省略部分
        at com.mysql.jdbc.Util.handleNewInstance(Util.java:400) ~[mysql-connector-java-5.1.36.jar:5.1.36]
        at com.mysql.jdbc.Util.getInstance(Util.java:383) ~[mysql-connector-java-5.1.36.jar:5.1.36]
        at com.mysql.jdbc.SQLError.createSQLException(SQLError.java:987) ~[mysql-connector-java-5.1.36.jar:5.1.36]
        at com.mysql.jdbc.MysqlIO.checkErrorPacket(MysqlIO.java:3847) ~[mysql-connector-java-5.1.36.jar:5.1.36]
        at com.mysql.jdbc.MysqlIO.checkErrorPacket(MysqlIO.java:3783) ~[mysql-connector-java-5.1.36.jar:5.1.36]
        at com.mysql.jdbc.MysqlIO.sendCommand(MysqlIO.java:2447) ~[mysql-connector-java-5.1.36.jar:5.1.36]
        at com.mysql.jdbc.MysqlIO.sqlQueryDirect(MysqlIO.java:2594) ~[mysql-connector-java-5.1.36.jar:5.1.36]
        at com.mysql.jdbc.ConnectionImpl.execSQL(ConnectionImpl.java:2545) ~[mysql-connector-java-5.1.36.jar:5.1.36]
         //省略部分
        at wangzx.scala_commons.sql.RichDataSource.$anonfun$generateKey$1(RichDataSource.scala:30) ~[scala-sql_2.12-2.0.6.jar:2.0.6]
        at wangzx.scala_commons.sql.RichDataSource.withConnection(RichDataSource.scala:12) ~[scala-sql_2.12-2.0.6.jar:2.0.6]
        at wangzx.scala_commons.sql.RichDataSource.generateKey(RichDataSource.scala:30) ~[scala-sql_2.12-2.0.6.jar:2.0.6]
        at com.today.service.order_new.sql.OrderSql$.createOrderDetail(OrderSql.scala:80) ~[order_service_2.12-0.2.0-SNAPSHOT.jar:0.2.0-SNAPSHOT]
        at com.today.service.order_new.action.CreateOrderAction.$anonfun$action$1(CreateOrderAction.scala:53) [order_service_2.12-0.2.0-SNAPSHOT.jar:0.2.0-SNAPSHOT]
        at com.today.service.order_new.action.CreateOrderAction.$anonfun$action$1$adapted(CreateOrderAction.scala:53) [order_service_2.12-0.2.0-SNAPSHOT.jar:0.2.0-SNAPSHOT]
        at scala.collection.immutable.List.foreach(List.scala:389) ~[scala-library.jar:na]
        at com.today.service.order_new.action.CreateOrderAction.action(CreateOrderAction.scala:53) [order_service_2.12-0.2.0-SNAPSHOT.jar:0.2.0-SNAPSHOT]
        at com.today.service.order_new.action.CreateOrderAction.action(CreateOrderAction.scala:24) [order_service_2.12-0.2.0-SNAPSHOT.jar:0.2.0-SNAPSHOT]
        at com.today.service.commons.Action.execute(Action.scala:15) [service-commons_2.12-1.5-SNAPSHOT.jar:1.5-SNAPSHOT]
        at com.today.service.commons.Action.execute$(Action.scala:10) [service-commons_2.12-1.5-SNAPSHOT.jar:1.5-SNAPSHOT]
        at com.today.service.order_new.action.CreateOrderAction.execute(CreateOrderAction.scala:24) [order_service_2.12-0.2.0-SNAPSHOT.jar:0.2.0-SNAPSHOT]
        at com.today.service.order_new.OrderService2Impl.createOrder(OrderService2Impl.scala:45) [order_service_2.12-0.2.0-SNAPSHOT.jar:0.2.0-SNAPSHOT]
```

### 死锁日志

```
*** (1) TRANSACTION:

TRANSACTION 216689660, ACTIVE 27 sec inserting
mysql tables in use 1, locked 1
LOCK WAIT 4 lock struct(s), heap size 1136, 2 row lock(s), undo log entries 2
MySQL thread id 995341, OS thread handle 140243168642816, query id 539333372 192.168.10.131 today_user update
INSERT INTO `order_detail` SET
            id = 379373,
            order_no = '11600202533466529666',
            detail_seq = 1,
            sku_no='20507572',
            sku_name='海氏海诺创可贴',
            sku_version=0,
            barcode='',
            coupon_id=0,
            sku_count=1,
            sku_selling_price=7.0,
            discount_amount = 0.0,
            remark = '',
            created_at = now(),
            created_by = 1,
            updated_at = now(),
            updated_by=1
         ,promotion_id = 0
2018-08-05T18:55:56.524630+08:00 995779 [Note] InnoDB: *** (1) WAITING FOR THIS LOCK TO BE GRANTED:

RECORD LOCKS space id 1045 page no 6219 n bits 440 index idx_order_detail of table `order_db`.`order_detail` trx id 216689660 lock_mode X locks gap before rec insert intention waiting
Record lock, heap no 2 PHYSICAL RECORD: n_fields 2; compact format; info bits 32
 0: len 20; hex 3131363030353031353333303531333137333333; asc 11600501533051317333;;
 1: len 8; hex 8000000000032b87; asc       + ;;

2018-08-05T18:55:56.524779+08:00 995779 [Note] InnoDB: *** (2) TRANSACTION:

TRANSACTION 216688923, ACTIVE 49 sec fetching rows, thread declared inside InnoDB 1251
mysql tables in use 2, locked 2
1653 lock struct(s), heap size 172240, 160498 row lock(s), undo log entries 43
MySQL thread id 995779, OS thread handle 140243732473600, query id 539339615 localhost root Sending data
delete from orders where order_no in (
select a.order_no from (
select order_no from orders where  finish_time between '2018-07-01 00:00:00' and '2018-07-31 00:00:00' and store_id  in ('11866600','11888700','10008000','11866601','10009000','11703083','10003502','11608093','10004102','10010100',
'11699800','11888900') ) as a
)
2018-08-05T18:55:56.524820+08:00 995779 [Note] InnoDB: *** (2) HOLDS THE LOCK(S):

RECORD LOCKS space id 1045 page no 6219 n bits 440 index idx_order_detail of table `order_db`.`order_detail` trx id 216688923 lock_mode X
Record lock, heap no 1 PHYSICAL RECORD: n_fields 1; compact format; info bits 0
 0: len 8; hex 73757072656d756d; asc supremum;;

Record lock, heap no 2 PHYSICAL RECORD: n_fields 2; compact format; info bits 32
 0: len 20; hex 3131363030353031353333303531333137333333; asc 11600501533051317333;;
 1: len 8; hex 8000000000032b87; asc       + ;;

2018-08-05T18:55:56.524993+08:00 995779 [Note] InnoDB: *** (2) WAITING FOR THIS LOCK TO BE GRANTED:

RECORD LOCKS space id 817 page no 2397 n bits 184 index PRIMARY of table `order_db`.`orders` trx id 216688923 lock mode S waiting
Record lock, heap no 106 PHYSICAL RECORD: n_fields 26; compact format; info bits 0
 0: len 8; hex 8000000000032336; asc       #6;;
 1: len 6; hex 00000cea6bfc; asc     k ;;
 2: len 7; hex aa000001430110; asc     C  ;;
 3: len 20; hex 3131363030323032353333343636353239363636; asc 11600202533466529666;;
 4: len 2; hex 8001; asc   ;;
 5: len 4; hex 80000001; asc     ;;
 6: len 5; hex 8000070000; asc      ;;
 7: len 5; hex 8000070000; asc      ;;
 8: len 8; hex 8000000000000002; asc         ;;
 9: len 4; hex 80b1014a; asc    J;;
 10: len 8; hex 8000000000000000; asc         ;;
 11: len 5; hex 8000000000; asc      ;;
 12: len 5; hex 8000000000; asc      ;;
 13: len 5; hex 8000000000; asc      ;;
 14: len 2; hex 8000; asc   ;;
 15: SQL NULL;
 16: SQL NULL;
 17: len 5; hex 99a08b2dde; asc    - ;;
 18: len 0; hex ; asc ;;
 19: len 0; hex ; asc ;;
 20: SQL NULL;
 21: len 4; hex 81e24944; asc   ID;;
 22: len 5; hex 99a08b2ddd; asc    - ;;
 23: len 4; hex 80000001; asc     ;;
 24: len 4; hex 5b66d7a1; asc [f  ;;
 25: len 4; hex 80000001; asc     ;;

2018-08-05T18:55:56.525617+08:00 995779 [Note] InnoDB: *** WE ROLL BACK TRANSACTION (1)
```

### 分析死锁日志

主要是事务1 `insert`操作时在插入`order_detail`表时，需要获取插入意向锁之前，需要获取一个gap x锁。

事务2在删除数据时，需要获取一个 S锁，共享锁。orders表的。
