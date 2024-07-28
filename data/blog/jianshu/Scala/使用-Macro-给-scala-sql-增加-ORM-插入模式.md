> 类似于 `Hibernate` 或者 `JPA`，定义一个 `case class`，例如 `Person`，然后实例化这个 `case class `后，直接调用 `dataSource.save(obj)` 或 `dataSource.saveWithSchema("person1")(obj)` 来对数据进行插入。

### 使用例子

定义一个数据源，然后创建一个 person 表，表结构如下：
![person.schema](https://upload-images.jianshu.io/upload_images/6393906-3f542f6543845cb6.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

通过程序插入：

```scala
import com.xiaomi.ad.common.db.DruidDataSourceInitializer._
import wangzx.scala_commons.sql._

object ScalaSqlSpec {
    case class Person(name: String, age: Int, firtsHobby: String, typeName: String)

    def main(args: Array[String]): Unit = {
        val p1 = Person("Walter White", 50, "cook", "White")
        val p2 = Person("Jesse Pinkman", 26, "party", "Pinkman")

        dataSource.save(p1)
        dataSource.saveWithSchema("person")(p2)
    }
}
```

执行，插入成功，日志如下：

```
5-31 15:09:53 627 main INFO - {dataSource-1} inited
05-31 15:09:53 675 main DEBUG - SQL Preparing: INSERT INTO person (name,age,first_hobby,type_name) VALUES ( ?,?,?,? ) args: List(JdbcValue(Walter White), JdbcValue(50), JdbcValue(cook), JdbcValue(White))
05-31 15:09:53 696 main DEBUG - SQL result: 1
05-31 15:09:53 697 main DEBUG - SQL Preparing: INSERT INTO person (name,age,first_hobby,type_name) VALUES ( ?,?,?,? ) args: List(JdbcValue(Jesse Pinkman), JdbcValue(26), JdbcValue(party), JdbcValue(Pinkman))
05-31 15:09:53 717 main DEBUG - SQL result: 1
```

### 实现方式

#### 1. RichDataSource 中定义 save 和 saveWithSchema

> RichDataSource 相当于是 DataSource 的增强类，提供额外的功能，通过隐式转换的模式引入到程序中，我们就可以通过普通的 DataSource类 调用到 RichDataSource中的方法。

```scala
def save[T: OrmInsert](dto: T): Int = withConnection(_.save(dto))

def saveWithSchema[T: OrmInsert](schema: String)(dto: T): Int = withConnection(_.saveWithSchema(schema, dto))
```

#### 2. RichConnection 中定义 save 和 saveWithSchema

> 同样 withConnection 会拿到 Connetion，我们利用 RichConnection 增强，然后可以调用 RichConnection 中的方法

```scala
def save[T: OrmInsert](dto: T): Int = {
        val (sql, sqlWithArgs) = implicitly[OrmInsert[T]].from(dto, None)
        val prepared = conn.prepareStatement(sql, Statement.NO_GENERATED_KEYS)

        try {
            if (sqlWithArgs != null) setStatementArgs(prepared, sqlWithArgs)

            LOG.debug("SQL Preparing: {} args: {}", Seq(sql, sqlWithArgs): _*)

            val result = prepared.executeUpdate()

            LOG.debug("SQL result: {}", result)

            result
        }
        finally {
            prepared.close()
        }
    }

    def saveWithSchema[T: OrmInsert](schemaName: String, dto: T): Int = {
        val (sql, sqlWithArgs) = implicitly[OrmInsert[T]].from(dto, Some(schemaName))
        val prepared = conn.prepareStatement(sql, Statement.NO_GENERATED_KEYS)

        try {
            if (sqlWithArgs != null) setStatementArgs(prepared, sqlWithArgs)

            LOG.debug("SQL Preparing: {} args: {}", Seq(sql, sqlWithArgs): _*)

            val result = prepared.executeUpdate()

            LOG.debug("SQL result: {}", result)

            result
        }
        finally {
            prepared.close()
        }
    }
```

#### 3.重点分析 RichConnection 新增方法

> save 和 saveWithSchema 大同小意，我们重点分析一下 save 这个方法

最关键的代码是下面这一段，其他的代码和之前的类似，没有大的变化

```scala
val (sql, sqlWithArgs) = implicitly[OrmInsert[T]].from(dto, None)
```

我们传进来的对象是 T 类型，这里利用上下文绑定的特性，将 T 绑定到 OrmInsert[T] 中，在前一篇文章中有介绍 Context-Bound 的内容。

```scala
trait OrmInsert[C] {
        def from(c: C, schemaName: Option[String]): (String, Seq[JdbcValue[_]])

        def build(c: C): (String, List[Token], Seq[JdbcValue[_]])
}
```

讲 T 绑定到 OrmInsert[T] 后，主要是通过 其 from 方法，可以对 传入的 对象 c 进行解析，然后生成插入的 sql 和 需要插入的参数 Seq[JdbcValue[_]，举个例子:

上面程序中的对象应该 p1 应该生成的 sql 和需要的参数列表如下：

```sql
INSERT INTO person (name,age,first_hobby,type_name) VALUES ( ?,?,?,? )

args: List(JdbcValue(Walter White), JdbcValue(50), JdbcValue(cook), JdbcValue(White))
```

通过 `implicitly[OrmInsert[T]]` 拿到程序上文中存在的隐式值 OrmInsert[T] ，这里我们拿到的应嘎是 trait OrmInsert 的实现类，那么这个类怎么去得到呢？

#### 4. 通过 Macro 在编译期生成 OrmInsert[T] 的实现类

首先 暴露一个 OrmInsert[T] 隐式值

```scala
implicit def materialize[C]: OrmInsert[C] = macro converterToMapMacro[C]
```

上述代码通过调用 converterToMapMacro macro 在编译期生成代码，达到此方法的过程。

```
def converterToMapMacro[C: c.WeakTypeTag](c: whitebox.Context): c.Tree = {
            import c.universe._
            val tpe = weakTypeOf[C]

            val fields = tpe.decls.collectFirst {
                case m: MethodSymbol if m.isPrimaryConstructor => m
            }.get.paramLists.head

            val (names, jdbcValues) = fields.map { field =>
                val name = field.name.toTermName
                val decoded = name.decodedName.toString

                val value = q"JdbcValue.wrap(t.$name)"
                (q"Token($decoded)", value)
            }.unzip

            val schemaName = TermName(tpe.typeSymbol.name.toString).toString.toLowerCase()

            val tree =
                q"""
                     new AbstractInsert[$tpe] {
                        def build(t: $tpe) = ($schemaName,$names,$jdbcValues)
                     }
            """
            tree
}
```

上面代码最终会生成一个 tree，这个 tree 为AST，我们只要理解它会动态的生成一段代码，这段代码会返回 AbstractInsert 的实现类，AbstractInsert为OrmInsert 的抽象类。

通过 ` val tpe = weakTypeOf[C]` 获取到类型 C 的 type 类型，此 type 类型包换了类型C 的各种信息。

拿到 tpe后，通过上述操作 拿到 这个 case class 的所有 字段名称，和字段类型，后续会将 C 类型实例传入到 OrmInsert 的build 方法中，即`def build(t: T)`,在 macro 的代码中，类型 T 我们用 `$tpe` 来具体代替，然后，我们通过 t.fieldName 的模式 即可以拿到 实例 t 当前 field 的值，那么这就好办了，我们还需要将 这个值 转换为 JdbcValue，所以在上面的代码中，使用 q"JdbcValue.wrap(t.$name)" 来达到目的。
通过 `q"Token($decoded)"` 将 field 名称包裹在 Token 中，目的主要是作驼峰与下划线的转换。

最终生成实现类如下：

```scala
new AbstractInsert[$tpe] {
       def build(t: $tpe) = ($schemaName,$names,$jdbcValues)
}
```

- `$schemaName`： 这个为 case class 的名称，在不具体指明的情况下，作为 数据库表名称
- `$names`：这个为字段 Token(filedName)，主要作后续插入数据库时的字段名称而用
- `$jdbcValues`：这里，由于在 buid 方法中传入了实例 t，直接通过 t.fieldName 的形式 拿到每个值，为后续插入数据表具体值作准备。

#### 5. 使用抽象类 AbstractInsert 来拼接插入 SQL

```scala
abstract class AbstractInsert[C] extends OrmInsert[C] {

    def from(c: C, schemaName: Option[String]): (String, Seq[JdbcValue[_]]) = {
        val (schema, tokenNames, args) = build(c)
        val useSchema = schemaName match {
            case Some(value) if value != null ⇒ value
            case None ⇒ schema
        }
        val sqlFields = tokenNames.map(_.underscoreName).mkString(",")
        val interrogation = tokenNames.indices.map(_ ⇒ "?").mkString(",")
        val sql = s"INSERT INTO $useSchema ($sqlFields) VALUES ( $interrogation )"

        (sql, args)
    }
}
```

from() 方法传入了实例 c 和数据库表名称 `schemaName`,如果没有指定将使用 case class 的类名小写。
在 from 方法中调用 macro 编译期生成的方法 `build()`，得到 schema 表名，tokeNames 表字段 list，
待插入的具体数据 Seq[JdbcValue[_]]。然后开始拼接 sql，拼接的代码比较简单，这里便不详细描述了。

这里最终会拼接出 sql，要插入的字段用 ? 表示，然后返回 拼接的 sql 串和要出入的值。

#### 6. 执行最终SQL

```scala
def save[T: OrmInsert](dto: T): Int = {
        val (sql, sqlWithArgs) = implicitly[OrmInsert[T]].from(dto, None)
        val prepared = conn.prepareStatement(sql, Statement.NO_GENERATED_KEYS)

        try {
            if (sqlWithArgs != null) setStatementArgs(prepared, sqlWithArgs)

            LOG.debug("SQL Preparing: {} args: {}", Seq(sql, sqlWithArgs): _*)

            val result = prepared.executeUpdate()

            LOG.debug("SQL result: {}", result)

            result
        }
        finally {
            prepared.close()
        }
    }
```

利用prepareStatement 来将数据最终插入到数据库中，整个过程完成。

### 总结

在 Scala-sql 中实现这种面向对象的插入模式，最主要的是，如何得到我们要出入的对象的字段和每个字段的值，但是我们事先并不知道这个对象会有多少个字段，如果按照普通模式，在运行期间也可以通过反射的模式来做到，但是这样并不优雅。

而换做使用 Macro 来做就会很优雅，我们会在编译期就直接获取到要插入的对象的所有的字段和字段对应的值，拿到了这些信息之后，拼接插入的 SQL 就会变得比较简单了。

想了解更多可[查看源码](https://github.com/leihuazhe/scala-sql)， 此工程 [fork自](<[https://github.com/wangzaixiang/scala-sql](https://github.com/wangzaixiang/scala-sql)>)
