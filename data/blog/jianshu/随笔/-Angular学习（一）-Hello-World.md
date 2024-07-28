### Angular-Cli 的安装与使用

#### 1.node.js环境

需要有npm包管理工具，由于npm是国外资源，可能种种原因导致npm安装比较慢，这里我们采用淘宝的npm镜像

```
npm install cnpm -g --registry=https://registry.npm.taobao.org
```

然后采用cnpm安装angular-cli

```
cnpm install -g @angular/cli 	||  cnpm install -g @angular/cli@latest
```

安装完成之后，可以通过以下命名查看版本信息

```
ng version
```

#### 2.创建angular项目

我们采用先创建项目，再用cpm下载模块的方式创建angular项目，这样速度比较快。

```
ng new my-app --skip install   通过后面这个参数，先不安装模块
```

```
cd my-app
cnpm install
```

然后启动

```
ng server   || ng serve --host 0.0.0.0 --port 4201  ||ng serve --port 4201
```

访问浏览器

```
localhost:4200
```

#### 3.Cli常用指令

```
ng help 可以查看各种指令的信息API
```

```
ng new my-app 新建一个项目
```

参数分类 --dry-run 只把创建环节走一遍，不会产生任何文件之类。 --prefix

```
ng g component test 创建组件test

```

```
ng g service test -m src/app/app.module.ts  创建服务，并且在根module上注册
```

打包命令

```
ng build
```

```
ng build -aot 预编译			压缩			2.9M
```

```
ng build -prod 生产环境		压缩			404k
```

#### 4.helloworld

![主页图.png](http://upload-images.jianshu.io/upload_images/6393906-65a55dcea2e2e862.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![工程目录.png](http://upload-images.jianshu.io/upload_images/6393906-b7c717bbd4df21cf.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![clipboard.png](http://upload-images.jianshu.io/upload_images/6393906-d0072fa534d72c50.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
