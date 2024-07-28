### 1. 什么是 cube ？

> Cube 称为多维立方体
> 什么是Cuboid？什么是Cube？什么是Segment？

我们这里简单说，比如你的模型有3个维度：

国家，省，市。

那么对于维度的每一种组合，比如 “国家，省，市” 查询的结果就是一个Cuboid，
“国家，省” 查询的结果是另一个 `Cuboid`。

那么 `Cube` 就是上面所有维度组合的 `Cuboid` 的集合。

我们知道Cube的数据来源可以是Hive，那么对于一些Hive的表中的数据是不断增长的，比如每小时或每天等周期增长。Kylin应对这种场景，引入了增量构建Cube的功能，无需重复地处理之前已经处理过的历史数据，提升Cube的构建速度。

#### Segment

到这里，这样我就可以顺理成章地抛出Segment的概念，即一个Segment就是使用指定起始和结束时间的数据来源构建Cube，**即代表一段时间内源数据的预计算结果**。

我们不难推断出一个 `Cube` 被划分为多个 `Segment`。一个 `Segment` 的起始时间等于它之前那个 `Segment` 的结束时间，同理，它的结束时间等于它后面 `Segment` 的起始时间。每个 `Segment` 除了数据源时间范围不同，其他结构定义，构建过程，优化方法，存储方式等一样。

### 2. Cuboid 分析

`Apache Kylin` 提供了一个工具，用来检查 `Cube` 中 `Cuboid` 的详细信息。下面我们将具体分析如何使用此工具，以及分析产生的结果。

更多内容：https://blog.csdn.net/jiangshouzhuang/article/details/77926440
