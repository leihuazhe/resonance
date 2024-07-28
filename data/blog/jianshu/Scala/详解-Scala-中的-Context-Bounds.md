### What is Context Bounds?

这是Scala 2.8 引入的新特性，通常与类型类模式（type class pattern）一起使用。一个 Context Bounds 需要一个参数类型，比如 `Ordered[A]`,一个 Context Bounds 可以描述为一个隐式值。比如对于一个类型 A，它需要有一个 B[A] 的隐式值存在。

```scala
def foo[A : B](a: A) = g(a)
```

上面的定义中，函数 `g(a)` 需要传入一个隐式值 `B[A]`，即上面的 `foo` 函数签名等价于如下模式

```scala
def foo[A](a:A)(implicit b:B[A]) = g(a)
```

简单说 Context Bounds 算是一个隐式参数的语法糖，可以简写代码。

### 使用举例

下面我们定义一个方法 foo，它拥有参数类型T，并且需要传入隐式对象 Stringer， 用于对 foo里的两个参数进行 toString 操作，代码如下：

```scala
object ContextBoundSpec {

    def foo[T](a: T, b: T)(implicit stringer: Stringer[T]): String = {
        stringer.toString(a, b)
    }
}

trait Stringer[T] {
    def toString(a: T, b: T): String
}
```

相信大家对上面代码没有任何疑问，现在我们将使用 Context Bounds 语法糖的形式修改 foo 函数

```scala
object ContextBoundSpec {
   def foo[T:Stringer](a: T, b: T): String = {
        val stringer = implicitly[Stringer[T]]
        stringer.toString(a, b)
    }
}
```

注意到，通过新的模式写法后，两个函数是等价的，但是下面这个函数由于通过 context bound 形式后，在方法入参上拿不到关于 Stringer 对象的值，那么我们可以通过 `implicitly` 这个 **标识符** 来获取程序上下文中存在的关于Stringer[T]类型的隐式值，这个 **标识符** 的作用就在于此，它是自动的去获取到。

- 下面是测试例子：

```scala
 def main(args: Array[String]): Unit = {
     implicit val stringer: Stringer[Int] = new Stringer[Int]() {
         override def toString(a: Int, b: Int): String = {
                s"$a-$b"
         }
     }
    val result1 = foo1(2, 3)
    val result2 = foo2(2, 3)

    println(result1)
    println(result2)
 }
```

通过实例化一个Int类型的 `Stringer`，并且分别调用 `foo1` 和 `foo2` 结果完全一致。

###　使用场景
上下文边界主要用于所谓的类型类模. 基本上，此模式通过一种隐式适配器模式使功能可用来实现继承的替代方法。

在Scala 源码和部分三方库的源码中大量使用了 Context Bounds 这种模式，所以我们需要清楚的认识到这种写法，并灵活应用。

### 推荐

更深层的理解 `Scala` 上下文绑定和其复杂的类型系统，可以参考 [Scala老司机 老王的这篇文章](https://www.jianshu.com/p/4c9ccbe8cb35)
