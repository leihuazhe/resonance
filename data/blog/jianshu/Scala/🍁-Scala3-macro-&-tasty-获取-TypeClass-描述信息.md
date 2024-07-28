# 1.概述

Scala3的Macro基于其引入的新的抽象类型结构 tasty,即：**Typed Abstract Syntax Trees**，其可以在编译之后，保留方法和类上的类型信息，以方便Scala3的 MetaPrograming 编程。

本文尝试提供一个 `Describer` 工具在运行期获取当前类型的各种信息，比如 TypeTree,TypeRepr, Symbol 等等，以方便我们在学习 Macro 时，对 tasty 结构认识和加深印象。

# 2.实践 describe

定义 `macro` 方法 `describe`，并根据传递的 `ShowType` 类型返回对应的需要的类型信息。

```scala
object Describer:
 enum ShowType:
    case TYPE_TREE
    case TYPE_REPR
    case OTHER

  inline def describe[T](showType: ShowType): String = ${describeImpl[T]('showType)}
```

如何去实现 describeImpl 呢？以下是我在编码过程中的几个版本和自己的一些思路，前面的版本完成后，很显然的编译无法通过，于是催生了修改的版本，最终编译成功，并加深自己的学习。

## 2.1 v1 代码实现

```scala
object Describer {

  inline def describe[T](showType: ShowType): String = ${describeImpl[T]('showType)}

  def describeImpl[T: Type](showType: Expr[ShowType])(using Quotes): Expr[String] = {
    import quotes.reflect.*

   val st = ${showType}
    st match
          case ShowType.TYPE_TREE ⇒
            val tpt = TypeTree.of[T]
            Literal(StringConstant(tpt.show)).asExprOf[String]
          case ShowType.TYPE_REPR ⇒
            val tpr = TypeRepr.of[T]
            Literal(StringConstant(tpr.dealias.show)).asExprOf[String]
          case ShowType.OTHER ⇒
            '{"Not supported."}
  }
}
```

![error.png](https://upload-images.jianshu.io/upload_images/6393906-be8cfbc9d5cc4aba.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

提示报错：`Splice ${...} outside quotes '{...} or inline method`，即：${} 操作不能在 '{} quotos 操作外部进行(只有一种场景 splices 可以在 quotes 外面，就是 macro 方法入口类,如有疑问，欢迎指正)。

## 2.2 v2 代码实现

> 修改代码,使用 quotos 去 wrap 整段代码，这样 splice 就可以使用了。

```scala
object Describer {

  enum ShowType:
    case TYPE_TREE
    case TYPE_REPR
    case OTHER

  inline def describe[T](showType: ShowType): String = ${describeImpl[T]('showType)}

  def describeImpl[T: Type](showType: Expr[ShowType])(using Quotes): Expr[String] = {
    import quotes.reflect.*
    //showType.asTerm 可以拿到 ExprImpl 下的 trees 信息
    '{
      val showType1 = ${showType}
      showType1 match
        case ShowType.TYPE_TREE ⇒
          val tpt = TypeTree.of[T]
          tpt.show
        case ShowType.TYPE_REPR ⇒
          val tpr = TypeRepr.of[T]
          tpr.dealias.show
        case ShowType.OTHER ⇒
          "Not supported."
    }
  }
}
```

![error.png](https://upload-images.jianshu.io/upload_images/6393906-71a8b71ef7261405.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

```
access to parameter evidence$1 from wrong staging level:
            - the definition is at level 0,
            - but the access is at level 1.
```

提示以上报错，以上 quote 里想通过 $showType 来将 Expr[ShowType] 转换为 ShowType,但是 scala3 的 macro 是在编译期间运行的，编译器无法获取到 ShowType ，只能 获取到 ShowType 的 tasty 结构的信息，即 Expr[ShowType]。所以当尝试在 macro 方法内对 Expr[ShowType] 转化时就会报以上错误。

主要原因是不能在 quotes level 层去获取到 ShowType 信息(存疑)?

## 2.3 v3 代码实现

通过在 quotes 里使用 scala3 新特性 tasty 的类型结构特性来进行编码和匹配，这一版成功运行。

```scala
object Describer {

  inline def describe[T](showType: ShowType): String = ${describeImpl[T]('showType)}

  def describeImpl[T: Type](showType: Expr[ShowType])(using Quotes): Expr[String] = {
    import quotes.reflect.*
    //showType.asTerm 可以拿到 ExprImpl 下的 trees 信息
    showType.asTerm match
      case Inlined(_,_,Ident(content)) ⇒
        ShowType.valueOf(content) match
          case ShowType.TYPE_TREE ⇒
            val tpt = TypeTree.of[T]
            Literal(StringConstant(tpt.show)).asExprOf[String]
          case ShowType.TYPE_REPR ⇒
            val tpr = TypeRepr.of[T]
            Literal(StringConstant(tpr.dealias.show)).asExprOf[String]
          case ShowType.OTHER ⇒
            '{"Not supported."}
      case _ ⇒ '{"Not supported."}
  }
}
```

22.8.18 更新: 上述代码中，通过将 tpt.show 包装为 Expr[String] 的代码可以进行简化：

```
//Literal(StringConstant(tpr.dealias.show)).asExprOf[String]
Expr(tpr.dealias.show)
//   '{"Not supported."}
Expr("Not supported.")
```

测试代码：

```scala
  @main def showTypeOf(): Unit = {
    //1
    var str = Describer.describe[User]((ShowType.TYPE_TREE))
    println(s"describe str: $str")
    //2
    str = Describer.describe[User]((ShowType.TYPE_REPR))
    println(s"describe str: $str")
  }
```

## 2.4 总结

上文中的 ShowType 可以进行扩展，我们可以去获取更多的类型信息。我们实现的 `describeImpl` 信息会在编译期进行执行，而编译期中的代码类型和结构，都可以通过 quotes api 来进行获取 和进行 match。
总结原则：

- 1. splice 除了在 macro 入口可以在 quotes 之外外，其他情况，都需要在 quotes 以内。
- 2. staging level，macro实现是在编译期运行的,编译期间无法将 Expr[T] 在实现内部直接转换为 T,否则就会报 staging level 相关异常。
- 3. 在 quotes中，通过 match case 方式提取出类型信息中需要的 part 部分。

# 3.实践 describeImpl 添加 using 自己写的 given

scala 库有提供 FromExpr trait.

```scala
trait FromExpr[T] {

  /** Return the value of the expression.
   *
   *  Returns `None` if the expression does not represent a value or possibly contains side effects.
   *  Otherwise returns the `Some` of the value.
   */
  def unapply(x: Expr[T])(using Quotes): Option[T]

}
```

我们在代码中写个实现，通过 given with 的形式给出：

```scala
  given fromExpr[T]: FromExpr[T] with
    override def unapply(expr: Expr[T])(using Quotes): Option[T] =
      import quotes.reflect.*
      @tailrec
      def rec(tree: Term): Option[T] =
        tree match
          case Block(stats, e) ⇒
            if stats.isEmpty then rec(e) else None
          case Inlined(_, bindings, e) ⇒
            if bindings.isEmpty then rec(e) else None
          case Typed(e, _) ⇒ rec(e)
          case _ ⇒
            tree.tpe.widenTermRefByName match
              case ConstantType(c) ⇒ Some(c.value.asInstanceOf[T])
              case _ ⇒ None

  rec(expr.asTerm)
```

然后在 2.x 中的 describeImpl 引入 FromExpr,代码如下:

```scala
  def describeImpl[T: Type](showType: Expr[ShowType])(using Quotes,FromExpr[T]): Expr[String] =
    import quotes.reflect.*
      val exprOpt = showType.value
      println(s"exprOpt: $exprOpt")
      showType.asTerm match
        case Inlined(_, _, Ident(content)) ⇒
          ShowType.valueOf(content) match
            case ShowType.TYPE_TREE ⇒
              val tpt = TypeTree.of[T]
              Expr(tpt.show)
            case ShowType.TYPE_REPR ⇒
              val tpr = TypeRepr.of[T]
              Expr(tpr.show)
            case ShowType.OTHER ⇒
              Expr("Not supported.")
        case _ ⇒ Expr("Not supported.")
```

编译器会报如下错误,提示畸形的 macro 参数。

```
 inline def describe[T](showType: ShowType): String = ${describeImpl[T]('showType)}
                                                                                                                                      ^
Malformed macro parameter: com.maple.scala3.macros2.Describer.fromExpr[T]
```

为什么会如此?因为在 describeImpl 逻辑中无法找到 FromExpr 的 given 实例，_比较疑惑为什么找不到?_

通过修改 describeImpl 实现，在其方法里面增加内部方法，在方法内部可以获取到 FromExpr given 实例,代码如下，**可以编译通过。**

```scala
  def describeImpl[T: Type](showType: Expr[ShowType])(using Quotes): Expr[String] =
    import quotes.reflect.*
    def func(showType: Expr[ShowType])  (using Quotes,FromExpr[T]) =
      //showType.asTerm 可以拿到 ExprImpl 下的 trees 信息
      val exprOpt = showType.value
      println(s"exprOpt: $exprOpt")

      showType.asTerm match
        case Inlined(_, _, Ident(content)) ⇒
          ShowType.valueOf(content) match
            case ShowType.TYPE_TREE ⇒
              val tpt = TypeTree.of[T]
              Expr(tpt.show)
            case ShowType.TYPE_REPR ⇒
              val tpr = TypeRepr.of[T]
              Expr(tpr.show)
            case ShowType.OTHER ⇒
              Expr("Not supported.")
        case _ ⇒ Expr("Not supported.")
    func(showType)
```

- 定义内部函数 `func`。
- 将 `using FromExpr[T]` 挪到内部函数 func 内
- 在最后调用 func, 这时可以将 FromExpr[T] 给找到。
