---

##### mybatis架构

![mybatis架构](http://upload-images.jianshu.io/upload_images/4943997-13a8ed887a256213.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

- dataSource 数据源
- sqlSessionFactory -----> org.mybatis.spring.SqlSessionFactoryBean
    - dataSource
    - configLocation
    - mapperLocations

- MapperScannerConfigurer(动态代理)
    - 让spring将代理类注入到spring容器中，批量管理mapper
    - basePackage ---> value  具体mapper接口的位置
    - sqlSessionFactoryBeanName ---> value    sqlSessionFactory

- transactionManager 事务管理器 ----> `org.springframework.jdbc.datasource.DataSourceTransactionManager`
    - property 为 `dataSource` 

---

##### 声明式事务

声明式事务分为**注解式**和**Xml配置式**

###### 1.基于XML配置式

需要我们写有规律的方法名，xml定义如下

```xml

<bean id="transactionManager" class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
        <property name="dataSource" ref="dataSource"></property>
</bean>

<!-- 定义事务通知 -->
<tx:advice id="txAdvice" transaction-manager="transactionManager">
    <!-- 定义方法的过滤规则 -->
    <tx:attributes>
        <tx:method name="create*" propagation="REQUIRED" rollback-for="Exception"/>
        <tx:method name="insert*" propagation="REQUIRED" rollback-for="Exception"/>
        <tx:method name="save*" propagation="REQUIRED" rollback-for="Exception"/>
        <tx:method name="update*" propagation="REQUIRED" rollback-for="Exception"/>
        <tx:method name="edit*" propagation="REQUIRED" rollback-for="Exception"/>
        <tx:method name="delete*" propagation="REQUIRED" rollback-for="Exception"/>
        <tx:method name="remove*" propagation="REQUIRED" rollback-for="Exception"/>
        <tx:method name="*" propagation="REQUIRED" read-only="true"/>
    </tx:attributes>
</tx:advice>

<!-- 定义AOP配置 -->
<aop:config>
    <!-- 定义一个切入点 -->
    <aop:pointcut expression="execution(public * com.hxqc.data.gather.*.*.*.service.*.*(..))" id="txService"/>
    <!-- 对切入点和事务的通知，进行适配 -->
    <aop:advisor advice-ref="txAdvice" pointcut-ref="txService"/>
</aop:config>


```

---

###### 2.基于注解式

```xml
<bean id="transactionManager" class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
        <property name="dataSource" ref="dataSource"></property>
</bean>

<tx:annotation-driven transaction-manager="transactionManager"/>
<!-- 使用cglib的代理方式 -->
<!-- <tx:annotation-driven transaction-manager="transactionManager" proxy-target-class="true"/> -->

```

**说明**:
`transaction-manager`：指定事务管理器名字，默认为transactionManager，当使用其他名字时需要明确指定
`proxy-target-class`：表示将使用的代码机制，默认`false`表示使用**JDK代理**，如果为`true`将使用**CGLIB代理**
`order`：定义事务通知顺序，默认`Ordered.LOWEST_PRECEDENCE`，表示将顺序决定权交给AOP来处理。

---

#### 声明式事务的坑

这个坑也是比较严重的,当我在一次测试中时，发现service发生了异常，但是数据并没有回滚，因为数据库里的数据还是被修改了.后来发现是事务的动态代理压根就没有生效.找了很久原因,原来是这样：

---

在SSM整合中，有`spring-context.xml`和`springmvc.xml` 这两个配置文件，需要加载，我们一般的做法是，让`springmvc`只扫描带`@Controller`注解的类，让`spring-context`去扫描`@Service`和`@Component`等注解的类。

##### 首先看我的工程目录(简易)

![工程目录.png](http://upload-images.jianshu.io/upload_images/6393906-0ec9333ad2135617.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

##### 以下是我两个配置文件的扫包配置.

##### `spring-context.xml`(对应工程文件中的`applicationContext.xml`)

```xml
<!-- 配置扫描除controller注解（springmvc扫描的包）以外的包 -->
<context:component-scan base-package="com.zs.*">
    <context:exclude-filter type="annotation"
			expression="org.springframework.stereotype.Controller" />
</context:component-scan>

```

##### `springmvc.xml`

```xml

<!-- 扫描注解包 -->
<context:component-scan base-package="com.zs.*">
	<context:include-filter type="annotation"
			expression="org.springframework.stereotype.Controller" />
</context:component-scan>

```

---

如上，我原本以为，配置了`include-filter`后，`springmvc`就只会去扫描带`controller`的类了，后来发现事务一直不生效，原来这里，他把`@service`的类也给扫描了.

#### 为什么springmvc扫描以后，事务就不生效了?

---

`Spring MVC`启动时的配置文件，包含组件扫描、url映射以及设置freemarker参数，让spring不扫描带有`@Service`注解的类。为什么要这样设置？因为`springmvc.xml`与`spring-context.xml`不是同时加载，如果不进行这样的设置，那么，`springmvc`就会将所有带`@Service`注解的类都扫描到容器中，等到加载`spring-context.xml`的时候，会因为容器已经存在`Service`类，使得cglib将不对Service进行代理，直接导致的结果就是在`spring-context`中的事务配置不起作用，**发生异常时，无法对数据进行回滚**。

#### 解决方法:

##### 1.在`springmvc.xml`的扫包处，排除`@Service`，就是不扫`@Service`的类

```xml
<context:exclude-filter type="annotation" expression="org.springframework.stereotype.Service"/>

```

##### 2.将扫包路径写的更详细一点，直接定位到web层(推荐这个方法)

```xml

<context:component-scan base-package="com.zs.web">
    <context:include-filter type="annotation"
			expression="org.springframework.stereotype.Controller" />
</context:component-scan>

```

##### 关于spring使用jdk动态代理，和cglib动态代理，[请参考](http://www.cnblogs.com/xiohao/p/4146384.html)
