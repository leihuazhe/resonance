## TODO

```scala
package com.maple.scala.macros

import scala.language.experimental.macros
import scala.reflect.macros.whitebox

/**
  * 把任何 CaseClass 转换为 Map
  *
  * trait CaseClassMapConverter[C]是个 type-class,代表了 C类型 数据的行为函数 toMap 和 fromMap
  */
trait CaseClassMapConverter[C] {
    def toMap(c: C): Map[String, Any]

    def fromMap(m: Map[String, Any]): C
}

/**
  * 在函数ccToMap和mapTocc 函数需要的隐式参数 CaseClassMapConverter[C]实例 就是由这个 Macro 实现函数提供的。
  * 注意我们只能用 WeakTypeTag 来获取 类型参数C的信息。
  * 在使用 quasiquotes 时我们一般是在q括号中放入原始代码。在q括号内调用AST变量用$前缀（称为unquote）。对类型tpe的操作可以参考scala.reflect api。
  *
  * 示范调用代码在demo目录下的ConverterDemo.scala里：
  */
object CaseClassMapConverter {
    //通过Macro实现函数可以产生CaseClassMapConverter[C]实例
    implicit def materialize[C]: CaseClassMapConverter[C] = macro converterMacro[C]

    def converterMacro[C: c.WeakTypeTag](c: whitebox.Context): c.Tree = {
        import c.universe._

        val tpe = weakTypeOf[C]
        val fields = tpe.decls.collectFirst {
            case m: MethodSymbol if m.isPrimaryConstructor => m
        }.get.paramLists.head

        val companion = tpe.typeSymbol.companion
        val (toParams, fromParams) = fields.map { field =>
            val name = field.name.toTermName
            val decoded = name.decodedName.toString
            val rtype = tpe.decl(name).typeSignature

            (q"$decoded -> t.$name", q"map($decoded).asInstanceOf[$rtype]")

        }.unzip

        q"""
        new CaseClassMapConverter[$tpe] {
         def toMap(t: $tpe): Map[String,Any] = Map(..$toParams)
         def fromMap(map: Map[String,Any]): $tpe = $companion(..$fromParams)
        }
       """
    }
}
```
