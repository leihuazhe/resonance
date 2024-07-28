# WebArgumentResolver

`spring-boot` `session`

---

**java**系统开发的时候，相信大家都需要获取当前登录用户，用来记录操作员等。

而平时我们极有可能用的这种办法： request.getSession().getAttribute("CURRENT_USER")

比如以前保存资源是这样的：

```java
@RequestMapping(value = "save.json", method = RequestMethod.POST)
@ResponseBody
public String saveResource(HttpServletRequest request, Resource res){

// 这里的res，是从页面表单提交过来的

// 这里的res里面，可能需要记录操作人，那么需要获取到当前用户

CurrentUser currentUser = request.getSession().getAttribute("CURRENT_USER");

}
```

---

这里我们需要写：request.getSession().getAttribute("CURRENT_USER");

这没有任何问题，但是能否这一句代码都不写，直接进入这个方法就把CURRENT_USER注入好了？

比如进入下面这个方法时，框架能否注入了当前用户CurrentUser ？yes，请继续看下面。

```
@RequestMapping(value = "save.json", method = RequestMethod.POST)
@ResponseBody
public String saveResource(CurrentUser user, Resource res){

}
```

开工：

##### 1. 自定义ArgumentResolver实现WebArgumentResolver接口

源码如下：

```
public class CurrentUserArgumentResolver implements WebArgumentResolver {
    @Override
    public Object resolveArgument(MethodParameter methodParameter, NativeWebRequest webRequest) {
        if(methodParameter.getParameterType() != null
                && methodParameter.getParameterType().equals(CurrentUser.class)){

// 判断controller方法参数有没有写当前用户，如果有，这里返回即可，通常我们从session里面取出来

            HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
            Object currentUser = request.getSession().getAttribute("CURRENT_USER");
            return currentUser;
        }
        return UNRESOLVED;
    }
}
```

#### 2. 配置<mvc:annotation-driven>

```
<mvc:annotation-driven>

        <mvc:argument-resolvers>

            <bean class="com.xxx.CurrentUserArgumentResolver" />

        </mvc:argument-resolvers>

    </mvc:annotation-driven>
```

这里的com.xxx.CurrentUserArgumentResolver就是上面写的CurrentUserArgumentResolver路径

#### 3. 测试

```
@RequestMapping(value = "save.json", method = RequestMethod.POST)
@ResponseBody
public String saveResource(CurrentUser user, Resource res){

// 这里的res，是从页面表单提交过来的

// 看看这里的user，是不是已经有值了？

System.out.println(user);

}
```

ok，是不是发现这个小招可以写到自己的框架里面呢

---

###本章完
