### 背景

本文使用的 [scala-sql](https://github.com/wangzaixiang/scala-sql) 是一个轻量级的 scala jdbc 库，它是一个简单的JDBC的封装，以提供类型安全的、简洁的scala API。整体使用上非常方便快捷，不输 scala 专有的数据层 框架 slick、quill 等。

下面的问题是基本上是因为一个Scala类型系统上的一处问题而产生的，这个错连IDEA都无法判断了，然后编译确实能够通过的，充分说明 Scala 的类型系统的复杂性。

使用scala 进行 query 即 rows 操作时，比如下面这段

```scala
// Rows 的 case 类，主要用来接收数据库查询出来数据的实体
case class MetricsCustomer(
metricDate: String, orders: Int,customerId: Long,
appName: String,  companyName: String,  createTime: DateTime
)


val data = scalaSqlDB.rows[MetricsCustomer](sql)
```

`rows` 的核心代码如下:

```scala
def rows[T : ResultSetMapper](sql: SQLWithArgs): List[T] = withPreparedStatement(sql.sql) { prepared =>
    val buffer = new ListBuffer[T]()
    if (sql.args != null) setStatementArgs(prepared, sql.args)

    val rs = prepared.executeQuery()
    // val rsMeta = rs.getMetaData
    while (rs.next()) {
     //核心代码，得到上下文中ResultSetMapper类型的隐式值
      val mapped = implicitly[ResultSetMapper[T]].from(rs)
      buffer += mappedde

    }
    LOG.debug("SQL result: {}", buffer.size)
    buffer.toList
  }
```

重点看核心代码`val mapped = implicitly[ResultSetMapper[T]].from(rs)`，得到上下文中`ResultSetMappe`类型的隐式值，找到的应该是如下这个结果：

```
object ResultSetMapper {
    implicit def material[T]: ResultSetMapper[T] = macro Macros.generateCaseClassResultSetMapper[T]
  }
```

这里进入到了 `macro`，调用macro方法 `generateCaseClassResultSetMapper`, 经过 `macro` 的一系列操作后，生成的 tree 如下(macro具体细节略)

```
{
  import wangzx.scala_commons.sql._;
  import java.sql.ResultSet;
  {
    final class $anon extends CaseClassResultSetMapper[com.maple.scala.scalasql.MetricsCustomer] {
      def <init>() = {
        super.<init>();
        ()
      };
      val metricDate = Field[String]("metricDate");
      val orders = Field[Int]("orders");
      val customerId = Field[Long]("customerId");
      val appName = Field[String]("appName");
      val companyName = Field[String]("companyName");
      val createTime = Field[org.joda.time.DateTime]("createTime");
      override def from(arg: ResultSet): com.maple.scala.scalasql.MetricsCustomer = {
        val rs = new ResultSetEx(arg);
        new com.maple.scala.scalasql.MetricsCustomer(metricDate(rs), orders(rs), customerId(rs), appName(rs), companyName(rs), createTime(rs))
      }
    };
    new $anon()
  }
}
```

### Context Bounds

> `Scala 2.8` 允许隐式参数的简写语法，称为 `Context Bounds`。 简而言之，一个类型参数为 `A` 的方法需要 `M [A]` 类型的隐式参数

定义一个 `foo` 函数，泛型为`A`，有一个隐式参数，接收的额是一个为 `M[A]` 的对象

```
def foo[A](implicit ma: M[A])
```

可以简写成

```
def foo[A: M]
```

在 `Scala sql` 中看到了 `Field` 的定义

```
case class Field[T: JdbcValueAccessor](name: String, default: Option[T] = None) {...}

trait JdbcValueAccessor[T] {
    def passIn(stmt: PreparedStatement, index: Int, value: T)
    def passOut(rs: ResultSet, index: Int): T
    def passOut(rs: ResultSet, name: String): T
}
```

等价于下面这种写法：

```
case class Field[T](implicit jdbc: JdbcValueAccessor[T])(name: String, default: Option[T] = None)
```

`JdbcValueAccessor[T]` 已经有了各种数据库类型的实现类了，包括 `String`,`Int`,`Double`,`Timestamp`等等。

所以上述通过 macro的代码，我复制到idea后发现如下问题
![微信图片_20190510193245.png](https://upload-images.jianshu.io/upload_images/6393906-848adbb4df0ac6fd.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

而看 Field的定义,下面的Field的定义中，T确实和ResultSetMapper的T 类型一致。

```scala
abstract class CaseClassResultSetMapper[T] extends ResultSetMapper[T] {

    // cammel case mapping support such as userId -> user_id, postURL -> post_url
    case class Field[T: JdbcValueAccessor](name: String, default: Option[T] = None) {

    }
  }
```

## 问题

那么我的问题是，这样如何将Field 所需要的 对象类型(本文中是我自己定义的MetricsCustomer类型)，转换为每个Field 自己的 所属类型呢？比如 String，Int等，这里是如何做到的？
