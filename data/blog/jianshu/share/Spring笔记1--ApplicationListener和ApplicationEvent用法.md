标签: `spring`

---

#####什么是ApplicationContext?
它是spring的核心，Context我们通常解释为上下文环境，但是理解成容器会更好些，ApplicationContext则是应用的容器，Spring把Bean（object）放在容器中，需要用就通过get方法取出来。

---

######ApplicationEvent
是个抽象类，里面只有一个构造函数和一个长整型的timestamp。

---

######ApplicationListener
是一个接口，里面只有一个onApplicationEvent方法，所以自己的类在实现该接口的时候，要实装该方法。
如果在上下文中部署一个实现了ApplicationListener接口的bean，那么每当在一个ApplicationEvent发布到 ApplicationContext时，这个bean得到通知。其实这就是标准的Oberver设计模式。

---

下面给出例子：######首先创建一个ApplicationEvent实现类：

---

```java
package org.listener;

import org.springframework.context.ApplicationEvent;
/**
 *
 * @author maple
 *
 */
//@Component 这里不要被spring管理
public class EmailEvent extends ApplicationEvent{

	 /**
	 *
	 */
	private static final long serialVersionUID = 1L;
	public String address;
	public String text;

    public EmailEvent(Object source, String address, String text) {
        super(source);
        this.address = address;
        this.text = text;
    }

    public void print(){
    	System.out.println("hello spring event!");
    }

}
```

######给出监听器：

```java
package org.listener;

import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;
/**
 *
 * @author maple
 *
 */
@Component //监听器被spring管理
public class EmailListener implements ApplicationListener<EmailEvent>{

	@Override
	public void onApplicationEvent(EmailEvent emailEvent) {
        emailEvent.print();
        System.out.println("the source is:"+emailEvent.getSource());
        System.out.println("the address is:"+emailEvent.address);
        System.out.println("the email's context is:"+emailEvent.text);
	}

}

```

######applicationContext.xml文件配置：

```
<!-- 扫包 -->
   <context:component-scan base-package="org.listener"/>
```

######测试类：

```
package org.listener;

import org.springframework.context.ApplicationContext;
import org.springframework.context.support.ClassPathXmlApplicationContext;
/**
 *
 * @author maple
 *
 */
public class Test {
    public static void main(String[] args) {
        ApplicationContext context = new ClassPathXmlApplicationContext("classpath:applicationEvent.xml");

    EmailEvent event = new EmailEvent("hello","boylmx@163.com","this is a email text!");
    context.publishEvent(event);

    }
}
```

######测试结果：

```
hello spring event!
the source is:hello
the address is:boylmx@163.com
the email's context is:this is a email text!
```
