```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration scan="true" scanPeriod="30 seconds">
    <substitutionProperty name="logbase" value="logs/"/>
    <appender name="fileLog" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <prudent>true</prudent>
        <rollingPolicy
                class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/binlog-server-%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder>
            <pattern>%d{MM-dd HH:mm:ss SSS} %t %p - %m%n</pattern>
        </encoder>
    </appender>
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%date %level [%thread] %logger.%class{0}#%method [%file:%line] %msg%n</pattern>
        </encoder>
    </appender>
    <root level="INFO">
        <!--<appender-ref ref="STDOUT"/>-->
        <appender-ref ref="fileLog"/>
    </root>
</configuration>
```
