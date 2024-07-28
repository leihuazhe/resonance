### 安装 keycenter-agent-deploy

### 1.下载 keycenter-agent-deploy (仅克隆、不需要 build)

http://v9.git.n.xiaomi.com/keycenter/keycenter-agent-deploy

### 2. 配置 properties 文件

到staging环境机器(c3-data-arbiter05.bj)上复制 /etc/conf/keycenter/bigdata-newretail.g.properties 文件到本地相同路径

Note: properties 文件名称可以不同，目前没有权限。目前给的文件名称及内容如下：

```properties
# 名称
bigdata-dp.g.properties
# 内容
keycenter.secret.bigdata-dp.g=56590c5289aa7e6c1eae54e911f2e7af0bd38f356cb7237d9953614552d4389b
```

### 启动 keycenter-agent

进入目录: keycenter-agent-deploy/keycenter-agent
执行: sudo JAVA_OPTS=-Dconfig.resource=application-staging.conf ./bin/keycenter-agent-javaCtrl.sh

### 使用SBT启动Project

本机运行: (需要首先启动 keycenter-agent)

    sbt -Dconfig.resource=application-local.conf -jvm-debug 5005 chongming/run

如果在本机以 staging 模式运行: (需要首先启动 keycenter-agent)

    sbt -Dconfig.resource=application-staging.conf -jvm-debug 5005 chongming/run

如果需要 debug 的话，在 sbt 后面加上参数 `-jvm-debug <port>`, 然后在 IntelliJ 里建立 Remote 配置：
Run -> Edit configurations -> Add -> Remote ， 然后 attach.

### 运行Unit Test

利用sbt clean test 运行unit test
默认情况下，sevices test被disabled，通过-DenableServicesTest 或 -DenableServicesTest=true 开启, 并且需要指定-Dconfig.resource=application-local.conf

### 测试 passport 登录功能

1. 本机使用 nginx, 将 http://weiming-staging.bi.mi.com 指向本机 9000 端口:

```
 server {
   listen 80;
   server_name weiming-staging.bi.mi.com;
   location / {
     proxy_pass http://localhost:9000;
     proxy_set_header Host $http_host;
     proxy_set_header X-Real-IP $remote_addr;
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   }
 }
```

2. 修改 /etc/hosts 将域名指向本机
   127.0.0.1 weiming-staging.bi.mi.com
3. 运行 `sbt -Dconfig.resource=application-staging.conf -jvm-debug 5005 chongming/run`
   for testing, 指定-Dconfig.resource=application-local.conf绕开权限控制
   on MAC OSX , 覆盖SystemProperty -DLCS_AGENT_ROOT_PATH=/data/work/app/lcs-agent/data/monitor, 由于默认值在/home下，OSX无法在该路径下创建文件或路径, 不覆盖也不影响应用的正常功能。
4. 打开浏览器, 登录 http://weiming-staging.bi.mi.com

### Code style

Preferences/Settings -> Editor -> Code Style, Schema option 下 Import Schema，选择该目录下的 code-style.xml
该project下的code style 基于与公司保持一致，改动两处:

```
Continuation indent 为 4
Use scaladoc indent for leading asterisk 为 false
```
