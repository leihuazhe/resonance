> 详见代码库：[https://github.com/leihuazhe/scala_scala3_samples](https://github.com/leihuazhe/scala_scala3_samples/tree/master/src/main/scala/com/maple/scala3/derive2)

`Type Class Derivation`, 定义一个类 A,该类有一个特殊的方法。而通过派生类我们可以将定义的类 派生自A,这样新定义的类也拥有了A的方法。
官方说明: Type Class Derivation 是一种为满足一些简单条件的类型类自动生成给定实例的方法。

从这个意义上说,类型类(Type Class) 是具有Type参数的任意的trait或者class类型,该类型参数确定被操作的类型。

例子,给定如下的 ADT tree:

```scala
enum Tree[T] derives Eq, Ordering, Show:
  case Branch(left: Tree[T], right: Tree[T])
  case Leaf(elem: T)
```

`derives` 语法 为当前Tree的伴生对象中的 Eq、Ordering 和 Show 类型类生成以下 given instance.

```scala
given [T: Eq]       : Eq[Tree[T]]    = Eq.derived
given [T: Ordering] : Ordering[Tree] = Ordering.derived
given [T: Show]     : Show[Tree]     = Show.derived
```

我们说 Tree 是派生类型(deriving type)，而 Eq、Ordering 和 Show 实例是派生实例。

## Types supporting derives clauses

所有的数据类型都支持拥有 derives 子句。本文档主要关注数据类型，这些数据类型也具有可用的 Mirror type class 的 given instance。
Mirror 类型类在编译时给出。

Mirror type class 实例在类型级别(type level)提供有关类型(type)的组件(component)和标签(labelling)的信息。它们还提供最小术语级别的基础设施，以允许更高级别的库提供全面的派生支持(comprehensive derivation support)。

```scala
sealed trait Mirror:

  /** the type being mirrored */
  /** 被 mirrored 的原始类型 */
  type MirroredType

  /** the type of the elements of the mirrored type */
  /** mirrored type 的 element 的类型 */
  type MirroredElemTypes

  /** The mirrored *-type */
  type MirroredMonoType

  /** The name of the type */
  type MirroredLabel <: String

  /** The names of the elements of the type */
  /** mirrored type 的 element 的 name */
  type MirroredElemLabels <: Tuple

object Mirror:

  /** The Mirror for a product type */
  trait Product extends Mirror:

    /** Create a new instance of type `T` with elements      *  taken from product `p`.
     */
    def fromProduct(p: scala.Product): MirroredMonoType

  trait Sum extends Mirror:

    /** The ordinal number of the case class of `x`.      *  For enums, `ordinal(x) == x.ordinal`
     */
    def ordinal(x: MirroredMonoType): Int

end Mirror
```

Product类型( case classes and objects, and enum cases ) 的 Mirror 类型是 Mirror 的子类: Mirror.Product 。
Sum类型 (sealed class or traits with product children, and enums) 的 Mirror 类型是 Mirror 的子类: Mirror.Sum。

针对上述 Tree ADT 由编译器生成的 Mirror 如下:

```scala
enum Tree[T] derives Eq, Ordering, Show:
  case Branch(left: Tree[T], right: Tree[T])
  case Leaf(elem: T)

// Mirror for Tree
new Mirror.Sum:
	//被Mirror的原始类型是:Tree
	type MirroredType = Tree
	//被Mirror的类型的元素的类型:
	type MirroredElemTypes[T] = (Branch[T], Leaf[T])
	//The mirrored *-type
	type MirroredMonoType = Tree[_]
	//
	type MirroredLabel = "Tree"
	//
    type MirroredElemLabels = ("Branch", "Leaf")
    //
    def ordinal(x: MirroredMonoType): Int = x match
    	case _: Branch[_] => 0
    	case _: Leaf[_] => 1


// Mirror for Branch
new Mirror.Product:
  type MirroredType = Branch
  type MirroredElemTypes[T] = (Tree[T], Tree[T])
  type MirroredMonoType = Branch[_]
  type MirroredLabel = "Branch"
  type MirroredElemLabels = ("left", "right")

  def fromProduct(p: Product): MirroredMonoType =
    new Branch(...)

// Mirror for Leaf
new Mirror.Product:
  type MirroredType = Leaf
  type MirroredElemTypes[T] = Tuple1[T]
  type MirroredMonoType = Leaf[_]
  type MirroredLabel = "Leaf"
  type MirroredElemLabels = Tuple1["elem"]

  def fromProduct(p: Product): MirroredMonoType =
    new Leaf(...)

```

- Tree 对象是 enums对象,因此它的Mirror子类是 Mirror.Sum。
- Branch 和 Leaf 是 enum cases, 因此它的Mirror子类是 Mirror.Product。

### Mirror 的部分特性说明

- Mirror 使用的是 types 而不是 terms 进行编码。这意味着它是编译阶段的,如果没有使用它,则不会占用运行时内存。
  Mirror 会结合 Scala3 的 metaprogramming 特性一起使用。
- MirroredType 和 MirroredElemTypes 类型 与 Mirror 作为实例的 data type 的类型相匹配。

- 不管是 Product 还是 Sum 类型，在 MirroredElemTypes 中的元素的顺序与定义的顺序是一致的。例如 Tree Mirror 中的 MirroredElemTypes,Branch 必须
  优先于 Leaf，需要依照定义时的顺序。

- `ordinal` 和 `fromProduct` 方法是根据 `MirroredMonoType` 定义的，它是 kind-\* 的类型，通过通配符类型参数从 MirroredType 获得。

## Type classes supporting automatic deriving

> 支持自动派生的类型类

如果Scala trait 或者 class的伴生对象 定义了一个名为 `derived` 的方法，则该 trait 或 class 可以出现在派生子句(derives clause)中。类型类 `TC[_]` 的 派生方法(derived) 的签名和实现是任意的，但它通常具有以下形式:

```scala
import scala.deriving.Mirror

def derived[T](using Mirror.Of[T]): TC[T] = ...

```

- derived 方法持有了一个 Mirror 的上下文,以此来表示派生类型 T 的类型信息(Shape)。然后根据此 shape 来实现派生的方法。
  因此，如果想对某个类进行派生，上述信息是必须的。

- derived 可以以间接的方式拥有 Mirror 信息(比如通过scala3的 Macro的传递，或者运行时起的反射)。我们预计（直接或间接）基于 Mirror 的实现将是最常见的，这也是本文档所强调的(emphasises)。

我们先尝试使用比较低阶的方式来实现 derived 派生方法(通常在开发和生产中我们不会这么去做，但是去熟悉 derived 还是有必要的),然后在下一节使用 Macro 来实现派生方法。

## 使用 Low Level 实现类型派生方法

定义一个 trait Equal，它有一个方法 equal 可以比较给定的两个相同类型的对象是否相等。

```scala
trait Equal[T]:
  /**
    * 比较 x 和 y 是否相等
    */
  def equal(x: T, y: T): Boolean
```

定义一个 Opt enum 派生自 Equal, 这样 Opt 就拥有了 Equal 的 equal 方法的能力。

```scala
enum Opt[+T]  derives Equal :
  case Some(t: T)
  case None
```

核心代码：

```scala
trait Equal[T]:
  /**
    * 比较 x 和 y 是否相等
    */
  def equal(x: T, y: T): Boolean

//在派生类中提供 Equal 的 Mirror 信息
//通过实现 derived 方法,并生产一个 inline given instance
object Equal:

  given Equal[Int] with
    def equal(x: Int, y: Int) = x == y

  var count = 0

  // derived is defined as an inline given,意味着该方法会在调用时(call sites)进行 扩展 expanded
  inline given derived[T](using m: Mirror.Of[T]): Equal[T] =
    println(s"derived，T: ${Log.describe[T]},MirroredElemTypes: ${Log.describe[m.MirroredElemTypes]}")
    //获取 Mirror 的 Type 的元素类型.
    count = 0
    val elemInstances = summonAll[m.MirroredElemTypes]
    println(s"elemInstances: $elemInstances")
    //cause derived is inline, the match will be resolved at compile-time and only the left-hand side of the matching case will be inlined into the generated code with types refined as revealed by the match
    inline m match
      case s: Mirror.Sum ⇒
        eqSum(s, elemInstances)
      case p: Mirror.Product ⇒
        eqProduct(p, elemInstances)

  def eqSum[T](s: Mirror.SumOf[T], elems: List[Equal[_]]): Equal[T] =
    new Equal[T] :
      override def equal(x: T, y: T): Boolean =
        val ordx: Int = s.ordinal(x)
        val elem: Equal[_] = elems(ordx)
        (ordx == s.ordinal(y)) && check(elem)(x, y)

  def eqProduct[T](s: Mirror.ProductOf[T], elems: List[Equal[_]]): Equal[T] =
    new Equal[T] :
      override def equal(x: T, y: T): Boolean = {
        iterator(x).zip(iterator(y)).zip(elems.iterator).forall {
          case ((x, y), elem) => check(elem)(x, y)
        }
      }

  def check(elem: Equal[_])(x: Any, y: Any): Boolean =
    val res = elem.asInstanceOf[Equal[Any]].equal(x, y)
    println(s"res: $res")
    res

  def iterator[T](p: T) = p.asInstanceOf[Product].productIterator

  //https://stackoverflow.com/questions/65747525/printing-mirroredelemtypes-in-scala-3
  //check T

  //1.(Sm[T] *: (Opt.Nn,EmptyTuple))
  //2.

  inline def summonAll[T <: Tuple]: List[Equal[_]] =
    count += 1
    println(s"count: ${count}, log: " + Log.describe[T])
    inline erasedValue[T] match
      case _: EmptyTuple => Nil
      case x: (t *: ts) =>
        val si = summonInline[Equal[t]]
        println(s"count: ${count}, t: " + Log.describe[t] + s",si: $si")
        si :: summonAll[ts]

end Equal
```

## 执行分析

```scala
@main def test1(): Unit =
  import Opt.*
  //1
  val eqoi: Equal[Opt[Int]] = summon[Equal[Opt[Int]]]
  //2
  val isEqual = eqoi.equal(Some(23), Some(23))
  println(s"isEqual: $isEqual")
```

第一步:

```scala
val eqoi: Equal[Opt[Int]] = summon[Equal[Opt[Int]]]
```

通过 summon 去寻找 Equal[Opt[Int]] 的具体实现，实际编译成代码之后,调用的是 Opt 的派生方法 derived,如下:

```scala
val eqoi: Equal[Opt[Int]] = Opt.derived$Equal[scala.Int](Equal.given_Equal_Int)
```

然后 Opt.derived$Equal 实际调用如下(以下代码是编译器生成的方法)：

```scala
def derived$Equal[T](implicit `x$0₄`: Equal[T]): Equal[Opt[T]] =
    Equal.derived[Opt[T]](
      Opt.$asInstanceOf$[scala.deriving.Mirror {
        type MirroredType >: Opt[T] <: Opt[T]
        type MirroredMonoType >: Opt[T] <: Opt[T]
        type MirroredElemTypes >: scala.Nothing <: scala.Tuple
      } & scala.deriving.Mirror.Sum {
        type MirroredMonoType >: Opt[T] <: Opt[T]
        type MirroredType >: Opt[T] <: Opt[T]
        type MirroredLabel >: "Opt" <: "Opt"
      } {
        type MirroredElemTypes >: scala.*:[Opt.Some[T], scala.*:[Opt.None, scala.Tuple$package.EmptyTuple]] <: scala.*:[Opt.Some[T], scala.*:[Opt.None, scala.Tuple$package.EmptyTuple]]
        type MirroredElemLabels >: scala.*:["Some", scala.*:["None", scala.Tuple$package.EmptyTuple]] <: scala.*:["Some", scala.*:["None", scala.Tuple$package.EmptyTuple]]
      }]
    )
```

方法中去调用了我们在 Equal 伴生类中实现的 derived 方法，传递的 type 为 Opt[T], Mirror 信息如上代码所示，该 Mirror 信息包含了 Opt 及其子元素的各类 Type 信息，方便后续 Equal 进行派生实现类的查找。

接下来看 `Equal.derived` 方法:

```scala
inline given derived[T](using m: Mirror.Of[T]): Equal[T] =
    //获取 Mirror 的 Type 的元素类型.
    val elemInstances = summonAll[m.MirroredElemTypes]
    println(s"elemInstances: $elemInstances")
    //cause derived is inline, the match will be resolved at compile-time and only the left-hand side of the matching case will be inlined into the generated code with types refined as revealed by the match
    inline m match
      case s: Mirror.Sum ⇒
        println(s"Mirror.Sum: $elemInstances")
        eqSum(s, elemInstances)
      case p: Mirror.Product ⇒
        println(s"Mirror.Product: $elemInstances")
        eqProduct(p, elemInstances)
```

- 第一步根据给定的 Mirror，通过 summonAll 去获取它的子元素信息 `m.MirroredElemType`.
- 第二步：判断 m 具体是 Mirror 的什么子类，在根据对应的子类信息，去生成不同的 Equal 实现类。
- 返回结果是 Equal[T] 的具体实现，即最开始 main 方法中通过 `summon[Equal[Opt[Int]]]` 最终获取到该 Opt[Int] 的最终 Equal[Opt[Int] 的实现类，然后就可以通过这个实现类调用 equal 方法去判断 Opt[Int] 的两个对象是否相等了。

`summonAll[m.MirroredElemTypes]` 方法

```scala
inline def summonAll[T <: Tuple]: List[Equal[_]] =
    println(s"count: ${count}, log: " + Log.describe[T])
    inline erasedValue[T] match
      case _: EmptyTuple => Nil
      case x: (t *: ts) =>
        println(s"count: ${count}, t: " + Log.describe[t])
        summonInline[Equal[t]] :: summonAll[ts]
```

该方法通过提取 `m.MirroredElemTypes` 子元素信息，最终给这些子元素寻找对应的 Equal[_] 的实现类，以方便在最终对 Opt[T] 对象进行 equal 时，可以递归的去对其子元素进行 equal。

以 Opt[T] 为例，上文生成的代码我们可以看到， Opt[T] 传入的 Mirror 类型如下:

```scala
scala.deriving.Mirror {
        type MirroredType >: Opt[T] <: Opt[T]
        type MirroredMonoType >: Opt[T] <: Opt[T]
        type MirroredElemTypes >: scala.Nothing <: scala.Tuple
      } & scala.deriving.Mirror.Sum {
        type MirroredMonoType >: Opt[T] <: Opt[T]
        type MirroredType >: Opt[T] <: Opt[T]
        type MirroredLabel >: "Opt" <: "Opt"
      } {
        type MirroredElemTypes >: scala.*:[Opt.Some[T], scala.*:[Opt.None, scala.Tuple$package.EmptyTuple]] <: scala.*:[Opt.Some[T], scala.*:[Opt.None, scala.Tuple$package.EmptyTuple]]
        type MirroredElemLabels >: scala.*:["Some", scala.*:["None", scala.Tuple$package.EmptyTuple]] <: scala.*:["Some", scala.*:["None", scala.Tuple$package.EmptyTuple]]
}
```

- 该 Mirror 的 MirroredElemTypes 由一个元祖表示，大概可以写成如下形式：

```scala
(Opt.Some[T] *: (Opt.None *: EmptyTuple])
```

即主要包含，Some[T],None 两个元素，加上最后一个空的 EmptyTuple。

因此我们看 summonAll 的执行流程,第一步，会进入到下面这个步骤：

```scala
case x: (t *: ts) =>
        println(s"count: ${count}, t: " + Log.describe[t])
        summonInline[Equal[t]] :: summonAll[ts]
```

其中，t 即为 Opt.Some[T], 因此通过 summonInline[Equal[Opt.Some[T]]] 寻找其 Equal 的实现类。

summonInline 方法会再次触发调用 Opt.derived$Equal 方法去寻找 Equal 实现类，因此在这里最终会递归的调用 Equal.derived 方法，最终再次进入到 summonAll 方法。

此时 Mirror 类型为 Opt.Some[T], 而其 MirroredElemTypes 类型则为:

```scala
(T *: EmptyTuple])
```

然后再次进入 `case x: (t *: ts) =>` 阶段时，因为我们的 main 例子中，Opt[T] 为 Opt[Int]，因此，这里通过 summonInline[Equal[Int]] 拿到的值是 Equal 伴生类中定义的 given int 实例，即:

```scala
object Equal:
  //
  given Equal[Int] with
    def equal(x: Int, y: Int) = x == y
```

因此，在之前的 `summonInline[Equal[t]] :: summonAll[ts]` 中，前者已经走完，然后开始走后者，summonAll[ts], 此时，继续递归调用 summonAll 方法，此时，MirroredElemTypes 的结果如下:

```scala
 (Opt.None *: EmptyTuple)
```

继续往下走， summonInline 需要获取的结构变成 `summonInline[Equal[Opt.None]]`

此方法会再次进入， Equal.derived 方法，其中 T 类型为 `Opt.None`, mirror.MirroredElemTypes 格式变成：

```scala
(EmptyTuple)
```

最终获取为空,然后在 Equal.derived 方法中,调用完 **`summonAll`** 后，继续根据 None 的 Mirror 类型，生成对应的 Equal 实例返回。

经过多轮递归调用后， summonAll 最终返回的结果是：

```scala
elemInstances:
List(Equal$$anon$2@511baa65, Equal$$anon$2@340f438e)
```

最后，再通过 _`eqSum` 或者_ _`eqProduct` 包装成最终的 Equal 返回。_

## 总结：

通过 summon[Equal[Opt[T]] 会返回一个 Equal[Opt[T]] 的实现类，而该实现类会嵌套的持有多个 Opt[T] 元素的子类型的 Equal 实现类，然后最终再 Opt[T] 间通过调用 Equal.equal 时，请求会逐级转发到 Equal 持有的其他 Equal 中。

Derives 这种实现，在设计模式中，我们称为这种设计模式为 装饰器模式，典型的如 Java 中的各类 IO 操作。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-dcf3326d89c6dac6.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
