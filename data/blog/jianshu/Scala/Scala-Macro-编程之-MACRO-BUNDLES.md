> 目前仅支持 2.11.x,2.12.x

### Macro bundle 怎么做?

给类的构造函数增加一个参数，声明为 `c：scala.reflect.macros.blackbox.Context` 或 `c：scala.reflect.macros.whitebox.Context`

引用在bundle中定义的宏实现的工作方式与在对象中定义的impls相同。 您指定一个包名称，然后从中选择一个方法，必要时提供类型参数。

```scala
import scala.reflect.macros.blackbox.Context

class Impl(val c: Context) {
  def mono = c.literalUnit
  def poly[T: c.WeakTypeTag] = c.literal(c.weakTypeOf[T].toString)
}

object Macros {
  def mono = macro Impl.mono
  def poly[T] = macro Impl.poly[T]
}
```
