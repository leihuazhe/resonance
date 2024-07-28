## 1.springboot 使用 docker 极速部署脚本

Dockerfile:

```
// 将打包好的 jar放到当前目录下，并命名为
FROM openjdk:8-jre-alpine
ADD maple-blog-1.0.0.jar app.jar
CMD java -jar /app.jar

```
