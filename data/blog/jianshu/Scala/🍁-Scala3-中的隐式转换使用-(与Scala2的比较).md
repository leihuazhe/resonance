> 最近看了下Scala3的新特性，发现其改动特别大，新特性非常多。笔者将按照自己的学习来总结一些 Scala3 的使用技巧。

# Scala2 中的隐式转换

详细请看下面这篇文章：https://www.jianshu.com/p/1ed068a0239d

# given 代替 implicit

## 隐式转换 LocalDateTime 参数为 String

> 正常情况下，如果没有隐式转换，一个接收 string 参数的方法是不能接收 LocalDateTime 参数的。下面例子将会实现一个转换，让类型为 LocalDateTime 的参数可以
> 隐式的转换为 string 参数。

### Scala2写法

```scala
private val formatterNormal: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
implicit def dayIntFormatter(date: LocalDate): String = date.format(formatterNormal)

def main(args: Array[String]): Unit = {
        val localDate = LocalDate.now()
       //自动将 localDate 类型的时间转为 String 类型，并调用函数成功
        val data = getDataByStringdate(localDate)
}
def getDataByStringdate(date: String): String = {
      "Test Data"
}
```

### Scala3写法

```scala
object Implicits:
  val formatterNormal: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")

given Conversion[LocalDateTime, String] with
  override def apply(datetime: LocalDateTime): String = formatterNormal.format(datetime)

//Main 测试类
def main(args: Array[String]): Unit = {
    testLocalDataTimeConversion(LocalDateTime.now())
    testMultiply()
    //testMaxListUpBound()
  }
def testLocalDataTimeConversion(dateTime: LocalDateTime) = {
    printStringDateTime(dateTime)
}

private def printStringDateTime(dateTime: String) = println(s"Now time is $dateTime")
```

可以看到 Scala3 是通过 given ... with ... 的语法来实现转换的。
