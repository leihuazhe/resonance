当使用[spring](http://lib.csdn.net/base/javaee)-Boot时，[嵌入式](http://lib.csdn.net/base/embeddeddevelopment)Servlet容器通过扫描注解的方式注册Servlet、Filter和Servlet规范的所有监听器（如HttpSessionListener监听器）。 Spring boot 的主 Servlet 为 DispatcherServlet，其默认的url-pattern为“/”。也许我们在应用中还需要定义更多的Servlet，该如何使用SpringBoot来完成呢？
在spring boot中添加自己的Servlet有两种方法，代码注册Servlet和注解自动注册（Filter和Listener也是如此）。

---

一、代码注册通过`ServletRegistrationBean`、 `FilterRegistrationBean` 和 `ServletListenerRegistrationBean` 获得控制。 也可以通过实现 `ServletContextInitializer` 接口直接注册。
二、在 SpringBootApplication 上使用`@ServletComponentScan` 注解后，Servlet、Filter、Listener 可以直接通过 `@WebServlet`、`@WebFilter`、`@WebListener` 注解自动注册，无需其他代码。
