> 近期业务出现了一个需求，需要对一个相同实体的List中，部分实体名和id相同的元素进行合并，将其合并为一个实体，以便在业务上做统计处理，合并后的实体为合并前的实体的某些数值相加。
> 此需求催生了本篇文章。我们将抽象一个简单的实体来介绍，**如何在Scala List 中合并部分Element 元素。**

### 定义业务实体对象 MergeInfo

> 定义一个包含 `name` 和收入数据的实体对象，当判断两个实体的 `name` 相同时，我们决定对其进行合并操作，将两个实体的 `fee` 进行累计，完成合并。
> 其中 `diff` 方法定义了当传入的 `target` 对象 `name` 与源对象的 `name` 相同时，返回 `true`，否则返回 `false`。
> 而 `merge` 操作则是当上一步 `diff` 返回 `true` 时，我们会采取的合并操作的具体逻辑。

```scala
case class MergeInfo(name: String, fee: Double) {

    //要比较的目标对象,根据什么条件确定是否需要merge
    def diff(target: MergeInfo): Boolean = {
        name == target.name
    }

    //定义合并操作
    def merge(target: MergeInfo): MergeInfo = {
        MergeInfo(name, fee + target.fee)
    }

}
```

### 使用尾递归遍历 List 并进行合并

> 实体逻辑定义完成后,我们通过使用尾递归的模式来遍历给定的 `List`，
> 并使用 `matching pattern` 模式来进行合并前的判断和合并操作，
> 使用迭代器和累加器将遍历变为尾递归的形式，优化遍历的性能。

- 使用尾递归模式遍历 List,优化性能。
- 使用 `matching pattern` 来判断和合并元素。
- 使用 **隐式转换** 特性，使使用此操作变得更为简单和优雅。

```scala
object Utils {
    /**
      * Merging elements in a Scala List
      */
    implicit class ElementMergeOfList(value: List[MergeInfo]) {

        def merge: List[MergeInfo] = {
            @tailrec
            def process(in: List[MergeInfo], accum: List[MergeInfo]): List[MergeInfo] = {
                in match {
                    case x :: y :: ys if x.diff(y) => process(x.merge(y) :: ys, accum)
                    case x :: xs => process(xs, x :: accum)
                    case Nil => accum
                }
            }
            process(value, Nil).reverse
        }

    }
}
```

程序解释：

- in 输入的源List，待处理和合并。
- accum 累加器，每次遍历处理以此List中的元素，并将处理后的元素放入 accu 累加器中
- `x :: y :: ys` 这是`Scala`语法中对 List组成的一种描述， x，y 均为单个元素，ys 属于尾部，为剩余的 List元素。

### 测试程序

```scala
/**
* 将上述隐式转换类引入进来
*/
object MergeElementSpec {

    def main(args: Array[String]): Unit = {
        test1()
    }

    def test1(): Unit = {
        val mergeInfoList = List(MergeInfo("annual", 12.5),
            MergeInfo("Balance", 14.3), MergeInfo("Balance", 15.7),
            MergeInfo("Call", 21.2), MergeInfo("Call", 0.3),
            MergeInfo("Date", 45.4), MergeInfo("Element", 24)
        )

        val mergedResult: List[MergeInfo] = mergeInfoList.merge

        println(s"merge 前元素 size: ${mergeInfoList.size}, merge 后元素 size: ${mergedResult.size}")
        println(s"merge 后元素详情: $mergedResult")
    }

}
```

运行测试类，结果如下：

```log
merge 前元素 size: 7, merge 后元素 size: 5

merge 后元素详情：List(MergeInfo(annial,12.5),MergeInfo(Balance,30.0),MergeInfo(Call,12.5),MergeInfo(Date,45.4),MergeInfo(Element,24.0))

```
