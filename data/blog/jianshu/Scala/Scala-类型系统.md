## 协变 Covariance

> https://docs.scala-lang.org/zh-cn/tour/variances.html

在期望接收一个基类(父类) 实例的集合的地方，能够使用一个子类实例的集合的能力叫做协变。

```scala
//基类
var objects: List[Any] = null;
//子类
val ints = List(1,2,3,4)

objects = ints //scala 会编译错误
```

如上面的代码，将 int 数据类型的集合赋值给 Any 类型的集合，就是协变。

Scala 的 List[+T] 支持协变

## 逆变 Contravariance

在期望接收一个子类实例的集合的地方，能够使用一个基类(父类) 实例的集合的能力叫做逆变。

```scala
//子类
var ints: List[Int] = null;
//基类
val objects = List("3","4")

ints = objects //scala 会编译错误
```

如上面的代码，将 objects 父类数据类型的集合赋值给 int 类型的集合，就是逆变。
Scala 的 List[+T] 不支持逆变

## 如何支持协变 -- 协变定义上界

定义 Pet 和 Dog

```scala
case class Pet(name: String)

case class Dog(name:String) extends Pet(name)
```

有一个接收 List[Pet] 的方法

```scala
def doPets(pets: List[Pet]) = {
//xxxx
}
```

如果使用 List[Dog] 的集合传入该方法会报编译错误，如果想让该方法支持协变，则可以像如下方法定义：

```scala
def doPets[T <: Pet](pets: List[T]) {
  // xxxx
}
```

`T <: Pet` 表明由 T 表示的类派生自 Pet 类，也即 T 为 Pet 的子类。这个语法定义了一个上界。Pet 为 T 的上界，即往父类方向坐了限制。

## 如何支持逆变 -- 逆变定义下界

```java
  //逆变,限制了下界, T 必须为 Apple 或其超类
  def writeTo[T >: Apple](apples: List[T]): Unit = {
  }
```

逆变会决定下界，然后你可以在上述的 apples 中添加 Apple 或其父类。

## PECS 原则

《Effective Java》给出精炼的描述：**producer-extends, consumer-super（PECS）**。

- 协变限制数据来源,生产者，保证生产的产品为 T 或其子类。
- 逆变限制数据消费，保证用来消费的数据必须时 T 或其父类。

```java
  //copy方法限制了拷贝源src必须是T或者是它的子类，
  // 而拷贝目的地dest必须是T或者是它的父类，这样就保证了类型的合法性。
  def copy[S, D >: S](src: List[S], dest: List[D]): Unit = {

  }
```

- copy 方法，限制 src 来源必须是 S 及其子类，限制 dest 是 S及其父类，这样才能去接收。

## 在scala泛型中获取其 Class[T]

> 需求：获取一个泛型 T 的 class 类型的 Class[T],有两种方法。

#### 获取方式1

```scala
def getClassT[T](obj: T): Class[T] = {
        val res = obj.getClass.asInstanceOf[Class[T]]
        res
}
```

#### 更优雅的获取方式

```scala
def getClassT[T](obj: T)(implicit m: Manifest[T]): Class[T] = {
        val res: Class[T] = m.runtimeClass.asInstanceOf[Class[T]]
        res
}
```
