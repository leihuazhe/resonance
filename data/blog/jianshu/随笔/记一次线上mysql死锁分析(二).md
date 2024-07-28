> 记录一次比较诡异的mysql死锁日志。系统运行几个月来，就在前几天发生了一次死锁，而且就只发生了一次死锁，整个排查过程耗时将近一天，最后感谢我们的DBA大神和老大一起分析找到原因。

### 日志发现死锁

#### 会话1出现死锁日志

> 节点 20.102

```log
08-09 10:06:50 048 pool-7-thread-1 DEBUG [] - SQL Preparing:
            INSERT IGNORE INTO `stock_journal` SET
             `id` = ?,
             `stock_id` = ?,
             `source_type` =? ,
             `source_time` = ?,
             `source_id` = ?,
              `stock_amount` = ? , `after_stock_num` = ? , `after_ff_stock_weight` = ? ,
             `handle_type` = ?,
             `is_deleted` =  ?,
             `selling_price` = ?,
             `buying_price` = ?,
             `created_at` = now(),
             `created_by` = 1,
             `updated_at` = now(),
             `updated_by` = 1
         args: ArrayBuffer(JdbcValue(1106783), JdbcValue(978991), JdbcValue(1), JdbcValue(2018-08-09 10:06:44.0), JdbcValue(519458), JdbcValue(-1), JdbcValue(36), JdbcValue(0.0), JdbcValue(1), JdbcValue(1), JdbcValue(None), JdbcValue(None))
08-09 10:06:50 049 pool-7-thread-1 DEBUG [] - SQL result: 1
08-09 10:06:50 049 pool-7-thread-1 DEBUG [] - SQL Preparing:
           UPDATE  `stock` SET
          `last_balance_stock` = ? ,
          `use_unit` = ? ,
           `stock_num` = ?
            where id=?
            args: List(JdbcValue(0), JdbcValue(), JdbcValue(36), JdbcValue(978991))

08-09 10:06:50 308 pool-7-thread-1 ERROR [] - Deadlock found when trying to get lock; try restarting transaction
com.mysql.jdbc.exceptions.jdbc4.MySQLTransactionRollbackException: Deadlock found when trying to get lock; try restarting transaction
//省略
```

#### 同一时刻会话2日志

> 节点 10.131

```
08-09 10:06:50 276 pool-7-thread-1 DEBUG [] - SQL Preparing:
            INSERT IGNORE INTO `stock_journal` SET
             `id` = ?,
             `stock_id` = ?,
             `source_type` =? ,
             `source_time` = ?,
             `source_id` = ?,
              `stock_amount` = ? , `after_stock_num` = ? , `after_ff_stock_weight` = ? ,
             `handle_type` = ?,
             `is_deleted` =  ?,
             `selling_price` = ?,
             `buying_price` = ?,
             `created_at` = now(),
             `created_by` = 1,
             `updated_at` = now(),
             `updated_by` = 1
         args: ArrayBuffer(JdbcValue(1106784), JdbcValue(980091), JdbcValue(1), JdbcValue(2018-08-09 10:06:45.0), JdbcValue(519465), JdbcValue(-1), JdbcValue(11), JdbcValue(0.0), JdbcValue(1), JdbcValue(1), JdbcValue(None), JdbcValue(None))
08-09 10:06:50 276 pool-7-thread-1 DEBUG [] - SQL result: 1
08-09 10:06:50 276 pool-7-thread-1 DEBUG [] - SQL Preparing:
           UPDATE  `stock` SET
          `last_balance_stock` = ? ,
          `use_unit` = ? ,
          `stock_num` = ?
          where id=?
          args: List(JdbcValue(0), JdbcValue(), JdbcValue(11),           JdbcValue(980091))
```

#### 查看mysql死锁日志

> 如何开启和查看死锁日志？查看上一篇文章 [记一次线上mysql死锁分析(一)](https://www.jianshu.com/p/3c9430b38e18)

```log
2018-08-09T10:06:50.277300+08:00 1126303 [Note] InnoDB: Transactions deadlock detected, dumping detailed information.
2018-08-09T10:06:50.277331+08:00 1126303 [Note] InnoDB:
*** (1) TRANSACTION:

TRANSACTION 226991410, ACTIVE 1 sec starting index read
mysql tables in use 1, locked 1
LOCK WAIT 7 lock struct(s), heap size 1136, 6 row lock(s), undo log entries 4
MySQL thread id 1125946, OS thread handle 140243724752640, query id 640753215 192.168.20.102 today_user updating
UPDATE  `stock` SET
          `last_balance_stock` = 0 , `use_unit` = '' , `stock_num` = 36  where id=978991
2018-08-09T10:06:50.277368+08:00 1126303 [Note] InnoDB: *** (1) WAITING FOR THIS LOCK TO BE GRANTED:

RECORD LOCKS space id 1090 page no 525 n bits 104 index PRIMARY of table `stock_db`.`stock` trx id 226991410 lock_mode X locks rec but not gap waiting
Record lock, heap no 33 PHYSICAL RECORD: n_fields 21; compact format; info bits 0
 0: len 8; hex 80000000000ef02f; asc        /;;
 1: len 6; hex 00000d879d40; asc      @;;
 2: len 7; hex 31000009d01e80; asc 1      ;;
 3: len 8; hex 3131363032363031; asc 11602601;;
 4: len 1; hex 81; asc  ;;
 5: len 8; hex 3230343336303439; asc 20436049;;
 6: len 0; hex ; asc ;;
 7: len 15; hex e995bfe6b299e88cb6e58fb6e89b8b; asc                ;;
 8: len 8; hex 8000000000000023; asc        #;;
 9: len 6; hex 800000000000; asc       ;;
 10: len 0; hex ; asc ;;
 11: len 8; hex 8000000000000000; asc         ;;
 12: len 6; hex 800000000000; asc       ;;
 13: len 8; hex 8000000000000000; asc         ;;
 14: len 6; hex 800000000000; asc       ;;
 15: len 1; hex 81; asc  ;;
 16: len 5; hex 99a0906bdc; asc    k ;;
 17: len 4; hex 80000001; asc     ;;
 18: len 4; hex 80000001; asc     ;;
 19: len 4; hex 5b6ba1b9; asc [k  ;;
 20: len 30; hex 202020202020202020202020202020202020202020202020202020202020; asc                               ; (total 255 bytes);

2018-08-09T10:06:50.278182+08:00 1126303 [Note] InnoDB: *** (2) TRANSACTION:

TRANSACTION 226991424, ACTIVE 1 sec starting index read, thread declared inside InnoDB 5000
mysql tables in use 1, locked 1
7 lock struct(s), heap size 1136, 6 row lock(s), undo log entries 5
MySQL thread id 1126303, OS thread handle 140243713570560, query id 640753336 192.168.10.131 today_user updating
UPDATE  `stock` SET
          `last_balance_stock` = 0 , `use_unit` = '' , `stock_num` = 11  where id=980091
2018-08-09T10:06:50.278216+08:00 1126303 [Note] InnoDB: *** (2) HOLDS THE LOCK(S):

RECORD LOCKS space id 1090 page no 525 n bits 104 index PRIMARY of table `stock_db`.`stock` trx id 226991424 lock_mode X locks rec but not gap
Record lock, heap no 33 PHYSICAL RECORD: n_fields 21; compact format; info bits 0
 0: len 8; hex 80000000000ef02f; asc        /;;
 1: len 6; hex 00000d879d40; asc      @;;
 2: len 7; hex 31000009d01e80; asc 1      ;;
 3: len 8; hex 3131363032363031; asc 11602601;;
 4: len 1; hex 81; asc  ;;
 5: len 8; hex 3230343336303439; asc 20436049;;
 6: len 0; hex ; asc ;;
 7: len 15; hex e995bfe6b299e88cb6e58fb6e89b8b; asc                ;;
 8: len 8; hex 8000000000000023; asc        #;;
 9: len 6; hex 800000000000; asc       ;;
 10: len 0; hex ; asc ;;
 11: len 8; hex 8000000000000000; asc         ;;
 12: len 6; hex 800000000000; asc       ;;
 13: len 8; hex 8000000000000000; asc         ;;
 14: len 6; hex 800000000000; asc       ;;
 15: len 1; hex 81; asc  ;;
 16: len 5; hex 99a0906bdc; asc    k ;;
 17: len 4; hex 80000001; asc     ;;
 18: len 4; hex 80000001; asc     ;;
 19: len 4; hex 5b6ba1b9; asc [k  ;;
 20: len 30; hex 202020202020202020202020202020202020202020202020202020202020; asc                               ; (total 255 bytes);

2018-08-09T10:06:50.278976+08:00 1126303 [Note] InnoDB: *** (2) WAITING FOR THIS LOCK TO BE GRANTED:

RECORD LOCKS space id 1090 page no 534 n bits 112 index PRIMARY of table `stock_db`.`stock` trx id 226991424 lock_mode X locks rec but not gap waiting
Record lock, heap no 24 PHYSICAL RECORD: n_fields 21; compact format; info bits 0
 0: len 8; hex 80000000000ef47b; asc        {;;
 1: len 6; hex 00000d879d1f; asc       ;;
 2: len 7; hex 74000009c9096a; asc t     j;;
 3: len 8; hex 3131363032363031; asc 11602601;;
 4: len 1; hex 81; asc  ;;
 5: len 8; hex 3133303230303236; asc 13020026;;
 6: len 0; hex ; asc ;;
 7: len 22; hex e4b88ae6b5b7e9b29ce88289e5a4a7e58c8531303067; asc                   100g;;
 8: len 8; hex 800000000000000c; asc         ;;
 9: len 6; hex 800000000000; asc       ;;
 10: len 0; hex ; asc ;;
 11: len 8; hex 8000000000000000; asc         ;;
 12: len 6; hex 800000000000; asc       ;;
 13: len 8; hex 8000000000000000; asc         ;;
 14: len 6; hex 800000000000; asc       ;;
 15: len 1; hex 81; asc  ;;
 16: len 5; hex 99a0907cb0; asc    | ;;
 17: len 4; hex 80000001; asc     ;;
 18: len 4; hex 80000001; asc     ;;
 19: len 4; hex 5b6ba1b9; asc [k  ;;
 20: len 30; hex 202020202020202020202020202020202020202020202020202020202020; asc                               ; (total 255 bytes);

2018-08-09T10:06:50.279778+08:00 1126303 [Note] InnoDB: *** WE ROLL BACK TRANSACTION (1)
```

### 分析死锁日志

`会话1`事务被回滚，`会话2`执行成功。

#### `会话1`

执行语句

```sql
UPDATE  `stock` SET
          `last_balance_stock` = 0 , `use_unit` = '' , `stock_num` = 36  where id=978991
```

等待主键排他锁

#### `会话2`

执行语句

```sql
UPDATE  `stock` SET
          `last_balance_stock` = 0 , `use_unit` = '' , `stock_num` = 11  where id=980091
```

等待主键排他锁

分析这两个会话处理的业务逻辑场景完全一样。死锁竟然发生在主键上，也就是说这里的死锁发生不存在锁范围和锁全表，而是精准的锁记录而发生了死锁。

单纯的看死锁日志，我们已经没有办法进行定位死锁原因了，这时候需要分析这两个会话的执行上下文。可能两个会话对同一个表的不同记录执行了多次操作。

分析会话1上下文

```
08-09 10:06:49 632 pool-7-thread-1 DEBUG [] - SQL Preparing:
           UPDATE  `stock` SET
          `last_balance_stock` = ? , `use_unit` = ? , `stock_num` = ?  where id=?  args: List(JdbcValue(0), JdbcValue(), JdbcValue(12), JdbcValue(980091))
//省略部分
08-09 10:06:50 049 pool-7-thread-1 DEBUG [] - SQL Preparing:
           UPDATE  `stock` SET
          `last_balance_stock` = ? , `use_unit` = ? , `stock_num` = ?  where id=?  args: List(JdbcValue(0), JdbcValue(), JdbcValue(36), JdbcValue(978991))
```

分析会话2上下文

```
08-09 10:06:49 839 pool-7-thread-1 DEBUG [] - SQL Preparing:
           UPDATE  `stock` SET
          `last_balance_stock` = ? , `use_unit` = ? , `stock_num` = ?  where id=?  args: List(JdbcValue(0), JdbcValue(), JdbcValue(35), JdbcValue(978991))
//省略部分
08-09 10:06:50 276 pool-7-thread-1 DEBUG [] - SQL Preparing:
           UPDATE  `stock` SET
          `last_balance_stock` = ? , `use_unit` = ? , `stock_num` = ?  where id=?  args: List(JdbcValue(0), JdbcValue(), JdbcValue(11), JdbcValue(980091))
```

### 分析原因

> 结合死锁日志和业务日志分析，我们画出两个分化的执行流程
> ![执行流程.png](https://upload-images.jianshu.io/upload_images/6393906-a7f326bcb058475c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

#### 得出结论

> 结合死锁日志和同一时刻两个会话的业务日志，我们找到了死锁根源。

**会话1**在t1时刻`update` id为`980091`的记录，同时加了`X锁`。
**会话2**在t2时刻 update id为 `978991`的记录，同时加了`X锁`。
**会话1**在t3时刻 update id为 `978991` 这条记录，等待会话2的`X锁`。
**会话2**在t4时刻 update id为 `980091`这条记录，等待会话1的`X锁`。
到这一步`会话1`和`会话2`互相等待资源，造成死锁。会话1回滚，会话2执行成功。

### 总结

这次的死锁出现原因在主键索引上是很不应该的，为什么会出现了这样的死锁，需要我们进行反思，需要对业务代码进行修改，严格意义上，我们不允许两个事务同时去操作相同的两条记录，顺序而且刚好相反。这次死锁，有幸能够在业务日志中查询到死锁上下文的sql记录，若是以后生产日志DEBUG级别关闭后，我们将无法找出死锁sql上下文，对死锁的定位会更加困难，因此，原则上，我们要在业务层面避免这样的死锁。
