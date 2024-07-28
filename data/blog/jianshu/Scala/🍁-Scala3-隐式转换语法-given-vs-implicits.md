本文参考了：https://blog.rockthejvm.com/givens-vs-implicits/ ，同时增加笔者的一些例子和观点。
这篇文章主要探讨 Scala3 的转换 与 Scala2 的隐式转换的相似与区别之处，适用于对 Scala2 有一定熟悉的程序员，如果你直接开始学习 Scala3，则可忽略本文。

# 1.Scala2 隐式 (Implicits) 特性

Implicits 特性是 Scala 最引人称道和强大的特性，使用 Scala 精髓之一就是 隐式转换。它允许在传统的面相对象的代码层次之外进行代码的抽象与增强。
如我们使用 Java 的某个类库中的 api，如 java.sql.Connection，它的方法定义和成员变量写死在了那里。但是使用 Scala 则可以通过提供隐式转换的特性，直接对
Connection 提供新的方法，而用户在使用时，不需要关心这个新的方法在哪里定义的，Scala 支持我们在 IDE 编写代码时，直接提示出这个新的方法。下面是一个例子：

```scala
import java.sql.Connection
import com.maple.scala3.implicts.sql.given_Conversion_Connection_RichConnection

given Conversion[Connection,RichConnection] with
  override def apply(x: Connection): RichConnection = RichConnection(x)

class RichConnection(conn: Connection) {
  //定义的新方法 executeUpdate，对数据操作
  def executeUpdate(sql: String): Int = {
    conn.prepareStatement(sql).executeUpdate()
  }
}

def richConnection(conn: Connection): Unit =
  conn.executeUpdate("update name from users set name = ")
```

如上述代码,在 richConnection 中，看起来 Connection 新增了一个方法 executeUpdate，而实则是 Scala 通过隐式转换将 Connection 转换成了 RichConnection。

Scala Implicits 的使用场景：

- Implicits 是在 Scala 中创建 TypeClass 的重要工具。
- 使用 Implicits 可以扩展现有类型的功能,例如上文中的 Connection 扩展。
- Implicits 支持自动创建新类型并在编译时将它们之间的类型关系联系起来。

在 Scala 2中，上述功能均可以通过关键字 implicits 实现，这包括 隐式变量 ( implicit val a = xxx )、隐式函数( implicit def xxx )、隐式类等( implicit class xxx() )。
但是这一套方案存在其缺点，并且导致了其在使用起来比较复杂和难懂，代码风格也得不到一定的统一。

- 1.如果我们的代码中使用到了不少 implicits 代码，我们很难 显示的去寻找这些隐式转换到底在进行转换的。因为 implicit 可以随处定义，并且在 import 时，可以粗略的 import，即使用类似 `import com.maple.implicts._` 的形式直接把该包下面所有的信息都引入进来了。

- 2.当我们写的方法上需要一个隐式参数时，我们需要 import 其对应的隐式转换定义，来让这段代码能够编译通过。IDE 不会自定完成这个导入过程，我们需要自己去寻早这些隐式转换类的定义包。举个例子，有可能一个 String => Person 的转换在多处都有定义，而这些定义有略有不同，IDE怎么去进行 import 呢？所以我们得自己去寻找和导入，是不是感觉有些麻烦，对初学者和新的代码维护者来说，感觉会比较沮丧。

- 3.对于一个隐式方法，其参数上如果有 implicit 参数时，这个方法可以层层被使用而且被进行转换。这些转换可能会存在潜在的错误，而我们平时用的最多的就是这种方式，这就使得它变得更加危险了。举个例子：TODO

- 4. 其他的一些让人烦恼的点：
  - 隐式变量等总是需要去命名，但是其实我们重来没用用到这个命名，如下面例子 personToString 从来没有用到过。

```scala
implicit val personToString = Person().toString()
```

如果一个函数入参数包含了 implicit 参数，则在传递的过程中，会让人迷惑，如下面这段代码，它的隐式参数可以一层一层向外抛，直到最外层需要用时，在上下文找到一个隐式定义变量，则编译通过。

```scala
//第一层
def getName(implict name:String) = name
//第二层
def getNames(implict nickName:String) = getName
//第三层
implict val defaultName = "maple"
def getNameList(name:List[String]) =
 if(name.isEmpty) getNames()
else xxx
```

# 2. Scala3 Implicit 的全面重构

隐式转换( Implicit conversions ) 现在需要被显示的指定，这让开发者们如释重负，类型的定于与转换在 3 中将变得异常的清晰和好用。

在 Scala 3 中，扩展方法 ( extension method ) 的概念是独立的，因此我们可以单独实现需要需要 implict 而不需要转换( conversion )的模式。
这样一来，conversions 的场景可能会大量减少，因为转换是隐秘的，显示的去 import 和 使用 转换可能更有利于代码的维护和可读性。
现在，在 scala 3 中，定一个一个转换的语法如下：

```scala
pacage com.mapla.scala3.implicts

case class Person(name: String):
    def greet: String = s"Hey, I'm $name. Scala rocks!"

given [named_name : ] Conversion[String,Person] with
   overide def apply(original: String): Person = Person(original)
```

- name 是可以省略掉的，这样编译器会通过一定的规律自动给我们生成一个name。
- 在使用该转换函数时，必须显示且精确的引用出来，下面是例子。

```
import com.maple.scala3.implicts.given_Conversion_String_Person
// import com.maple.scala3.implicts._ 编译错误

def testStringToPerson(): Unit =
    println("Jeff H. Ray".greet)
```

- 如上面代码，必须精确的引用到该转换，该名字是编译器自动生成。

未完待续！！！
