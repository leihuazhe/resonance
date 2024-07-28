```
token设计方式
时间戳+token+请求参数 +签名 （签名用MD5加密加盐）
oauth
client先去服务器请求一个auth code
拿到了auth code 后再去请求 access_token
拿到access_token后，去资源服务器申请资源，

可以用过滤器，先申请code，然后重定向再申请token，然后授权登录，
申请拿到资源

```
