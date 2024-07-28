#### XML数据解析

XML数据解析是将数据文档解析成不同的格式，XML现在已经成为一种通用的数据交换格式，它具有平台无关性,语言无关性,系统无关性,给数据集成与交互带来了极大的方便。
现在解析XML有四种主流的方法，即：DOM、SAX、JDOM和DOM4J。然而这四种解析XML的方法都比较复杂，现在本文引入比较简单的XML解析API，Simple XML

---

`Simple XML`，借助第三方写好的jar包，完美实现了细节，提供读、写XML文档的2个方法`read()`和`write()`，导入工程即可使用。
   `Simple` 是一个 [Java](http://lib.csdn.net/base/java) 框架，用于简化**序列化**和**反序列化** XML 的过程。
使用 Simple，开发人员可以简化将Java 对象（POJO）转换成 XML 文档的过程 — 序列化过程。Simple 也可促进相反的过程：开发人员可以将 XML 文档转换成 POJO — 反序列化过程。
Simple 使用注解来支持序列化和反序列化过程。根据相应的 XML 文档应该如何出现，对 POJO 进行注解。一些字段被注解为属性，另一些字段被注解为元素。类通常被注解为根元素。
使用 Simple 的优势
1、首先，它促进快速应用程序开发。Simple 是如此简单，它支持开发人员快速实现健壮的、使用 XML
序列化和反序列化的应用程序，无需完成长长的学习曲线以及付出繁重的开发劳动。
2、其次，Simple 不需要配置。前面已经提到，Simple 使用注解。这些注解取代了基于 XML 的配置文件（其他框架一般都有这样的配置文件）。
3、最后，Simple 只让使用它的应用程序增加少量的内存占用。Java 归档（[Java ](http://lib.csdn.net/base/java)Archive，JAR）文件只有 239 KB。Simple 也不依赖于一系列
其他 JAR 文件，而其他框架则通常不是这样的。

---

#### Simple XML的使用：

下载归档文件,我上传的资源里有http://download.csdn[.NET](http://lib.csdn.net/base/dotnet)/detail/ljheee/9481052；获得 Simple,解压文件之后，注意在 jar 目录中有一个 JAR 文件（simple-xml-2.7.1.jar）。在编译时和运行时，类路径中需要有这个 JAR 文件。

在main()方法里实例化一个Persister
对象。就可调用read()和write()。该类是 Simple 框架的一部分，它实现了Serializer
接口。
具体案例如下

---

实体对象类`Book`

```
package com.ljh.xml;
import org.simpleframework.xml.Attribute;
import org.simpleframework.xml.Element;

public class Book {

    @Attribute(name="id",required=false)
    private String isbn;    //书号isbn
    @Element(required=false)
    private String title;     //书名
    @Element(required=false)
    private int price;        //书的价格
    @Element(required=false)
    private Author author;     //书的作者--也是个实体类

    public Book() {
    }
    public Book(String isbn, String title, int price) {
        super();
        this.isbn = isbn;
        this.title = title;
        this.price = price;
    }
    public String getIsbn() {
        return isbn;
    }
    public void setIsbn(String isbn) {
        this.isbn = isbn;
    }
    public String getTitle() {
        return title;
    }
    public void setTitle(String title) {
        this.title = title;
    }
    public int getPrice() {
        return price;
    }
    public void setPrice(int price) {
        this.price = price;
    }
    public void setAuthor(Author author) {
        this.author = author;
    }
    @Override
    public String toString() {
        return "Book [author=" + author + ", isbn=" + isbn + ", price=" + price
                + ", title=" + title + "]";
    }
}
```

---

书的作者类`Author `

```
package com.ljh.xml;
import org.simpleframework.xml.Attribute;

public class Author {
    @Attribute(required=false)
    private String name;     //作者名
    @Attribute(required=false)
    private String phone;   //作者电话
    public Author() {
        super();
    }
    public Author(String name, String phone) {
        super();
        this.name = name;
        this.phone = phone;
    }
    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }
    public String getPhone() {
        return phone;
    }
    public void setPhone(String phone) {
        this.phone = phone;
    }
    @Override
    public String toString() {
        return "Author [name=" + name + ", phone=" + phone + "]";
    }

}
```

---

数目列表类----多个对象添加到列表中`BookList `

```package com.ljh.xml;                                                        读取该列表，实现高效
import java.util.ArrayList;
import org.simpleframework.xml.*;
import org.simpleframework.xml.ElementList;
@Root
public class BookList {
    @ElementList(inline=true)
    private ArrayList<Book> list;

    public BookList() {
        list = new ArrayList<Book>();
    }
    public ArrayList<Book> getList() {
        return list;
    }

    public void add(Book b){
        list.add(b);
    }
    @Override
    public String toString() {
        return "BookList [list=" + list + "]";
    }
}


```

---

测试类`Test `

```
package com.ljh.xml;                                                         

import java.io.File;
import org.simpleframework.xml.core.Persister;
/**
 *   实例化一个Persister对象，
 *   调用read()和write()，按指定的类型[Book]解析
 */
public class Test {
    
    /**
     * Write [entity Object] to XML
     * 把实体对象--写成xml格式文档
     * @param persister
     */
    public static void write(Persister persister) {
        Book bo = new Book("XX021", "复活", 250);
        bo.setAuthor(new Author("adf","15777"));
        
        Book bo1 = new Book("XX0212", "死亡之巅", 110);
        bo1.setAuthor(new Author("kk","189"));
        
        Book bo2 = new Book("XX0213", "JVM解析", 258);
        bo2.setAuthor(new Author("pou","142"));
        
        BookList booklist = new BookList();
        booklist.add(bo);
        booklist.add(bo1);
        booklist.add(bo2);
        
        try {
            persister.write(booklist, new File("b.xml"));
        } catch (Exception e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
    }
    
    /**
     * read XML to [entity Object]
     * 读取XML文件，解析成实体对象
     * @param persister
     */
    public static void read(Persister persister) {
        try {
                                //读取File("b.xml")，解析成BookList.class类型
            BookList blist = persister.read(BookList.class,new File("b.xml"));
            System.out.println(blist.getList());
        } catch (Exception e) {
            e.printStackTrace();
        }
        
    }
    public static void main(String[] args) {
        //Persister序列化、持久化---simple-xml-2.7.1.jar里提供的[是其他人已经写好分装好的]
        Persister persister = new Persister();//实例化一个Persister
对象
//        write( persister);    //写
        read( persister);   //读
    }

}
```

### example2

```
public class DataTitle {

    @Attribute
    private String isShow;

    @Attribute
    private String dataFormat;

    @Attribute(required = false)
    private String yAxis;

    @Text
    private String title;

  //忽略getter setter
}

```

```
public class ReportConfig {
    @Element
    private String chartType;

    @Element
    private String dataExpress;

    @ElementList(entry = "title", type = DataTitle.class, inline = true, required = false)
    private List<DataTitle> titles;
}
```

对应要解析的XML

```
<reportConfig>
	<chartType>bar</chartType>

	<dataExpress>item_name,#{month_plan},#{curr_day},#{curr_month},#{completion_rate},#{gross_rate},#{single_car},#{month_ratio}</dataExpress>

	<title isShow="N" dataFormat="string">项目分析</title>
	<title isShow="Y" dataFormat="double">本月计划</title>
	<title isShow="Y" dataFormat="double">今日完成</title>
	<title isShow="Y" dataFormat="double">累计完成</title>
	<title isShow="Y" dataFormat="percent">完成率(%)</title>
	<title isShow="Y" dataFormat="percent">毛利率(%)</title>
	<title isShow="Y" dataFormat="double">单车</title>
	<title isShow="Y" dataFormat="percent">环比(%)</title>


</reportConfig>

```
