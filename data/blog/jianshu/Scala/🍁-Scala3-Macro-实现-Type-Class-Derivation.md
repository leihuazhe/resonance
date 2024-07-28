> 本文将通过 macro 的方式来实现类型类的派生方法的实现。代码样例详见:
> [derive_macros](https://github.com/leihuazhe/scala_scala3_samples/tree/master/src/main/scala/com/maple/scala3/derive_macros)

## 1.定义 Equal trait 和 伴生对象

```scala
trait Equal[T]:
  def equal(x: T, y: T): Boolean

object Equal:
  // 比较,以下是根据 inline 的实现 signature.
  // inline given derived[T]: (m: Mirror.Of[T]) => Eq[T] = ???
  // 请注意，由于在后续阶段使用 a type ，因此需要通过使用相应的上下文绑定将其提升为 Type 。
  given derived[T: Type](using q: Quotes): Expr[Equal[T]] =
```

和 [low level](https://www.jianshu.com/p/06d31786f3fc) 派生类 derived 方法对比：

```scala
//low level
inline given derived[T](using m: Mirror.Of[T]): Equal[T] = ???

//macro level
given derived[T: Type](using q: Quotes): Expr[Equal[T]] =
```

- low level 直接返回的 Equal[T]，而 Macro 返回的则是 Expr 对象。
- macro level 不需要显示 using Mirror，该信息可以在 quotes 层面获取到，因此需要 using Quotes。

## 2.实现 derived

代码核心逻辑分为3步：

- a.从 Quotes 上下文中获取 Mirror.Of[T] 对象
- b.判断 Mirror.Of[T] 具体子类，属于 Mirror.ProductOf 还是 Mirror.SumOf
- c.针对不同的Mirror 类型，实现对应的 equals 方法。

```scala
given derived[T: Type](using q: Quotes): Expr[Equal[T]] =
    //获取 Mirror
    val ev: Expr[Mirror.Of[T]] = Expr.summon[Mirror.Of[T]].get
    //判断 ev 是 Mirror.ProductOf 还是 Mirror.SumOf
       ev match
          case '{  $m: Mirror.ProductOf[T] {type MirroredElemTypes = elementTypes }  } ⇒ {
            val elemInstances: List[Expr[Equal[?]]] = summonAll[elementTypes]
            val eqProductBody: (Expr[T], Expr[T]) => Expr[Boolean] = (x, y) =>
              elemInstances.zipWithIndex.foldLeft(Expr(true: Boolean)) { case (acc, (elem, index)) =>
                val e1 = '{$x.asInstanceOf[Product].productElement(${Expr(index)})}
                val e2 = '{$y.asInstanceOf[Product].productElement($ {Expr(index)})}
                '{$acc && $elem.asInstanceOf[Equal[Any]].equal($e1, $e2)}
           }
          '{eqProduct((x: T, y: T) => $ {eqProductBody('x, 'y)})}
        }
           case '{$m: Mirror.SumOf[T] {type MirroredElemTypes = elementTypes}} => {
              val elemInstances = summonAll[elementTypes]
              val eqSumBody: (Expr[T], Expr[T]) => Expr[Boolean] = (x, y) => {
                  val ordx = '{$m.ordinal($x)}
                  val ordy = '{$m.ordinal($y)}
                  val elements = Expr.ofList(elemInstances)
                  '{$ordx == $ordy && $elements($ordx).asInstanceOf[Equal[Any]].equal($x, $y)}
            }
            '{eqSum((x: T, y: T) => $ {eqSumBody('x, 'y)})}
      }
```

上述代码均有使用到 Splices 和 Quotes 的特性，这块特性为 Scala3 的全新 Macro 系统，以及 TASTY 模型，笔者会在之后的 Macro 篇章进行详细介绍。

### 实现 summonAll

> 与 low level 不同的是，此处实现 summonAll 采用的也是 Macro 级别的 Splice 和 Quotes，代码如下:

```scala
  def summonAll[T: Type](using Quotes): List[Expr[Equal[_]]] =
    import quotes.reflect.*
    val tpe = TypeRepr.of[T]
    println(s"param tpe(typeRepr):" + tpe.show(using Printer.TypeReprCode))
    //Quote pattern can only match scrutinees of type scala.quoted.Type
    Type.of[T] match
      case '[String *: tpes] ⇒ '{summon[Equal[String]]} :: summonAll[tpes]
      case '[Int *: tpes] => '{ summon[Equal[Int]] } :: summonAll[tpes]
      case '[tpe *: tpes] => derived[tpe] :: summonAll[tpes]
      case '[EmptyTuple] => Nil
```

最终完全代码见： [完全代码](https://github.com/leihuazhe/scala_scala3_samples/tree/master/src/main/scala/com/maple/scala3/derive_macros)
