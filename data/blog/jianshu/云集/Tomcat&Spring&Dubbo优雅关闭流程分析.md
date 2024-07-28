> 云集技术平台以分布式架构分层部署，整体上分为接入层(对外提供HTTP接口服务,tomcat作为容器) 和 服务层(领域划分的各独立的为服务，以Dubbo作为容器)。系统迭代的过程中，难免需要对服务进行升级，在这点上，云集架构平台通过插件等形式分别提供了对接入层和dubbo服务层的优雅升级。

本文将聚焦一下基于tomcat的接入层服务在进行关闭时，其各个组件的优雅关闭流程，我们接入层同时会作为一个dubbo-consumer 的角色，并由Spring容器驱动。

因此我们最终的目标是完成由 **tomcat容器的优雅关闭 -> Spring容器的关闭 -> Dubbo 容器的关闭**。这三者关闭的顺序可能是并行的，也可能是串行的，这个需要是根据 spring 和 dubbo 的不同版本来决定的，下面我们逐一分析。

## 1 Tomcat 容器优雅关闭

> 使用优雅的 kill -15 (kill 不带 -9) 来关闭tomcat容器时, tomcat会收到 kill 信号，并触发 tomcat 在启动时就注册好的JVM优雅关闭钩子，详见如下代码

```java
public void start() {
	//... 部分代码省略 ...
    // Register shutdown hook
    //核心逻辑,注册shutdown hook 勾子
    if (useShutdownHook) {
        if (shutdownHook == null) {
            shutdownHook = new CatalinaShutdownHook();
        }
        Runtime.getRuntime().addShutdownHook(shutdownHook);
    }
    //... 部分代码省略 ...
}
protected class CatalinaShutdownHook extends Thread {
    @Override
    public void run() {
        try {
            if (getServer() != null) {
                Catalina.this.stop();
            }
        } catch (Throwable ex) {
            ExceptionUtils.handleThrowable(ex);
            log.error(sm.getString("catalina.shutdownHookFail"), ex);
        } finally {
            // If JULI is used, shut JULI down *after* the server shuts down
            // so log messages aren't lost
            LogManager logManager = LogManager.getLogManager();
            if (logManager instanceof ClassLoaderLogManager) {
                ((ClassLoaderLogManager) logManager).shutdown();
            }
        }
    }
}
```

### 结论

Tomcat 在启动之后注册了 `CatalinaShutdownHook `,当收到 kill 信号时，其调用的是 `Catalina.this.stop()` 的方法来停止 tomcat。那么如果我们想在 tomcat 准备stop 之前，阻止或者暂缓其继续stop,就可以在这里增强这个方法来做文章了。

## 2 传统 SpringWeb 的优雅关闭

> 在本文中 **传统SpringWeb** 指的是基于 Springmvc 和Spring 父子容器的模式,多数通过xml来进行配置的Spring应用。来探讨其优雅关闭流程是什么样的。

上文介绍了tomcat的关闭是怎么触发的。Tomcat的在关闭的过程中会逐一关闭注册在其上的 Servlet 和 Listener 以及 Filter 等。而在关闭Servlet和Listener的这个过程中,**会触发分别关闭 springmvc 和 spring 容器**。

Springmvc 核心就是一个 `servlet`，因此能够直接接收到 `tomcat` 的关机信号。

- Servlet 接口

```java
public interface Servlet {
   //omitted method

    void destroy();
}
```

- Springmvc 核心 Servlet FrameworkServlet
  `FrameworkServlet` 实现了 Servlet 的 destroy 方法，并在方法里面调用了 `applicationContext.close()` 的方法，这样spring容器即可以关闭。

```java
@Override
public void destroy() {
	// Only call close() on WebApplicationContext if locally managed...
	if (this.webApplicationContext instanceof ConfigurableApplicationContext && !this.webApplicationContextInjected) {
			((ConfigurableApplicationContext) this.webApplicationContext).close();
	}
}
```

Spring root容器(父容器) 则是通过实现 ServletContextListener 这个类来实现优雅关闭的，如下代码所示:

```java
public class ContextLoaderListener extends ContextLoader implements ServletContextListener {
	/**
	 * Close the root web application context.
	 */
	@Override
	public void contextDestroyed(ServletContextEvent event) {
		closeWebApplicationContext(event.getServletContext());
		ContextCleanupListener.cleanupAttributes(event.getServletContext());
	}
}
```

### 结论

在传统 SpringWeb 模式下，Spring的优雅关闭是在 tomcat 开始关闭时触发的，意味着，tomcat 和 spring 的关闭是串行执行的。Spring 容器的关闭是在tomcat容器作出反应之后进行的。

### 3 SpringBoot 模式的优雅关闭

> SpringBoot 的入口类是 org.springframework.boot.SpringApplication.run,其启动和关闭逻辑和传统的SpringWeb 存在较大差别。

在 `SpringApplication.run` 的过程中，有下面这段代码是注册优雅关闭钩子的，该钩子最终执行的是 `doClose` 方法。

```java
public ConfigurableApplicationContext run(String... args) {
    // omitted...
    refreshContext(context);
    // omitted...
}

private void refreshContext(ConfigurableApplicationContext context) {
	refresh(context);
	if (this.registerShutdownHook) {
		try {
			context.registerShutdownHook();
		}
		catch (AccessControlException ex) {
			// Not allowed in some environments.
		}
	}
}
```

因此SpringBoot在接收到 kill 信号时，会触发 `org.springframework.context.support.AbstractApplicationContext` 类的 `doClose()` 方法,并开始对Spring容器进行关闭。

```java
@Override
public void registerShutdownHook() {
	if (this.shutdownHook == null) {
		// No shutdown hook registered yet.
		this.shutdownHook = new Thread() {
			@Override
			public void run() {
				synchronized (startupShutdownMonitor) {
					doClose();
				}
			}
		};
		Runtime.getRuntime().addShutdownHook(this.shutdownHook);
	}
}
```

### 结论

在 SpringBoot 以 war 包部署的情况下，tomcat 的关闭和 springboot 的关闭是并行的，因为它们各自注册了JVM关闭钩子，因此其关闭过程是不分先后的。

而在 SpringBoot 以jar包形式运行时，其tomcat容器是内嵌的模式，因此是由SpringBoot 来引导 Tomcat进行关闭，其关闭过程则是串行的。

## 4 Tomcat & 传统Spring & Springboot

上文我们分析了tomcat和传统spring是一个串行的优雅关闭机制，传统spring不会注册优雅关闭钩子，而是直接在tomcat的关闭过程中对自己进行关闭。
而springboot则是和tomcat关闭是并行的。这两种情形下都可以正常的关闭应用，不会有什么问题。但是如果我们想再tomcat收到 kill 信号之后，停顿一段时间(10s)再关闭，那么如何在tomcat容器停顿的同时，spring容器也能跟着停顿呢？

当然传统 spring是可以跟着停顿的。SpringBoot如何去做呢？

## 5 Spring 与 dubbo 2.5.x 优雅关闭

> 上文已经得出结论，tomcat的关闭与传统spring模式是串行执行的。那如果在这个过程中 dubbo2.5.x的版本是如何关闭的呢?

请看dubbo注册的优雅关闭钩子的类:
com.alibaba.dubbo.config.ProtocolConfig

```java
static {
        Runtime.getRuntime().addShutdownHook(new Thread(new Runnable() {
            public void run() {
                if (logger.isInfoEnabled()) {
                    logger.info("Run shutdown hook now.");
                }
                ProtocolConfig.destroyAll();
            }
        }, "DubboShutdownHook"));
}
```

这是一个静态代码块，并且也是自己独自像JVM关闭钩子注册，因此它和tomcat 以及 spring注册的钩子不同，其又是一个特立独行的存在。它不与spring和tomcat的关闭同步，有可能tomcat刚准备开始关闭时，dubbo已经开始关闭了。

这样就会造成很多问题，dubbo容器依托于spring容器，外界的调用通过spring容器最终调用到dubbo，如果此时spring容器没有销毁，仍有请求进来，但是dubbo容器却已经销毁了，这就会造成异常。

### 结论

dubbo2.5.3的优雅关闭是存在明显缺陷的，因为它不能与spring容器同步串行。正常情况下，应该由spring容器触发关闭之后，再来触发dubbo的优雅关闭。
比如spring容器在关闭时会发送一个`ContextClosedEvent`事件，那dubbo可以去监听这个事件，并在事件中处理自己关闭的逻辑。

## 6 Spring 与 dubbo2.6.x 优雅关闭

> dubbo2.6.x版本的优雅关闭逻辑的类变了，它移动到了 `com.alibaba.dubbo.config.DubboShutdownHook.destroyAll` 之下，并且它有支持监听 spring close 事件并触发优雅关闭，同时自身也会注册优雅关闭钩子。

- DubboShutdownHook

```java
public void destroyAll() {
       if (!destroyed.compareAndSet(false, true)) {
           return;
       }
       // destroy all the registries
       AbstractRegistryFactory.destroyAll();
       // destroy all the protocols
       ExtensionLoader<Protocol> loader = ExtensionLoader.getExtensionLoader(Protocol.class);
       for (String protocolName : loader.getLoadedExtensions()) {
           try {
               Protocol protocol = loader.getLoadedExtension(protocolName);
               if (protocol != null) {
                   protocol.destroy();
               }
           } catch (Throwable t) {
               logger.warn(t.getMessage(), t);
           }
       }
}
```

2.6.x 在 `com.alibaba.dubbo.config.AbstractConfig` 类注册了优雅关闭的钩子,这意味着它又自己单独去注册钩子了，收到kill信号后，不会和其他组件串行着来。

```java
static {
    Runtime.getRuntime().addShutdownHook(DubboShutdownHook.getDubboShutdownHook());
}
```

但是dubbo2.6.x还做了另外一个蜜汁操作，
它在 com.alibaba.dubbo.config.spring.extension.SpringExtensionFactory类中监听了spring close 事件，然后再次调用了DubboShutdownHook的destroyAll 方法，这样明显这个destroyAll会调用两次，一次是dubbo自己的优雅关闭钩子线程里面，一次是在spring的线程里面。

```java
 private static class ShutdownHookListener implements ApplicationListener {
        @Override
        public void onApplicationEvent(ApplicationEvent event) {
            if (event instanceof ContextClosedEvent) {
                // we call it anyway since dubbo shutdown hook make sure its destroyAll() is re-entrant.
                // pls. note we should not remove dubbo shutdown hook when spring framework is present, this is because
                // its shutdown hook may not be installed.
                DubboShutdownHook shutdownHook = DubboShutdownHook.getDubboShutdownHook();
                shutdownHook.destroyAll();
            }
        }
 }
```

### 结论

dubbo2.6.x 想法是好的，想通过接收 Spring ContextClosedEvent 事件时再开始关闭dubbo,以达到Dubbo后于Spring容器关闭，从而实现串行优雅关闭。

但是由于dubbo自身也注册了一个优雅关闭钩子线程，这样在接收kill 信号时,这个钩子仍然会被触发，导致其无法和Spring串行的执行关闭，这样它上面的意图基本上就是无效的了，dubbo仍然没有做到优雅关闭。

### 7.Spring 与 dubbo2.7.x 优雅关闭

> dubbo研发团队可能终于发现了这个问题，于是在 2.7.x 的版本中我们看到修复了，看看他们是怎么修复的。

同样是 SpringExtensionFactory 类，增加了下面一个操作:

```java
 public static void addApplicationContext(ApplicationContext context) {
        CONTEXTS.add(context);
        if (context instanceof ConfigurableApplicationContext) {
            ((ConfigurableApplicationContext) context).registerShutdownHook();
            DubboShutdownHook.getDubboShutdownHook().unregister();
        }
        BeanFactoryUtils.addApplicationListener(context, SHUTDOWN_HOOK_LISTENER);
    }
```

这里意图就是把dubbo之前自己单独注册的关闭钩子给移除掉。因为 `ConfigurableApplicationContext` 在关闭的时候会发送 `ContextClosedEvent`, 在这里再去执行dubbo关闭逻辑即可。

### 总结

通过上面的曲线救国策略，一波三折，dubbo 2.7.x 终于做到能够和spring一起进行串行的关闭了，这样在 Spring -> Dubbo 这个环境能够保证了串行执行。
而上文中介绍的 Tomcat -> Spring 也存在串行执行,因此我们能够看到 tomcat -> spring -> dubbo 三者的串行关闭的情形，这也是我们希望预期到的关闭模式，因为这种模式下关闭，是能够保证优雅关闭的。

## 8 拓展

> 本文详细理清了接入层的三个角色Tomcat、Spring、Dubbo 不同版本不同形式的优雅关闭顺序和流程，并基于此理论成功通过云集内部字节码增强平台Jagent 对接入层实现了优雅关闭。接下来，将拓展一下 tomcat 接入层的 扩容缩容方案

### 动态扩容缩容

现阶段对接入层 tomcat 进行扩容和缩容以后,需要在 nginx 配置文件中修改 **增加\减少** upstream 中对应的 server 做到,下面介绍的方案是动态的去修改这些 upstream.

#### 1 nacos + confd 模式

confd 是一个轻量级的配置管理工具，可以通过查询后端存储系统来实现第三方系统的动态配置管理，如 Nginx、Tomcat、hHaproxy、Docker 配置等。 confd 目前支持的后端有 etcd、Zookeeper 等，Nacos 1.1 版本通过对 confd 定制支持 Nacos 作为后端存储。
因此我们结合 nacos 中已注册的 tomcat 节点信息，并配合 confd 实时更新 nginx upstream 来做到 对接入层的 动态扩容与所容。

#### 2 [ngx_http_dyups_module](https://github.com/yzprofile/ngx_http_dyups_module) + http curl 模式

ngx_http_dyups_module 是一个以模板方式支持实时更新 nginx 配置的插件，通过 http curl 请求可以动态更新模板中的 upstream 以实现 对后端tomcat节点的动态扩容与所容

## 更新

关于 SpringBoot 外置 Tomcat 优雅关闭是并行的问题，看下面这张图：
SpringBoot 1.x 是并行的。SpringBoot 2.x 修复了这个问题。

![image.png](https://upload-images.jianshu.io/upload_images/6393906-2dea739fa6a4505e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
