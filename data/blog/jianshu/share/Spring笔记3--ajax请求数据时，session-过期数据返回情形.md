> 关键点：`springmvc`拦截器

### 需求

我们用`jquery ajax `请求 后台 用 `spring `拦截 `session` 过期

- 1. 过期则跳转指定页面 怎么弄呀

- 2.session的时候 ajax 有时候也会走error 方法 这个怎么写好呢

### 思路与实现方式

我们先了解一下一些必要的信息。`ajax` 请求和普通的 `http` 请求是不一样的，`Ajax`请求是`XMLHTTPRequest`对象发起的，而`http`请求是浏览器发起的。

二者不同地方体现在`HTTP`请求的头信息中。`Ajax`请求头中带有`X-Requested-With`信息，其值为`XMLHttpRequest`。而普通请求是没有的。

#### 在拦截器中进行配置

```java
public boolean preHandle(HttpServletRequest request,HttpServletResponse response, Object handler) throws Exception {
      Oper oper =(Oper)request.getSession().getAttribute(Const.SESSION_LOGIN_ADMIN_USER);

      String requestCTX = urlPathHelper.getContextPath(request);

      System.out.println(requestCTX);
      //请求完整路径，可用于登陆后跳转
      String requestUri = request.getRequestURI();
       //项目下完整路径
      String contextPath = request.getContextPath();

      String url = requestUri.substring(contextPath.length()); //请求页面

      logger.debug("======拦截器配置成功======");

      logger.debug("======拦截来自："+requestUri+"的请求=======");

      logger.debug("======拦截的页面路径是：==："+url+"=======");

      //throw new Exception("登录超时!");

      if(oper == null){//如果获取不到登录的session
      //如果是ajax请求
          if (request.getHeader("x-requested-with") != null && request.getHeader("x-requested-with").equalsIgnoreCase("XMLHttpRequest")){
                  // 响应头设置session状态
                   response.setHeader("sessionstatus", "timeout");
                  //session超时，ajax访问返回false
                  return false;
           }
      }
      return super.preHandle(request, response, handler);
}
```

上述代码解析，先进行判断，如果`session`过期的话，进行上述设置。
然后再前端页面主`js`文件中进行统一设置，有了配置文件，也有了拦截器，在拦截器中已经设置了返回的信息，而这些信息会被`JavaScript`获取到。

#### 前端请求处理

`$.ajaxSetup`方法是来设置`AJAX`请求默认选项的，我们可以认为是全局的选项设置，因此可以将这段代码提到外部`js`文件中.

```js
$.ajaxSetup({
  type: 'POST',
  contentType: 'application/x-www-form-urlencoded;charset=utf-8',
  complete: function (xhr, status) {
    var sessionStatus = xhr.getResponseHeader('sessionstatus')
    if (sessionStatus == 'timeout') {
      //var top = getTopWinow();
      //var yes = confirm('由于您长时间没有操作, session已过期, 请重新登录.');
      //if (yes) {
      alert('登录超时,请重新登录！')
      window.location.href = '/admin/login/out.do'

      //}
    }
  },
})

/**

* 在页面中任何嵌套层次的窗口中获取顶层窗口

* @return 当前页面的顶层窗口对象

*/

function getTopWinow() {
  var p = window
  while (p != p.parent) {
    p = p.parent
  }
  return p
}
```
