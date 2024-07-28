### 前端项目请求 MockServer 流程

![mock](https://upload-images.jianshu.io/upload_images/6393906-f473381874d6df75.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 元数据管理

需要通过环境变量指定，文件上产的路径，可以在 `application.yml` 或者系统环境变量中进行配置。

```yml
dms:
  first:
    baseDir: /data/mock-server/file/
```

中台服务定义好以后，可以通过以下两种方式上传元数据

- 1.可以上传定义好的服务的 `thrift` 文件(整个服务的所有 `thrift` 批量上传)后上传，`dms` 会自动解析这些文件后，将生成的元数据 `xml` 信息存储到数据库中，并在内存中进行缓存。
- 2.上传服务编译后生成的元数据 xml 信息,每一个具体的服务对应一个 xml 元数据文件，只要点击上传即可。

### 用户填写的表达式

```json
{
   "body": {
      "request": {
         "orderNo": r"11729200.*",
         "productCount": 969,
         "posId": %"10n+6"
      }
   }
}
```

解析规则存入ruleMap

```java
Map ruleMap = new HashMap();

ruleMap.put("body_request_orderNo":RegexRule)

ruleMap.put("body_request_productCount":NumRule)


ruleMap.put("body_request_posId":ModeRule)
```

当请求过来时，逐一进行匹配，匹配成功，返回 mock数据。
