## scala List

scala list 如果使用
list(i)的形式进行遍历，如果list数据太多，每次遍历耗时会很久。

因为有一个 head tail 的概念 。

和java的List根据角标去获取值不同。

## equals & eq & sameElement

### `Equals` 方法

`equals` 方法用于测试值的相等,也就是说,如果 obj1 和 obj2 有 **相同** 的值, obj1 equals obj2 为 true。 obj1 和 obj2 不需要指向同一个实例。

### == 和 != 方法

== 的行为与 equals 完全一样,即只测试值是否相等。当 null 在 == 左边时是个
例外:

```
p1a == null // = false

null == p1a  // = false
null == null // = true (编译警告,这永远为true)
```

### eq 和 ne 方法

`eq` 方法用于测试引用的相等性。也就是说,如果 `obj1` 和 `obj2` 指向内存中的同一个位置,
obj1 eq obj2 就为 true。这两个方法只对 AnyRef 类型有定义:

```
p1a eq p1a // = true
p1a eq p1b // = false
p1a eq p2  // = false
p1a eq null // = false
null eq p1a // = false
null eq null // = true
```

ne 方法与 eq 的相反,也就是说它与 !(obj1 eq obj2) 等价

### 数组相等和 sameElements 方法

比较两个数组,在 Scala 中并不能得出我们认为的显而易见的结果:

```
Array(1, 2) == Array(1, 2)  // = false

Array(1, 2) sameElements Array(1, 2) // = true
```

实际上,我们最好要记住, `Array` 是我们熟知和喜爱的,它是可变的原始 `Java` 数组,与
`Scala` 库中我们习惯使用的集合类型有着不同的方法。

与数组相反,序列(比如 List )的相等性的行为就符合你的期望:

```
List(1, 2) == List(1, 2)  // = true
List(1, 2) sameElements List(1, 2) // = true
```
