## JDK 11 support

### 1. root pom.xml

> upgrade some maven plugins

#### 1. maven-compiler-plugin upgrade 3.3 to 3.8

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <version>3.3</version>
    <configuration>
        <source>${java-version}</source>
        <target>${java-version}</target>
        <verbose>false</verbose>
        <encoding>${project.build.sourceEncoding}</encoding>
    </configuration>
</plugin>

<!-- 升级后 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <version>3.8.0</version>
    <executions>
        <execution>
            <id>default-testCompile</id>
            <phase>test-compile</phase>
            <goals>
                <goal>testCompile</goal>
            </goals>
            <configuration>
                <skip>true</skip>
            </configuration>
        </execution>
    </executions>

    <configuration>
        <showWarnings>true</showWarnings>
        <showDeprecation>true</showDeprecation>
        <source>${java-version}</source>
        <target>${java-version}</target>
        <verbose>false</verbose>
        <encoding>${project.build.sourceEncoding}</encoding>
    </configuration>
</plugin>
```

#### 2. maven-source-plugin upgrade 2.4 to 3.0.1

```xml
<!-- Source -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-source-plugin</artifactId>
    <version>2.4</version>
    <executions>
        <execution>
            <phase>package</phase>
            <goals>
                <goal>jar-no-fork</goal>
            </goals>
        </execution>
    </executions>
</plugin>


<!-- 升级后 -->
<!-- Source -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-source-plugin</artifactId>
    <version>3.0.1</version>
    <executions>
        <execution>
            <phase>package</phase>
            <goals>
                <goal>jar-no-fork</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

#### 3. dapeng-code-generator maven-javadoc-plugin upgrade 2.10.3 to 3.0.1

> generator

```
<plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-javadoc-plugin</artifactId>
        <version>3.0.1</version>
        <configuration>
            <additionalparam>-Xdoclint:none</additionalparam>
        </configuration>
        <executions>
            <execution>
                <id>attach-javadoc</id>
                <phase>package</phase>
                <goals>
                    <goal>jar</goal>
                </goals>
            </execution>
        </executions>
</plugin>
```

#### 4.添加 `JAVAEE` 相关插件

```
<!-- JDK11 移除了 JavaEE 的依赖，需要手动导入 -->
<dependency>
    <groupId>javax</groupId>
    <artifactId>javaee-api</artifactId>
    <version>8.0</version>
</dependency>

<!-- https://mvnrepository.com/artifact/javax.xml/jaxb-api -->
<dependency>
    <groupId>javax.xml.bind</groupId>
    <artifactId>jaxb-api</artifactId>
    <version>2.3.1</version>
</dependency>
```

在 dapeng-core 中加入依赖

```xml
<dependencies>
    <dependency>
        <groupId>javax.xml.bind</groupId>
        <artifactId>jaxb-api</artifactId>
    </dependency>
</dependencies>
```

#### 4. Java version properties

```xml
<!-- java8 properties -->
<properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <java-version>1.8</java-version>
    <slf4j-version>1.7.13</slf4j-version>
    <profile.name>oss</profile.name>
    <arguments />
    <logback-version>1.1.3</logback-version>
</properties>

 <!-- java11 properties -->
 <properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <slf4j-version>1.7.13</slf4j-version>
    <profile.name>oss</profile.name>
    <arguments/>
    <logback-version>1.1.3</logback-version>
    <!-- FOR JDK 11 -->
    <java-version>11</java-version>
    <maven.compiler.source>11</maven.compiler.source>
    <maven.compiler.target>11</maven.compiler.target>
    <maven.compiler.release>11</maven.compiler.release>
</properties>
```

#### 4. moudule 依赖

目前 `module` `dapeng-maven-plugin` 在 `java11` 情况下会报错,需要去除。

## Docker 父容器改变

> 容器改为基于 `JDK11` 的 `centos` 容器

```
#soa-container:base
FROM docker.today36524.com.cn:5000/base/openjdk:jdk-11
MAINTAINER dapengsoa@gmail.com

# Setting Envirnoment
ENV CONTAINER_HOME /dapeng-container
ENV PATH $CONTAINER_HOME:$PATH

RUN mkdir -p "$CONTAINER_HOME"

COPY target/dapeng-container /dapeng-container

WORKDIR "$CONTAINER_HOME/bin"

RUN chmod +x *.sh
```

构建 `dapeng` 容器镜像名称 `dapengsoa/dapeng-container:2.1.0_JDK11`

## 启动脚本改变 `startup.sh`

> 是否使用 `ZGC` ?

```xml
GC_OPTS="$GC_OPTS -XX:+UseParallelGC -XX:+UseParallelOldGC"
# 使用 ZGC
GC_OPTS="$GC_OPTS -XX:+UnlockExperimentalVMOptions -XX:+UseZGC"
```

## JVM11 虚拟机变化，按照以前脚本启动报错

#### 错误1，去掉 PrintGCDateStamps 选项, 使用 `-XX:-PrintGCTimeStamps`替换

```
Unrecognized VM option 'PrintGCDateStamps'
Error: Could not create the Java Virtual Machine.
Error: A fatal exception has occurred. Program will exit.
Unrecognized VM option 'PrintGCDateStamps'
```

#### 错误2 提示 `-Xloggc` 过时, 去掉 PrintPromotionFailure

```
[0.000s][warning][gc] -Xloggc is deprecated. Will use -Xlog:gc:/dapeng-container/bin/../logs/gc-soa-service-20181016171426.log instead.
Unrecognized VM option 'PrintPromotionFailure'
Did you mean '(+/-)PromotionFailureALot'? Error: Could not create the Java Virtual Machine.
Error: A fatal exception has occurred. Program will exit.

```

#### 错误3 去掉 PrintGCApplicationStoppedTime

```
[0.000s][warning][gc] -Xloggc is deprecated. Will use -Xlog:gc:/dapeng-container/bin/../logs/gc-soa-service-20181016172425.log instead.
Unrecognized VM option 'PrintGCApplicationStoppedTime'
Error: Could not create the Java Virtual Machine.
Error: A fatal exception has occurred. Program will exit.

```

## 存在问题及解决方案

#### 1. maven-compiler-plugin 3.8.0 版本才支持 JDK11 ，然而 3.8.0 版本不支持 JDK8

```
<java-version>11</java-version>
<!--<maven.compiler.source>1.8</maven.compiler.source>-->
<!--<maven.compiler.target>1.8</maven.compiler.target>-->
<!--<maven.compiler.release>1.8</maven.compiler.release>-->
```

将下面的几行注释掉即可。
