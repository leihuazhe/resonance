![](http://upload-images.jianshu.io/upload_images/6393906-6243d8cbef29b29e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

> `wrk` 是一种高效的 `HTTP` 基准测试工具，能够在单个多核 `CPU` 上运行时产生大量负载。它将多线程设计与 `epoll` 和 `kqueue` 等可伸缩事件通知系统相结合。因此，使用 wrk 使用较少的线程即可以压测出非常可观的请求数据。<br/>
> 并且我们可以通过一个可选的 `LuaJIT`(`Lua`) 脚本来提供更多的请求参数的定制，参数加密、鉴权请求等。

## 安装

### centos7 安装方法

```sh
yum install https://extras.getpagespeed.com/release-el7-latest.rpm
yum install -y wrk
```

上面方式安装不成的话，请按如下方式进行:

```sh
yum remove epel-release

yum install -y https://github.com/scutse/wrk-rpm/releases/download/4.1.0/wrk-4.1.0-1.el7.centos.x86_64.rpm
```

参考(https://unix.stackexchange.com/questions/345124/dont-work-yum-update-yum-doesnt-have-enough-cached-data-to-continue)

## 基础使用

> 使用类 `Unix` 环境，在 `CentOs` 或 `MacOs` 上进行测试

`wrk` 开源 `GitHub` 地址:  [https://github.com/wg/wrk](https://github.com/wg/wrk)
通过 `git clone` 的形式下载 源码包，进入目录下，执行 `make` ，然后开始编译安装，等待一会即可完成。

#### `wrk` 使用参数说明

```
-c, --connections:  总的连接数（每个线程处理的连接数=总连接数/线程数）

-d, --duration:        测试的持续时间，如2s(2second)，2m(2minute)，2h(hour)

-t, --threads:         需要执行的线程总数

-s, --script:          执行Lua脚本，这里写lua脚本的路径和名称，后面会给出案例

-H, --header:      需要添加的头信息，注意header的语法，举例，-H “token: abcdef”，说明一下，token，冒号，空格，abcdefg（不要忘记空格，否则会报错的）。

--latency:     显示延迟统计信息

--timeout:     超时的时间
```

#### 例子

```
wrk -t12 -c400 -d30s http://127.0.0.1:8080/index.html
```

该请求意思为： 使用 wrk 使用12个线程，400个连接，请求 url 30s

压测结束后的结果:

```
Running 30s test @ http://127.0.0.1:8080/index.html
  12 threads and 400 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   635.91us    0.89ms  12.92ms   93.69%
    Req/Sec    56.20k     8.07k   62.00k    86.54%
  22464657 requests in 30.00s, 17.76GB read
Requests/sec: 748868.53
Transfer/sec:    606.33MB
```

返回结果说明：

- Latency：响应时间Req/Sec：每个线程每秒钟的执行的连接数
- Avg：平均
- Max：最大
- Stdev：标准差+/- Stdev： 正负一个标准差占比
- Requests/sec：每秒请求数（也就是QPS），这是一项压力测试的性能指标，通过这个参数可以看出吞吐量
- Latency Distribution，如果命名中添加了
- latency就会出现相关信息

### 实战

> 使用 wrk 对鉴权的接口进行调用压测。由于是鉴权的接口，需要根据密钥和时间戳动态的生成 secret 然后对后端进行请求，才能通过验证。这里我们引入 lua 脚本

由于 `wrk` 工具里面 自带 `luaJit` ，所以我们不用下载。但是需要 md5 的模块，所以需要使用 `luarocks` 来管理和下载 `lua` 模块和包。

#### 安装`Luarocks` 包管理工具

> `LuaRocks` 是 `Lua` 模块的包管理器。它允许您将 `Lua` 模块创建并安装为自包含包(称为 `rocks` )。您可以在 `Unix` 和 `Windows` 上下载和安装 `LuaRocks`。官网：https://luarocks.org/

通过 `curl` 下载

```
curl -o luarockt-3.0.3.tar.gz http://luarocks.github.io/luarocks/releases/luarocks-3.0.3.tar.gz
```

解压 `luarockt-3.0.3.tar.gz`后，进入目录下 指定到 `wrk` 里 `LuaJit` 的目录进行 `configure`

```
//这里指定你自己的 `wrk` 路径
./configure --with-lua=../wrk/obj
```

编译安装

```
make install
```

通过 `Luarocks` 安装 `md5` 模块

```
luarocks install md5 
```

#### 开始请求

> 我们需要像 `url http://127.0.0.1:9000` 网关进行 `POST` 请求，该网关会对请求进行鉴权和验证，并判断请求的实效性。所以我们需要在请求时动态改变请求参数，因此需要结合 `Lua` 脚本。

`Lua` 脚本 `helloDemo.lua`

```lua
md5=require("md5")
-- md5加密，拼接请求对象
function buildJson(json)
  local apiKey = "abcdefg1234567"
  local password = "qwerxxxx"
  local timestamp = os.time() .. "000"

  local secret = md5.sumhexa(apiKey .. timestamp ..  password)
  local body = json .. "&timestamp=" .. timestamp .. "&secret=" .. secret

  return body
end

wrk.method = "POST"
wrk.body = buildJson("serviceName=com.github.dapeng.service.HelloService&version=1.0.0&methodName=sayHello&parameter={\"body\": {\"request\": {\"bizTag\": \"order\", \"step\": 100}}}")
wrk.headers["Content-Type"] = "application/x-www-form-urlencoded"
```

请求脚本

```
#!/usr/bin/env bash

time1=`date +%s`
echo "开始时间 `date +%Y%m%d%H%S`"

# wrk 安装目录 -s 后指定上面写好的lua脚本
~/ideaspace/dapeng/benchmark/wrk/wrk -t4 -c400 --timeout 5s -d 60s -s lua/$1.lua --latency 'http://127.0.0.1:9000/api/e1bfd762321e409cee4ac0b6e841963c'

time2=`date +%s`
useTime=$[time2 - time1]
echo "结束时间 `date +%Y%m%d%H%S`"
echo "总共花费 $useTime s"
```

执行脚本

```
sh start-wrk.sh helloDemo
```

通过上面方式，我们就可以开始请求已鉴权的接口

### 总结

`wrk` 是一款高性能的 `http` 请求压测工具，它使用了 `Epoll` 模型，使所有请求都是异步非阻塞模式的，因此对系统资源能够应用到极致，可以压满 `cpu`。

`wrk` 可以落站使用 `Lua` 脚本。该特性可以使我们通过 脚本动态的改变请求参数，对请求压测提供的多样性的选择和定制。

### 后续

#### 1. 去除 CO

> 关于 wrk 测试延迟分布不准确的问题，涉及到 Coordinated Omission 的原因，可 Google
> 在 src/wrk.c
> 将下面部分代码注释：

```c
//  if(complete / cfg.connections > 0) {
//       int64_t interval = runtime_us / ( complete / cfg.connections);
//       stats_correct(statistics,latency,interval);
```

关于 wrk 测试延迟分布不准确的问题，涉及到 Coordinated Omission 的原因，可 Google，也可以参考 [wrk2](https://github.com/giltene/wrk2)
