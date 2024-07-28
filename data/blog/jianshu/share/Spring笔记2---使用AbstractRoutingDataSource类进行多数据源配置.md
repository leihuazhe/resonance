> 多数据源在项目中很常见，举几个需求，如页面展示的数据需要从不同的数据库中去查询，修改等，例如数据库的读写分离等，配置多数据源要考虑到如下的情况

- 单个数据源的情形
  ![图1.jpg](http://upload-images.jianshu.io/upload_images/6393906-8a5b23f9842ad30f.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
- 多个数据源的情形

![图2.jpg](http://upload-images.jianshu.io/upload_images/6393906-62f7d807911eae65.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

每增加一个数据源就要去配置一个`sessionFactory`，这样比较麻烦，于是`spring`的`AbstractRoutingDataSource`类由此而生

它的实现原理是扩展Spring的`AbstractRoutingDataSource`抽象类（该类充当了`DataSource`的路由中介, 能在运行时, 根据某种key值来动态切换到真正的`DataSource`上。）
从AbstractRoutingDataSource的源码中：

```
public abstract class AbstractRoutingDataSource extends AbstractDataSource implements InitializingBean
```

我们可以看到，它继承了AbstractDataSource，而AbstractDataSource不就是javax.sql.DataSource的子类，So我们可以分析下它的getConnection方法：

```java
public Connection getConnection() throws SQLException {
    return determineTargetDataSource().getConnection();
}

public Connection getConnection(String username, String password) throws SQLException {
     return determineTargetDataSource().getConnection(username, password);
}

```

获取连接的方法中，重点是determineTargetDataSource()方法，看源码：

```
protected DataSource determineTargetDataSource() {
        Assert.notNull(this.resolvedDataSources, "DataSource router not initialized");
        Object lookupKey = determineCurrentLookupKey();
        DataSource dataSource = this.resolvedDataSources.get(lookupKey);
        if (dataSource == null && (this.lenientFallback || lookupKey == null)) {
            dataSource = this.resolvedDefaultDataSource;
        }
        if (dataSource == null) {
            throw new IllegalStateException("Cannot determine target DataSource for lookup key [" + lookupKey + "]");
        }
        return dataSource;
    }

```

上面这段源码的重点在于determineCurrentLookupKey()方法，这是AbstractRoutingDataSource类中的一个抽象方法，而它的返回值是你所要用的数据源dataSource的key值，有了这个key值，resolvedDataSource（这是个map,由配置文件中设置好后存入的）就从中取出对应的DataSource，如果找不到，就用配置默认的数据源。
看完源码，应该有点启发了吧，没错！你要扩展AbstractRoutingDataSource类，并重写其中的determineCurrentLookupKey()方法，来实现数据源的切换：

---

接下来，将展示一个多数据源配置demo  
1.在xml中配置多个数据源

- DataSource 1

```xml
<bean id="erpDataSource" class="com.alibaba.druid.pool.DruidDataSource"
          init-method="init" destroy-method="close">
        <!-- 基本属性 url、user、password -->
       <!-- <property name="connectionProperties" value="${db_erp.driver}"/>-->
        <property name="url" value="${db_erp.url}"/>
        <property name="username" value="${db_erp.username}"/>
        <property name="password" value="${db_erp.password}"/>

        <!-- 配置初始化大小、最小、最大 -->
        <property name="initialSize" value="1"/>
        <property name="minIdle" value="1"/>
        <property name="maxActive" value="20"/>

        <!-- 配置获取连接等待超时的时间 -->
        <property name="maxWait" value="60000"/>

        <!-- 配置间隔多久才进行一次检测，检测需要关闭的空闲连接，单位是毫秒 -->
        <property name="timeBetweenEvictionRunsMillis" value="60000"/>

        <!-- 配置一个连接在池中最小生存的时间，单位是毫秒 -->
        <property name="minEvictableIdleTimeMillis" value="300000"/>

        <property name="validationQuery" value="SELECT 'x'"/>
        <property name="testWhileIdle" value="true"/>
        <property name="testOnBorrow" value="false"/>
        <property name="testOnReturn" value="false"/>

        <!-- 打开PSCache，并且指定每个连接上PSCache的大小 -->
        <property name="poolPreparedStatements" value="true"/>
        <property name="maxPoolPreparedStatementPerConnectionSize"
                  value="20"/>

        <!-- 配置监控统计拦截的filters -->
        <property name="filters" value="stat"/>
    </bean>
```

- DataSource 2

```xml
    <bean id="ncDataSource" class="com.alibaba.druid.pool.DruidDataSource"
          init-method="init" destroy-method="close">
        <!-- 基本属性 url、user、password -->
      <!--  <property name="connectionProperties" value="${db_nc.driver}"/>-->
        <property name="url" value="${db_nc.url}"/>
        <property name="username" value="${db_nc.username}"/>
        <property name="password" value="${db_nc.password}"/>

        <!-- 配置初始化大小、最小、最大 -->
        <property name="initialSize" value="1"/>
        <property name="minIdle" value="1"/>
        <property name="maxActive" value="20"/>

        <!-- 配置获取连接等待超时的时间 -->
        <property name="maxWait" value="60000"/>

        <!-- 配置间隔多久才进行一次检测，检测需要关闭的空闲连接，单位是毫秒 -->
        <property name="timeBetweenEvictionRunsMillis" value="60000"/>

        <!-- 配置一个连接在池中最小生存的时间，单位是毫秒 -->
        <property name="minEvictableIdleTimeMillis" value="300000"/>

        <property name="validationQuery" value="SELECT 'x'"/>
        <property name="testWhileIdle" value="true"/>
        <property name="testOnBorrow" value="false"/>
        <property name="testOnReturn" value="false"/>

        <!-- 打开PSCache，并且指定每个连接上PSCache的大小 -->
        <property name="poolPreparedStatements" value="true"/>
        <property name="maxPoolPreparedStatementPerConnectionSize"
                  value="20"/>

        <!-- 配置监控统计拦截的filters -->
        <property name="filters" value="stat"/>
    </bean>
```

- DataSource3

```xml
    <bean name="oracleDataSource" class="com.alibaba.druid.pool.DruidDataSource" init-method="init"
          destroy-method="close">
        <!--<property name="connectionProperties" value="${db_oracle.driver}"/>-->
        <!-- 实时库121DG -->
        <property name="url" value="${db_oracle.url}"/>
        <property name="username" value="${db_oracle.username}"/>
        <property name="password" value="${db_oracle.password}"/>
        <!-- 配置初始化大小、最小、最大 -->
        <property name="initialSize" value="1"/>
        <property name="minIdle" value="1"/>
        <property name="maxActive" value="20"/>
        <!-- 配置获取连接等待超时的时间 -->
        <property name="maxWait" value="60000"/>
        <!-- 配置间隔多久才进行一次检测，检测需要关闭的空闲连接，单位是毫秒 -->
        <property name="timeBetweenEvictionRunsMillis" value="60000"/>
        <!-- 配置一个连接在池中最小生存的时间，单位是毫秒 -->
        <property name="minEvictableIdleTimeMillis" value="300000"/>
        <property name="validationQuery" value="SELECT 'x' FROM DUAL"/>
        <property name="testWhileIdle" value="true"/>
        <property name="testOnBorrow" value="false"/>
        <property name="testOnReturn" value="false"/>
        <!-- 打开PSCache，并且指定每个连接上PSCache的大小 -->
        <property name="poolPreparedStatements" value="true"/>
        <property name="maxPoolPreparedStatementPerConnectionSize" value="20"/>
        <!-- 配置监控统计拦截的filters -->
        <property name="filters" value="stat"/>
    </bean>

```

---

2、写一个ThreadLocalDynamicDataSource类继承AbstractRoutingDataSource，并实现determineCurrentLookupKey方法

```
package com.hxqc.basic.dependency.datasource;

import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

public class ThreadLocalRountingDataSource extends AbstractRoutingDataSource {
	@Override
	protected Object determineCurrentLookupKey() {
		return DataSourceTypeManager.get();
	}
}

```

3、编写DataSourceTypeManager执行类，并利用ThreadLocal以空间换时间的方式解决线程安全问题

```
package com.hxqc.basic.dependency.datasource;

public class DataSourceTypeManager {
	private static final ThreadLocal<DataSources> dataSourceTypes = new ThreadLocal<DataSources>() {
		@Override
		protected DataSources initialValue() {
			return DataSources.DATASOURCE_DEFAULT;
		}
	};

	public static DataSources get() {
		return dataSourceTypes.get();
	}

	public static void set(DataSources dataSourceType) {
		dataSourceTypes.set(dataSourceType);
	}

	public static void reset() {
		dataSourceTypes.set(DataSources.DATASOURCE_DEFAULT);
	}

    public static void clearDataSources () {
		dataSourceTypes.remove();
	}
}

```

上面代码利用initialValue方法，调用初始化时指定的DataSources 类型，
这里DataSources 为枚举类型，里面定义三种数据源的名称，代码如下：

```
package com.hxqc.basic.dependency.datasource;

public enum DataSources {
	 DATASOURCE,DATASOURCE_DEFAULT,DATASOURCE_ORACLE
}
```

4、数据源配置

```
<bean id="multipleDataSource"
          class="com.hxqc.basic.dependency.datasource.ThreadLocalRountingDataSource">
        <property name="defaultTargetDataSource" ref="ncDataSource"/>
        <property name="targetDataSources">
            <map key-type="com.hxqc.basic.dependency.datasource.DataSources">
                <entry key="DATASOURCE" value-ref="erpDataSource"/>
                <entry key="DATASOURCE_DEFAULT" value-ref="ncDataSource"/>
                <entry key="DATASOURCE_ORACLE" value-ref="oracleDataSource"/>
            </map>
        </property>
    </bean>

```

5.在DAOImpl中切换数据源 或者配置aop切面根据不同的包下面的数据，采用不同的数据源
1,在Dao层直接切换数据源,如切换到默认数据源

```
DataSourceTypeManager.set(DataSources.DATASOURCE_DEFAULT)
```

2.根据aop进行动态切换
aop配置

```
<bean id="dataSourceInterceptor" class="com.hxqc.basic.dependency.interceptor.DataSourceInterceptor"/>
    <aop:config>
        <aop:aspect id="dataSourceAspect" ref="dataSourceInterceptor">
            <aop:pointcut id="datasource" expression="execution(* com.hxqc.data.gather.core.erp.*.mapper..*.*(..))"/>
            <aop:pointcut id="datasource_oracle" expression="execution(* com.hxqc.data.gather.core.oracle.*.mapper..*.*(..))"/>
            <aop:pointcut id="datasource_default" expression="execution(* com.hxqc.data.gather.core.nc.*.mapper..*.*(..))"/>
            <aop:before method="setDataSource" pointcut-ref="datasource"/>
            <aop:before method="setDataSourceDefault" pointcut-ref="datasource_default"/>
            <aop:before method="setDataSourceOracle" pointcut-ref="datasource_oracle"/>
        </aop:aspect>
    </aop:config>
```

解释，这里定义三个切面，分别对应三个数据源，如在oracle包下的，动态切换到oracle数据源
然后配置切面类

```
package com.hxqc.basic.dependency.interceptor;

import com.hxqc.basic.dependency.datasource.DataSourceTypeManager;
import com.hxqc.basic.dependency.datasource.DataSources;
import com.hxqc.basic.dependency.log.LogU;
import org.aspectj.lang.JoinPoint;

/**
 *
 *
 * @author maple
 *
 */
public class DataSourceInterceptor {

	public void setDataSourceDefault(JoinPoint jp){
		DataSourceTypeManager.set(DataSources.DATASOURCE_DEFAULT);
		LogU.i("切换数据源","切换到NC数据源");
		System.out.println(jp.getTarget().getClass().getSimpleName());
	}

	public void setDataSource(JoinPoint jp){
		DataSourceTypeManager.set(DataSources.DATASOURCE);
		LogU.i("切换数据源","切换到ERP数据源");
	}

	public void setDataSourceOracle(JoinPoint jp){
		DataSourceTypeManager.set(DataSources.DATASOURCE_ORACLE);
		LogU.i("切换数据源","切换到Oracle数据源");
	}
}

```

`问题:`多数据源切换是成功了，但牵涉到事务呢？单数据源事务是ok的，但如果多数据源需要同时使用一个事务呢？这个问题有点头大，网络上有人提出用atomikos开源项目实现JTA分布式事务处理。你怎么看？

---

本文源码:http://git.oschina.net/youjie1/may-dynamic-datasource
本章完(`参考：http://www.cnblogs.com/davidwang456/p/4318303.html`)
