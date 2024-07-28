> 官方文档详见: https://docs.scala-lang.org/scala3/reference/contextual/index.html

Context Abstactions，抽象上下文，Scala3的核心。它可以显著的节省代码，并且提升 Scala3 的编程简洁性和优越性。也是Scala3 难学的核心点。它主要包括：

- Given Instances
- Using Clauses
- Context Bounds
- Importing Givens
- Extension Methods
- ...
  我们将一一进行学习。

## 1.Given Instances

定义 `Ord[T]` trait

```scala
trait Ord[T]:

  def compare(x: T, y: T): Int

  extension (x: T) def less(y: T) = compare(x, y)  < 0
  extension (x: T) def great(y: T) = compare(x, y)  > 0
```

使用 given 实现

```scala
given intOrd: Ord[Int] with
  override def compare(x: Int, y: Int): Int =
    if x < y then -1 else if x > y then +1 else 0

given listOrd[T] (using ord: Ord[T]): Ord[List[T]] with
  def compare(xs: List[T], ys: List[T]): Int = (xs, ys) match
    case (Nil, Nil) => 0
    case (Nil, _) => -1
    case (_, Nil) => +1
    case (x :: xs1, y :: ys1) =>
      val fst = ord.compare(x, y)
      if fst != 0 then fst else compare(xs1, ys1)
```

As it mentioned above, 我们实现了 int 类型 和 list 类型的 given 实例。简单测试一下：

```scala
  @main def test() =
    val a = 13
    val b = 18
    println(s"a>b ? ${a great b}")

    val as = List(1, 3, 5)
    val bs = List(2, 3, 5)
    println(s"as>bs ? ${as great bs}")
```

可以运行成功。

given instances 还有另外一种写法，即不带 with。

```scala
case class IntOrd() extends Ord[Int] {
  override def compare(x: Int, y: Int): Int =  if x < y then -1 else if x > y then +1 else 0
}

case class ListOrd[T]()(using ord: Ord[T]) extends Ord[List[T]] {
  override def compare(xs: List[T], ys: List[T]): Int = (xs, ys) match
    case (Nil, Nil) => 0
    case (Nil, _) => -1
    case (_, Nil) => +1
    case (x :: xs1, y :: ys1) =>
      val fst = ord.compare(x, y)
      if fst != 0 then fst else compare(xs1, ys1)
}

given intOrd: Ord[Int]  = IntOrd()
given listOrd[T] (using ord: Ord[T]): Ord[List[T]]  = ListOrd()
```

比较 given...with 和 given= 语法,我们发现，前者是给出实例的同时，实现该实例子。而后者是直接给出已经实现的实例。

### 推荐写法

1.将 extension 等信息定义在 trait 中。2.在其他文件中提供 extension 中的方法实现,使用 `given` 形式给出。
3.trait 定义和 given 实现实例在一个 `package` 下。

## 2.Using Clauses

> 函数式(Functional programming) 编程倾向于将大多数依赖关系表示为简单的函数参数化。这样简单又高效，但有时会在定义函数时，会导致函数定义许多参数，其中相同的值在长调用链中一遍又一遍地传递给下一个函数。
> 如何避免这种场景？我们可以使用 上下文参数(`Context parameters`)。
> 编译器可以合成上下文参数，而不需要我们在编写代码的时候显示的去进行传递。

比如下面这个例子：

```scala
def max[T](x: T, y: T)(using ord: Ord[T]): T =
  if ord.compare(x, y) < 0 then y else x
```

`ord` 是一个上下文参数，它通过 using 语法描述， max 方法可以通过以下代码进行调用：

```scala
max(2,3)(using intOrd)
```

(using intOrd) 部分将 intOrd 作为参数传递给 max 方法。但是这个语法的重点是，上下文参数 ord 可以被省略，我们也通常这样去使用。所以一般来讲我们会这样调用：

```scala
@main def main() = {
  max(2, 3)
  max(List(1, 2, 3), Nil)
}
```

### 匿名上下文参数 Anonymous Context Parameters

即上下文参数的name 可以被省略，例如以下代码中，Ord[T] 没有定义它的name，区别于上一节代码如 `using ord:Ord[T]`。

```scala
def maximum[T](xs: List[T])(using Ord[T]): T =
  xs.reduceLeft(max)
```

maximun 拥有一个上下文参数类型 `Ord[T]`，它仅被当作推断参数传递给了 maximun 方法，而其参数 name 被省略了。
通常来说，上下文参数要么以 `(p_1:T_1)` 方式出现，要么以 `(T_1)` 方式出现。

### 类的上下文参数 Class Context Parameters

如果通过添加 val 或 var 修饰符使上下文参数称为类的成员，那么这个成员可作为 given instance 使用。

比较下面两段代码，

```scala
class GivenIntBox(using val givenInt: Int):
  def n = summon[Int]

class GivenIntBox2(using givenInt: Int):
  given Int = givenInt
  //def n = summon[Int] // ambiguous
```

类里的 given member 成员是可导入的,看以下例子：

```scala
val b = GivenIntBox(using 23)
import b.given
summon[Int]  // 23

import b.*
//givenInt // Not found
```

### 方法多个 using 语法

```scala
def f(u: Universe)(using ctx: u.Context)(using s: ctx.Symbol, k: ctx.Kind) = ...
```

应用层熟会从左到右进行匹配。

```scala
object global extends Universe { type Context = ... }
given ctx : global.Context with { type Symbol = ...; type Kind = ... }
given sym : ctx.Symbol
given kind: ctx.Kind
```

以下调用方式是标准的：

```scala
f(global)
f(global)(using ctx)
f(global)(using ctx)(using sym, kind)
```

以下调用方式会报错，因为其缺少了 ctx

```scala
f(global)(using sym, kind)
```

### Summoning Instances

> 通过 summon 方法召唤 given instance。

Predef 中的方法调用返回特定类型的 given 值。例如，Ord[List[Int]] 的给定实例由以下调用得到：

```scala
summon[Ord[List[Int]]]  // reduces to listOrd(using intOrd)
```

`summon` 方法被简单地定义为一个拥有上下文参数上的（非扩展）恒等函数。

### 疑问与总结

1.怎么使用方法上的 using XXX ?

```scala
  def fetch[T](using Ord[T]): Ord[T] = summon[Ord[T]]
  def fetch2[T](using ord: Ord[T]): Ord[T] = ord
```

using 的时候可以选择传递参数变量和不传递参数变量两种情形。如代码中的 `fetch` 和 `fetch2`。

- fetch 方法中因为没有 Ord[T] 变量，通过 summon[Ord[T]] 召唤 Ord[T] 的 given 实例并返回。
- fetch2 方法拥有 using 的 Ord[T] 的变量，直接返回变量 ord。

## 3.Context Bounds 上下文绑定

指一个上下文参数，依赖于类型参数，Context Bounds 就是表示将这个上下文参数绑定到类型参数上的一种简写。

```scala
def maximum[T: Ord](xs: List[T]): T = xs.reduceLeft(max)
```

`:Ord` 就是一个上下文绑定。在 maximum 方法上，依赖于类型参数 T，则 Ord 即等价于表示 `using Ord[T]`，而上述就是这种表示的一种简写。
从上下文绑定中生成的上下文参数，在定义时，排在最后一个，举个例子：

上下文绑定可以与子类型的绑定相结合。如果两者都存在，则首先出现子类型绑定，例如：

```scala
def g[T <: B : C](x:T): R = ...
```

方法或类的类型参数 T 上的类似 : Ord 的边界表示使用 Ord[T] 的上下文参数。从上下文边界生成的上下文参数在包含方法或类的定义中排在最后。例如，

以下是测试代码:

```scala
def f[T:C1:C2,U:C3](x:T)(using y:U,z:V):R
```

该方法会扩展为 =>

```scala
def f[T,U](x:T)(using y:U,z:V)(using C1[T],C2[T],C3[U]) :R
```

以下是测试例子:
定义 Bound.scala

```scala
trait Bound:
  def invoke(msg: String): Unit
end Bound

//def f[T: C1 : C2, U: C3](x: T)(using y: U, z: V): R


object Bound:
  given C1[Int] = C1[Int]()

  given C2[Int] = C2[Int]()

  given String = "15"

  given C3[String] = C3[String]()

  given V = V()

end Bound
```

测试：

```scala
import com.maple.scala3.ca.cb.Bound.given

object Main:

  def f[T: C1 : C2, U: C3](x: T)(using y: U, z: V): String =
    val msg = "test"
    summon[C1[T]].invoke(msg)
    summon[C2[T]].invoke(msg)
    summon[C3[U]].invoke(msg)

    println(s"y=${y}")
    summon[V].invoke(msg)
    z.invoke(msg)
    "Done."

  @main def test1(): Unit =
    f[Int, String](13)

end Main
```

## 4.Importing Givens

> 从其他包中引入 given 方法和普通方法的形式略有不同，我们将展开详述。

定义一个 object A, 它包含不同方法和 given 修饰的方法。

```scala
object A:
  class TC
  given tc: TC = ???
  def f(using TC) = ???
```

我们使用 `import A.*` 只能 import A 中的普通方法和变量，无法引入 given 方法。通过 `import A.given` 可将 A 中定义的全部方法引入。

```scala
object B:
  import A.*
  import A.given
```

上述代码可以简化为:

```scala
import A.{*,given}
object B:
```

除了通过 \* 和 given 等全量引入之外，也可以通过具体的方法名称进行引入。

### 好处

- given 的范围更好界定，我们可以清晰的知道，当前 using 的对象是从哪个类 given 来的。
- 只导入某个类的所有 given 实例，不导入这个类的其他方法和变量。这一点特别重要，因为 given 可以是匿名的，所以使用命名导入的通常方法是不切实际的。

### 根据 Type 导入(Import)

given 可以是匿名的，所以有时根据 name 来导入不太可行。因此 scala3 提供了通过 By-type 来进行导入。按类型导入为通配符导入提供了更具体的替代方案。例如：

```scala
import A.given TC
```

它代表导入A 中所有符合类型 TC 的 given 实例，不属于此类型的将不会进行导入。可支持批量的各种类型的导入，例子：

```scala
import A.{given T1,given T3}
```

导入参数化的given实例，例如 Instances 下的这些 given 实例：

```scala
object Instances:
  given intOrd: Ordering[Int] = ...
  given listOrd[T: Ordering]: Ordering[List[T]] = ...
  given ec: ExecutionContext = ...
  given im: Monoid[Int] = ...
```

可以通过如下方式导入所有 Ordering 类型的 given 实例：

```scala
import Instances.{given Ordering[?]}
```

上述 import 会将 `intOrd`,`listOrd` 导入，但是 `ec` 和 `im` 将不会导入。

by-type 和 by-name 可以同时使用，如果两者都指向某个 given 实例，则 by-name 的优先级高于 by-type。

```scala
import Instances.{im, given Ordering[?]}
```

## 未完待续 ...
