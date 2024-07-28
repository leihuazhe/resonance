> 隐式转换和隐式参数是 `Scala` 的两个功能强大的工具。隐式转换可以丰富现有类的功能，隐式对象是如何被自动呼出以用于执行转换或其他任务的。利用这两点，我们可以提供优雅的类库。

本文将通过几个示例代码来整体学习一下 `Scala` 隐式转换的四个特性和运用。它们分别是 隐式函数运用、隐式类扩展运用、隐式参数、类型类(`Type class`)运用。

## 隐式转换

> implicit conversion function：指的是那种以 `implicit` 关键字声明的带有单个参数的函数。这样的函数将被自动应用，将值从一种类型转换为另一种类型。

### 隐式函数 Implicit Function

- 定义隐式函数，提供将 `LocalDate` 根据指定 `format` 转换为 `String` 的功能

```scala
package object implict {
    private val formatterNormal: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    implicit def dayIntFormatter(date: LocalDate): String = date.format(formatterNormal)
}

```

- 因为上面的隐式函数定义在 package object 中，如果在同包下的测试类，则不需要 import 上面的隐式函数，直接使用即可。

```scala
 def main(args: Array[String]): Unit = {
        val localDate = LocalDate.now()
       //自动将 localDate 类型的时间转为 String 类型，并调用函数成功
        val data = getDataByStringdate(localDate)
}

def getDataByStringdate(date: String): String = {
      "Test Data"
}
```

### 隐式类-对目标对象进行功能扩展

定义一个 `case class` 类 `Multiply`，并定义一个方法 `multiply` ，接收一个当前对象，并将值相乘后返回。
定义隐式转换函数 `int2Multiply`

```scala
case class Multiply(m: Int, n: Int) {

    def multiply(other: Multiply): Multiply = {
        Multiply(other.m * m, other.n * n)
    }
}
object MultiplyImplicit {
     //定义隐式转换函数，参数单个，将 int 隐式转换为 Multiply 对象
    implicit def int2Multiply(n: Int): Multiply = Multiply(n, 2)
}
```

测试类 `MultiplyMain`

```scala
object MultiplyMain {
  //导入隐式转换方法（局部引用可以避免不想要的隐式转换发生）
  import com.maple.implic.one.MultiplyImplicit._

  def main(args: Array[String]): Unit = {
    val x: Multiply = 3.multiply(Multiply(2, 1))
    println(x.toString)
  }
}
```

- 运行程序结果如下:

```
结果为：Multiply(6,2)
//计算过程，3 隐式转换为 Multiply(3, 2)
3 => Multiply(3, 2)
//调用multiply计算
Multiply(3, 2).multiply(Multiply(2, 1)) =Multiply( 3*2 , 2*1 )
```

如果我们提供多个隐式转换函数

```scala
object MultiplyImplicit {
  implicit def int2Multiply(n: Int): Multiply = Multiply(n, 2)
  //提供第二个隐式转换函数
  implicit def int2Multiply2(n: Int): Multiply = Multiply(n, 3)
}
```

在 `Main` 中，我们可以通过两种方式进行指定具体使用哪个隐式转换函数。
比如我们选择使用 `int2Multiply`的隐式转换

```scala
object MultiplyMain {
  //方法1: 排除 int2Multiply2 方法，引入其余所有的方法
  import com.maple.implic.one.MultiplyImplicit.{int2Multiply2 ⇒ _, _}
 // 方法2: 精确引入
  import com.maple.implic.one.MultiplyImplicit.int2Multiply

  def main(args: Array[String]): Unit = {
    val x: Multiply = 3.multiply(Multiply(2, 1))
    println(x.toString)
  }
}
```

### 隐式类，丰富现有类库功能

> 你是否希望某个类拥有新的方法，而此方法该类并没有提供，那么隐式转换可以丰富这个类，给它提供更多的方法

例如数据库连接类 `Connection`, 我们希望给它新增一个 `executeUpdate` 方法来对数据进行修改，例子如下:

```scala
package com.maple.implic.two

import java.sql.Connection
import scala.language.implicitConversions
//隐式类，Rich表示对Connection的增强类
class RichConnection(conn: Connection) {
  //定义的新方法 executeUpdate，对数据操作
  def executeUpdate(sql: String): Int = {
    conn.prepareStatement(sql).executeUpdate()
  }
}
//提供隐式转换 func 来将原有类型转换为Rich 类型
object RichConnection {
  implicit def executeUpdate(connection: Connection) = new RichConnection(connection)
}
```

测试程序

```scala
object ConnectionMain {
  //引入隐式转换 func
  import com.maple.implic.two.RichConnection._

  def main(args: Array[String]): Unit = {
    //定义 dataSource
    val ds: DataSource = {
      val ds = new MysqlDataSource
      ds.setURL("jdbc:mysql://127.0.0.1:3306/maple?useUnicode=true&characterEncoding=utf8")
      ds.setUser("root")
      ds.setPassword("123456")
      ds
    }
    //获取 conn
    val connection = ds.getConnection
    //执行查询
    connection.executeUpdate("UPDATE t_user SET name = 'maple' WHERE id = 1")
  }
}
```

上面通过定义一个 `RichConnection` 我们可以增强现有类 `Connection` 的功能。这样一来，通过 `connection` 对数据库进行增删改查，可以简化大量代码。

### 隐式参数

> 函数或方法可以带有一个标记为 `implicit` 的参数列表。在这种情况下，编译器将会查找默认值，提供给本次函数调用。

### 利用隐式参数进行隐式转换

> 隐式的函数参数也可以被用作隐式转换。如果我们定义一个泛型函数

```scala
def larger[T](x: T, y: T) = if (x > y) x else y
```

## ![ex.png](https://upload-images.jianshu.io/upload_images/6393906-98ae4bd56e64e4de.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/800)

关于隐式参数的另一件事是，它们可能最常用于提供有关在早期参数列表中显式提到的类型的信息，类似于Haskell的类型类。作为示例，请考虑清单21.2中所示的maxListUpBound函数，该函数返回传递列表的最大元素

```scala
def maxListUpBound[T <: Ordered[T]](elements: List[T]): T = {
    elements match {
      case List() =>
        throw new IllegalArgumentException("empty list!")
      case List(x) => x
      case x :: rest =>
        val maxRest = maxListUpBound(rest)
        if (x > maxRest) x
        else maxRest
    }
}
```

`maxListUpBound` 表示传入一个 `List`，然后返回 `list` 中最大的一个元素。功能简单，但是用法十分限制，该List中的成员必须是 `Ordered[T]` 的子类，否则就会报错。比如我们运行如下例子

```scala
object ImplicitParameterMain {
  import com.maple.implic.three.ImplicitParameter._
  def main(args: Array[String]): Unit = {
    val result = maxListUpBound(List[Integer](1, 2, 3))
    println(result)
  }
}
```

当我们运行 `main` 函数时，编译器会报如下错。意思是 `Int` 不是 `Ordered[T]` 子类，因此无法使用。

```
Error:(49, 18) inferred type arguments [Int] do not conform to method maxListUpBound's type parameter bounds [T <: Ordered[T]]
    val result = maxListUpBound(List[Int](1, 2, 3))
Error:(49, 42) type mismatch;
 found   : List[Int]
 required: List[T]
    val result = maxListUpBound(List[Int](1, 2, 3))
```

#### 使用隐式参数优化

> 如果让 `maxListUpBound` 更通用，我们需要分离这个函数，增加一个参数，来将 `T` 转换为 `Ordered[T]`，使用隐式参数 `implicit orders: T ⇒ Ordered[T]`来做到这一点。

```scala
def maxListUpBound2[T](elements: List[T])(implicit orders: T ⇒ Ordered[T]): T = {
    elements match {
      case List() =>
        throw new IllegalArgumentException("empty list!")
      case List(x) => x
      case x :: rest =>
        val maxRest = maxListUpBound2(rest)
        if (x > maxRest) x
        else maxRest
    }
  }
```

测试程序：

```scala
import com.maple.implic.three.ImplicitParameter._

def main(args: Array[String]): Unit = {
    val result = maxListUpBound2(List[Int](1, 2, 3))
    println(result)
}
```

结果为3，并没有报错。这其中编译器是将 `Int` 转换为了 `Ordered[Int]`

### 类型类(type class)

> 让某个类拥有某个算法，我们无需修改这个类，提供一个隐式转换即可。这种做法相对于面向对象的继承扩展来的更灵活。

看下面两个例子，`Ordering` 是 `Scala` 提供的类型类

```scala
object Implicits {

  implicit class OrderedExt[T: Ordering](v: T) {
      def between(min: T, max: T) = {
        val ordering = implicitly[Ordering[T]]
        ordering.lteq(min, v) && ordering.lteq(v, max)
      }
   }

  implicit class OrderedExt2[T](v: T)(implicit ordering: Ordering[T]) {
    def between2(min: T, max: T) = {
      ordering.lteq(min, v) && ordering.lteq(v, max)
    }
  }
}
```

使用，上面两种写法都可以达到相同的功能。

```scala
import com.maple.implic.Implicits._
def main(args: Array[String]): Unit = {
    val isBetween = 10.between(2, 20)
    val isBetween2 = 30.between2(2, 20)
    println(isBetween)
    println(isBetween2)
}
```

`Ordering` 这样的特质(`trait`) 被称为类型类(`type class`，源自 `Haskell`) 。类型类定义了某种行为，任何类型都可以通过提供相应的行为来加入这个类。这个类是因为共用的目的而组合在一起的类型。

### 自定义类型类

> `Scala` 标准类库提供了不少类型类。比如 `Equiv`、`Numeric`、`Fractional`、`Hashing`、`IsTraverableOne`、`IsTraverableLike` 等。我们通过自定义一个类型 `CustomOperation` 来更深入的学习。

**定义特质 `CustomOperation`**

```scala
trait CustomOperation[T] {
  // 加操作
  def plus(x: T, y: T): T
  // 乘操作
  def multiply(x: T, y: T): T
}
```

在伴生对象中给 String 类型扩展基于 `CustomOperation` 的功能。

```scala
object CustomOperation {

  implicit object StringCustomOperation extends CustomOperation[String] {
    override def plus(x: String, y: String): String = x + y

    override def multiply(x: String, y: String): String = x + "*" + y
  }

  //定义隐式类,对 `String` 进行增强
  implicit class CustomImplicitClass[T: CustomOperation](v: T) {

    def multiply(x: T, y: T): T = {
      //从冥界召唤的CustomOperation[T]隐式类型。
      val custom = implicitly[CustomOperation[T]]
      custom.multiply(v, x) + "+" + custom.multiply(v, y).toString
    }
    //另外一种写法
  /* def multiply(x: T, y: T)(implicit custom: CustomOperation[T]): String = {
      custom.multiply(v, x) + custom.multiply(v, y).toString
    }*/


    def plus(x: T, y: T): String = {
      val custom = implicitly[CustomOperation[T]]
      custom.plus(v, x) + custom.plus(v, y).toString
      //      custom.plus(x, y)
    }
  }
}
```

**测试类 `CustomOperationMain`:**

```scala
import com.maple.implic.typeclass.CustomOperation._
object CustomOperationMain {
 //
  def main(args: Array[String]): Unit = {
    val str: String = "maple".plus("<", ">")
    println(str)
  }
}
```

结果如下:

```scala
maple<maple>
//隐式转换的运算过程为
 custom.plus(v, x) + custom.plus(v, y).toString
 override def plus(x: String, y: String): String = x + y
```

如果想要对 `Double` 支持上述操作，同样定义如下类型类扩展即可：

```scala
implicit object DoubleCustomOperation extends CustomOperation[Double] {
    override def plus(x: Double, y: Double): Double = x + y

    override def multiply(x: Double, y: Double): Double = x * y
  }
```

测试用例：

```scala
import com.maple.implic.typeclass.CustomOperation._
def main(args: Array[String]): Unit = {
    val doubleValue = 5.5.multiply(2.0, 3.0)
    println(doubleValue)
}
```

结果为 `11.0+16.5`
计算过程：

```
custom.multiply(v, x) + "+" + custom.multiply(v, y).toString
override def multiply(x: Double, y: Double): Double = x * y
//相乘后字符串相加
5.5*2.0 + 5.5*3.0 ===>  11.0+16.5
```

### Type Class 总结

`TypeClass` 将 **行为定义** 与 **具有行为的对象** 分离。有点类似于 `AOP`，但是比 `AOP` 简洁很多。同时, 在函数式编程中，通常将 **数据** 与 **行为** 相分离，甚至是数据与行为按需绑定，已达到更为高级的组合特性。

### 隐式转换触发时机

`Scala` 会考虑如下的隐式转换函数：

- 1.位于源或目标类型的伴生对象中的隐式函数或隐式类。
- 2.位于当前作用域中可以以单个标识符指代的隐式函数或隐式类。
  隐式转换可以显示加上，来进行代码调试。

### 总结

本文主要介绍 `Scala` 隐式转换的几种用法，通过详细的例子加深读者对隐式转换的理解。关于隐式转换的触发时机以及编译器优化顺序等，将不在本篇文章详细介绍，可以关注笔者后续文章。

### 推荐

最后推荐一下本人微信公众号，欢迎大家关注。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-47e180d949563b81.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
