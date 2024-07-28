## 1.多条件过滤

> 使用尾递归的形式对给定值和多个 filter 条件来进行过滤，只要满足其一，即可返回 true

### 尾递归条件过滤 func

```scala
def filter(key: String, conditionList: List[String], op: (String, String) => Boolean): Boolean = {
    @tailrec
    def filterBy(key: String, conditionList: List[String], index: Int, op: (String, String) => Boolean): Boolean = {
      if (index >= conditionList.length) false
      else if (op(key, conditionList(index))) true
      else filterBy(key, conditionList, index + 1, op)
    }

    filterBy(key, conditionList, 0, op)
  }
```

### 使用例子

> 该例子给定一个 String List，然后给定多个过滤条件，只要满足其一，即可返回 true。这样判断list中的元素是否以给定的条件开头作为过滤条件。

```scala
val list = List("ab","abc","abcd")
val conditions = List("ab","ac")

list.map {
  r =>
     if (filter(r, conditions, (k, c) => k.startsWith(c))) {
         Option(r)
     } else None
}.filter(_.isDefine).map(_.get)
```

## 2.优雅的遍历 Map

> 当我需要对集合的元素进行转换时，自然而然会使用到map方法。
> 当我们在对 tuple 类型的集合或者针对 Map 进行map操作时，通常更倾向于在 map 方法中使用 case 语句，这比直接使用\_1与\_2更加可读。例如：

```scala
val languageToCount = Map("Scala" -> 10, "Java" -> 20, "Ruby" -> 5)
languageToCount map { case (_, count) => count + 1 }
```

然而对于上述场景，其实我们也可以使用collect方法：

```
languageToCount collect { case (_, count) => count + 1 }
```

效果完全相同。

---

给定一个 Map 数据

```
val giveMap = Map("a"->"b","c"->"d","e"->"f","g"->"h","i"->"j")
```

我们一般最常用的方式如下：

```scala
giveMap.foreach {
   r =>
    println(s"key: ${r._1}, value: ${r._2}")
}
```

更优雅的方式，使用 case 偏函数。这样可以直观的将 key 和 value 写出来，而不需要像上一个例子那样以元祖的方式展现，更直观和好懂。

```scala
giveMap.foreach {
   case (key,value) =>
    println(s"key: $key, value: $value")
}
```

还有一种不常用的遍历方式

```
//However it requires explicit type annotations.
giveMap.map(((k: String, v: String) => {
     println(s"key: $key, value: $value")
}).tupled)
```

综上，在我们一般 map 或者 foreach Map时，采用case 偏函数的方式会更加优雅和直观，推荐使用。

## 3.对 Map 转换时使用 mapValues

给定一个 Map 数据如下，其中的 value 为一个二元元祖，我们需要将此Map 中Value值中的时间戳去除掉，代码如下。

使用 mapValues 对 value 值进行处理

```scala
val giveMap = Map("a" → (5L, "b"), "c" → (1L, "d"), "e" → (8L, "f"), "g" → (4L, "h"))
//一步搞定
val result: Map[String, String] = giveMap.mapValues(_._2)
```

## 4.反转一个已经排好序的 Set

> Set 没有 reverse 方法，因此需要我们自己来进行反转

优雅的方式如下

```scala
//创建 sortedSet 返回值应该从小到达拍好
val value = SortedSet(1, 2, 3, 5, 4, 8, 7, 2, 9)
//转为Int，并进行反转
val result = value.foldLeft(List[Int]())((x, y) => y :: x)
```

## 5. Par 并行化集合 transfer

> 使用 `par` 后，`scala` 中的集合遍历会并行进行，这样如果在需要并行遍历和处理的业务上就能比较简单的使用 `par` 来解决，而不需要复杂的 `future` 的编程模型

```scala
def test3(): Unit = {
    val costMap = Map("1" -> Task("1", 1), "2" -> Task("2", 2), "3" -> Task("3", 3))

    val begin = System.currentTimeMillis()

//在这里进行 map 操作之前 加入 par 并行化遍历
    val listOfResults: List[String] = costMap.par.map {
      case (x, task) => {
        Thread.sleep(task.cost * 1000)
        task.name
      }
    }.toList
    println(s"结果耗时： ${System.currentTimeMillis() - begin}")

    listOfResults foreach println

  }
```

我们比对一下没有 par 和有 par 操作的结果耗时

```
有 par 结果耗时: 3081ms
普通遍历结果耗时: 6009ms
```

总结：par 并行化遍历可以将集合中的元素遍历并行化，整体处理时间由最长的一个元素遍历时间而决定，比如上例中的最大任务是睡眠3s，则最终遍历时间就在3s左右。

## 6. Future

### 1.阻塞等待一个 Future

> 阻塞等待一个 Future,Scala 如果要及时获取到 Future结果，变异步为同步时，则采用下面这种方法。注意 import 相关包

```scala
package com.maple.scala.feature

import scala.concurrent.{Await, Future}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._
import scala.language.postfixOps
/**
  * Copyright (c) 2018 XiaoMi Inc. All Rights Reserved.
  * Authors: Maple <leihuazhe@xiaomi.com> on 19-2-21 17:23
  */
object FutureAwait {
  def main(args: Array[String]): Unit = {
    val res = Future {
      Thread.sleep(2000)
      println("----process message end ----")
      "我是结果"
    }
    println("future 在执行，程序继续执行")

    //核心代码
    val result = Await.result(res,5 second)

    println(s"返回结果 $result")
  }
}
```

### 2. List[Future[T]] -> Future[List[T]]

> 如果我们在进行遍历操作时，每一行都返回一个 Future，这样我们整个操作最终会形成一个 List 的 future 集合，这时我们需要反转为 Future 的 list，只存在一个 Future 比较好处理结果。

```scala
def test1(): Unit = {

    val costMap = Map("1" -> Task("1", 1), "2" -> Task("2", 2), "3" -> Task("3", 3))
    val begin = System.currentTimeMillis()

    val listOfFutures: Seq[Future[String]] = costMap.map {
      case (x, task) => {
        Future {
          Thread.sleep(task.cost * 1000)
          task.name
        }
      }
    }.toList

    val futureOfList:Future[List[String]] = Future.sequence(listOfFutures)

    futureOfList onComplete {
      case Success(x) => {
        val end = System.currentTimeMillis()
        println(s"结果 $x, 耗时： ${end - begin}")
      }
      case Failure(ex) => println("Failed !!! " + ex)
    }

    Thread.sleep(Long.MaxValue)
  }
```

## 7.符号 @ 的用法 (scala symbol @ meaning)

> The effect of the @ operator is to alias the value matched on the left to the name on the right for the match.

@运算符的作用是将@后面的值赋值给@前面的这个对象，类似于一种 alias的方法

例如：

```scala
 def test(): Unit = {
        val p = Option(2)

        p match {
            case x@Some(_) ⇒ println(x) //Some(2)
            case None ⇒ println("None")
        }
}
```

上面的运算符 `x@Some(_)` 是将后面的值 `Some(_)` 赋值给了 x，所以 x 的值为 Some(2)

再比如下面几个例子：

```scala
def test(): Unit = {
        val d@(c@Some(a), Some(b)) = (Some(1), Some(2))

        println(s"a: $a, b: $b, c: $c, d: $d")
        //值分别为：   a: 1, b: 2, c: Some(1), d: (Some(1),Some(2))

        (Some(1), Some(2)) match {
            case d@(c@Some(a), Some(b)) => {
                println(a, b, c, d)
               //值分别为：   1,2,Some(1),(Some(1),Some(2))
            }
        }

        for (x@Some(y) <- Seq(None, Some(1))) {
              println(x, y)
              //值分别为(Some(1),1)
        }

        val List(x, xs@_*) = List(1, 2, 3)
        println(x, xs)
       //值分别为：(1,List(2, 3))

}
```
