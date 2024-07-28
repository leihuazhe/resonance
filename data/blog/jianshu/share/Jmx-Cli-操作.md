### 1. 将jdk里的tool.jar复制到jmx/lib下

### 2. 将jmx-cli 复制到 容器内

```
docker cp jmx-cli goodsService:/tmp
```

#### 执行jar包

```
java -jar cli.jar
```

出现logo图

```

    /#####                                /######    /##   /##
   |__  ##                               /##__  ##  | ##  |__/
      | ##   /######/####    /##   /##  | ##  \__/  | ##   /##
      | ##  | ##_  ##_  ##  |  ## /##/  | ##        | ##  | ##
 /##  | ##  | ## \ ## \ ##   \  ####/   | ##        | ##  | ##
| ##  | ##  | ## | ## | ##    >##  ##   | ##    ##  | ##  | ##
|  ######/  | ## | ## | ##   /##/\  ##  |  ######/  | ##  | ##
 \______/   |__/ |__/ |__/  |__/  \__/   \______/   |__/  |__/

A command-line tool for JMX
Powered by Clamshell-Cli framework
http://code.google.com/p/clamshell-cli/

Java version: 1.8.0_131
OS: Linux, Version: 3.10.0-514.el7.x86_64
```

开始

- jmx-cli > ps

```
Connecting to localhost ...
163    cli.jar
14    com.github.dapeng.bootstrap.Bootstrap
```

- jmx-cli > help

```
Available Commands
------------------
      exit       Exits ClamShell.
      help       Displays help information for available commands.
   sysinfo       Displays current JVM runtime information.
      time       Prints current date/time
        ps       Displays a list of running JVM processes (similar to jps tool)
   connect       Connects to local or remote JVM MBean server.
     mbean       Creates a label for identifying an MBean
      desc       Prints description for specified mbean.
      list       Lists JMX MBeans.
      exec       Execute MBean operations and getter/setter attributes.
```

- jmx-cli > connect pid:14

```
Connected to server (rmi://172.19.0.11  1).
29 MBean(s) registered with server.
```

- jmx-cli > list

```
MBean list [all]
      java.lang:name=Metaspace,type=MemoryPool
      java.lang:name=PS Old Gen,type=MemoryPool
      org.apache.commons.pool2:name=pool,type=GenericObjectPool
      java.lang:type=Runtime
      java.lang:name=PS Scavenge,type=GarbageCollector
      java.lang:type=Threading
      java.lang:name=PS Eden Space,type=MemoryPool
      java.nio:name=mapped,type=BufferPool
      java.lang:name=Compressed Class Space,type=MemoryPool
      com.alibaba.druid:type=DruidDataSourceStat
      java.lang:name=PS Survivor Space,type=MemoryPool
      java.util.logging:type=Logging
      java.lang:type=Compilation
      java.lang:type=OperatingSystem
      java.lang:name=Metaspace Manager,type=MemoryManager
      JMImplementation:type=MBeanServerDelegate
      java.lang:type=ClassLoading
      com.sun.management:type=HotSpotDiagnostic
      java.lang:name=CodeCacheManager,type=MemoryManager
      java.lang:name=Code Cache,type=MemoryPool
      ch.qos.logback.classic:Name=default,Type=ch.qos.logback.classic.jmx.JMXConfigurator
      com.alibaba.druid:type=MockDriver
      com.alibaba.druid:type=DruidDriver
      java.nio:name=direct,type=BufferPool
      com.alibaba.druid:type=DruidStatService
      com.alibaba.druid:id=1256405521,type=DruidDataSource
      java.lang:name=PS MarkSweep,type=GarbageCollector
      com.sun.management:type=DiagnosticCommand
      java.lang:type=Memory

 29 objects found.
```

- jmx-cli > desc

```
desc                        desc attribs:*
desc attribs:<attribName>   desc attribs:[attribList]
desc bean:<MBeanLabel>      desc bean:<NamePattern>
desc ops:*                  desc ops:<operationName>
desc ops:[operationList]
```

- jmx-cli > exec

```
exec                       exec bean:<MBeanLabel>     exec bean:<NamePattern>
exec get:<AttributeName>   exec op:<OperationName>    exec params:<ParamValue>
exec params:[ParamList]    exec set:<AttributeName>
```

- jmx-cli > list filter:"ch.qos.logback.classic:\*" label:"true"

```
MBean list [ch.qos.logback.classic:*]
     [$0] ch.qos.logback.classic:Name=default,Type=ch.qos.logback.classic.jmx.JMXConfigurator

 1 objects found.
```

- jmx-cli > desc bean:$0

```
MBean: ch.qos.logback.classic:Name=default,Type=ch.qos.logback.classic.jmx.JMXConfigurator (ch.qos.logback.classic.jmx.JMXConfigurator)
Information on the management interface of the MBean

Attributes:
     LoggerList : java.util.List (r) - Attribute exposed for management
     Statuses : java.util.List (r) - Attribute exposed for management

Operations:
     reloadDefaultConfiguration():void
     reloadByFileName(java.lang.String):void
     reloadByURL(java.net.URL):void
     getLoggerLevel(java.lang.String):java.lang.String
     getLoggerEffectiveLevel(java.lang.String):java.lang.String
     setLoggerLevel(java.lang.String,java.lang.String):void
```

- jmx-cli > exec bean:$0 op:getLoggerLevel params:ROOT

```
getLoggerLevel([ROOT]) : INFO
```

- jmx-cli > exec bean:$0 op:setLoggerLevel params:[ROOT,DEBUG]

```
setLoggerLevel([ROOT, DEBUG]) : void
```

- jmx-cli > exec bean:$0 op:getLoggerLevel params:ROOT

```
getLoggerLevel([ROOT]) : DEBUG

```
