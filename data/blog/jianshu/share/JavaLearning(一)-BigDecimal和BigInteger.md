### BigInteger详解

---

- 基本函数

#### 1.valueOf(parament); 将参数转换为制定的类型

```java
比如 int a=3;

BigInteger b=BigInteger.valueOf(a);

则b=3;

String s=”12345”;

BigInteger c=BigInteger.valueOf(s);

则c=12345;
```

#### 2.add(); 大整数相加

```
BigInteger a=new BigInteger(“23”);

BigInteger b=new BigInteger(“34”);

a.add(b);
```

#### 3.subtract(); 相减

#### 4.multiply(); 相乘

#### 5.divide(); 相除取整

#### 6.remainder(); 取余

#### 7.pow(); a.pow(b)=a^b

#### 8.gcd(); 最大公约数

#### 9.abs(); 绝对值

#### 10.negate(); 取反数

#### 11.mod(); a.mod(b)=a%b=a.remainder(b);

#### 12.max(); min();

#### 13.punlic int comareTo();

#### 14.boolean equals(); 是否相等

---

### BigInteger构造函数：

---

一般用到以下两种：

`BigInteger(String val);`

将指定字符串转换为十进制表示形式；

`BigInteger(String val,int radix);`

将指定基数的 BigInteger 的字符串表示形式转换为 BigInteger

Ⅱ.基本常量：

```
A=BigInteger.ONE 1

B=BigInteger.TEN 10

C=BigInteger.ZERO 0
```

Ⅲ.基本操作

1. 读入：

用Scanner类定义对象进行控制台读入,Scanner类在java.util.\*包中

```
Scanner cin=new Scanner(System.in);// 读入

while(cin.hasNext()) //等同于!=EOF

{

int n;

BigInteger m;

n=cin.nextInt(); //读入一个int;

m=cin.BigInteger();//读入一个BigInteger;

System.out.print(m.toString());

}
```

---

```
if( a.compareTo(b) == 0 ) System.out.println("a == b"); //大整数a==b

else if( a.compareTo(b) > 0 ) System.out.println("a > b"); //大整数a>b

else if( a.compareTo(b) < 0 ) System.out.println("a < b"); //大整数a<b

//大整数绝对值

System.out.println(a.abs()); //大整数a的绝对值

//大整数的幂

int exponent=10;

System.out.println(a.pow(exponent)); //大整数a的exponent次幂

//返回大整数十进制的字符串表示

System.out.println(a.toString());

//返回大整数p进制的字符串表示

int p=8;

System.out.println(a.toString(p));
```

---

### BigDecimal

我们的计算机是二进制的,浮点数没有办法用二进制进行精确表示。我们的CPU表示浮点数由两个部分组成：指数和尾数，这样的表示方法一般都会失去一定的精确度，有些浮点数运算也会产生一定的误差。如：2.4的二进制表示并非就是精确的2.4。反而最为接近的二进制表示是2.3999999999999999。浮点数的值实际上是由一个特定的数学公式计算得到的。

其实java的float只能用来进行科学计算或工程计算，在大多数的商业计算中，一般采用java.math.BigDecimal类来进行精确计算。

##### 在使用BigDecimal类来进行计算的时候，主要分为以下步骤：

###### 1、用float或者double变量构建BigDecimal对象。

###### 2、通过调用BigDecimal的加，减，乘，除等相应的方法进行算术运算。

###### 3、把BigDecimal对象转换成float，double，int等类型。

一般来说，可以使用BigDecimal的构造方法或者静态方法的valueOf()方法把基本类型的变量构建成BigDecimal对象。

```
 BigDecimal b1 = new BigDecimal(Double.toString(0.48));
 BigDecimal b2 = BigDecimal.valueOf(0.48);
```

##### 对于常用的加，减，乘，除，BigDecimal类提供了相应的成员方法。

```
 public BigDecimal add(BigDecimal value);                        //加法
 public BigDecimal subtract(BigDecimal value);                   //减法
 public BigDecimal multiply(BigDecimal value);                   //乘法
 public BigDecimal divide(BigDecimal value);                     //除法
```

###### 进行相应的计算后，我们可能需要将BigDecimal对象转换成相应的基本数据类型的变量，可以使用`floatValue()`，`doubleValue()`等方法。

##### 下面是一个工具类，该工具类提供加，减，乘，除运算。

```
public class Arith {
    /**
     * 提供精确加法计算的add方法
     * @param value1 被加数
     * @param value2 加数
     * @return 两个参数的和
     */
    public static double add(double value1,double value2){
        BigDecimal b1 = new BigDecimal(Double.valueOf(value1));
        BigDecimal b2 = new BigDecimal(Double.valueOf(value2));
        return b1.add(b2).doubleValue();
    }

    /**
     * 提供精确减法运算的sub方法
     * @param value1 被减数
     * @param value2 减数
     * @return 两个参数的差
     */
    public static double sub(double value1,double value2){
        BigDecimal b1 = new BigDecimal(Double.valueOf(value1));
        BigDecimal b2 = new BigDecimal(Double.valueOf(value2));
        return b1.subtract(b2).doubleValue();
    }

    /**
     * 提供精确乘法运算的mul方法
     * @param value1 被乘数
     * @param value2 乘数
     * @return 两个参数的积
     */
    public static double mul(double value1,double value2){
        BigDecimal b1 = new BigDecimal(Double.valueOf(value1));
        BigDecimal b2 = new BigDecimal(Double.valueOf(value2));
        return b1.multiply(b2).doubleValue();
    }

    /**
     * 提供精确的除法运算方法div
     * @param value1 被除数
     * @param value2 除数
     * @param scale 精确范围
      * @return 两个参数的商
      * @throws IllegalAccessException
      */
     public static double div(double value1,double value2,int scale) throws IllegalAccessException{
         //如果精确范围小于0，抛出异常信息
         if(scale<0){
             throw new IllegalAccessException("精确度不能小于0");
         }
         BigDecimal b1 = new BigDecimal(Double.valueOf(value1));
         BigDecimal b2 = new BigDecimal(Double.valueOf(value2));
         return b1.divide(b2, scale).doubleValue();
     }
}


```
