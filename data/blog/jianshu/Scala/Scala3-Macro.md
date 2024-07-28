## Snippet 1

```scala
object Printer:
  def printlnUppercase(content:Expr[String]):Unit =
    ${ printlnUppercaseImpl(content) }

  def printlnUppercaseImpl(content: Expr[String])(using Quotes):Expr[Unit] =
    val expr: Expr[String] = '{$content.toString()}
    '{println("expr: " + $expr)}
```

- `impl` 实现类需要添加 `using Quotes` 的隐式转换声明。
  - `no implicit argument of type scala.quoted.Quotes was found`
- 会报错 `Splice ${...} outside quotes '{...} or inline method`
- 需要添加 `inline` ,Macro 方法必须是 inline 的？

## Snippet 2

```scala
object Printer:
  inline def printlnUppercase(content:Expr[String]):Unit =
    //Splice ${...} outside quotes '{...} or inline method
    ${ printlnUppercaseImpl(content) }

  def printlnUppercaseImpl(content: Expr[String])(using Quotes):Expr[Unit] =
    val expr: Expr[String] = '{$content.toString()}
    '{println("expr: " + $expr)}
```

- 报错：`畸形的 macro parameter`

```scala
[error] 16 |    ${ printlnUppercaseImpl(content) }
[error]    |                            ^^^^^^^
[error]    |                            Malformed macro parameter
[error]    |
[error]    |                            Parameters may only be:
[error]    |                             * Quoted parameters or fields
[error]    |                             * Literal values of primitive types
[error]    |                             * References to `inline val`s
```

提示参数只可能是：

## Snippet 3

```scala
object Printer:
  inline def printlnUppercase(content:String):Unit =
    ${ printlnUppercaseImpl('content) }

  def printlnUppercaseImpl(content: Expr[String])(using Quotes):Expr[Unit] =
    val expr: Expr[String] = '{$content.toString()}
    '{println("expr: " + $expr)}
```

- compile 通过

记住，`Macro` 最终暴露出去的方法,一定是可以直接进行使用的，而不是要传 Expr 之类的参数。

## 总结

- Macro 入口类需要是 inline 方法,传入的值需要是引用or值类型,不能传递Quotes和Splice类型。
- Macro 实现类需要添加 Quotes 隐式 using.
- Macro 实现类 接收的是 Expr[T] 类型，即 Quotes 类型,返回也是 Expr 类型
- Marco 入口类返回结果通过 ${ } 包装实现类。
