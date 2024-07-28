### 项目Git化基本操作

```
//初始化git
git init
//添加所有到暂存区
git add -A .
//提交到本地仓库
git commit -m "0905 23:10 first"

//与远程仓库进行关联
git remote add origin https://gitee.com/youjie1/ng.git

//创建本地分支
git checkout -b component
//将本地分支推送到远程分支上
git push -u origin component:component

如果推送不成功，因为远程分支也有文件，通过 -f
强推*/
git push origin component:component -u -f
//注意上面两个component之间不能有空格。

将本地分支推送到远程example分支上，如果分支不存在，就创建分支
git push -u origin component:example

origin 默认远程分支
master 默认本地主分支
component 本地 component分支
example  远程 example分支
```

### git 将远程分支pull到本地

```
使用如下git命令查看所有远程分支：
git branch -r


二、拉取远程分支并创建本地分支

方法一

使用如下命令：
git checkout -b 本地分支名x origin/远程分支名x

使用该方式会在本地新建分支x，并自动切换到该本地分支x。

采用此种方法建立的本地分支会和远程分支建立映射关系。
 方式二

使用如下命令：

git fetch origin 远程分支名x:本地分支名x


使用该方式会在本地新建分支x，但是不会自动切换到该本地分支x，需要手动checkout。
采用此种方法建立的本地分支不会和远程分支建立映射关系。
```

```
Untracked files
即刚加入到工作区的文件，需要add到暂存区。

```

##### 合并两个不相关联的分支

```
1.clone两个仓库，放入同一个目录中，例如：

workspace
|-test1
|-test2

2.将test2移入test1目录中，此时目录结构变为如下：

workspace
|-test1
	|-test2

3.将目录切换至test1

cd test1

4.执行以下命令，将test2作为远程仓库，添加到test1中，并设置别名为test2

git remote add test2 ./test2      --远程仓库不一定就是github等上面的仓库

5.执行以下命令，从test2仓库下载数据到本地

git fetch test2

6.将test2仓库下载过来的master分支作为新分支checkout到本地，并将新分支设为test2

git checkout -b test2 test2/master

7.切换回test1仓库的master分支

git checkout master

8.将test2仓库的master分支合入test1仓库的master分支。如不添加allow-unrelated-histories 参数，可能会报fatal: refusing to merge unrelated histories 的异常。

git merge test2 --allow-unrelated-histories

9.push到test1仓库

git push

《合并两个git仓库》：[http://blog.csdn.net/gouboft/a ... 50696](http://blog.csdn.net/gouboft/article/details/8450696)
《如何用 Git 合并两个库,并保留提交历史》：[http://www.cnblogs.com/AP0904225/p/5811687.html](http://www.cnblogs.com/AP0904225/p/5811687.html)
```

### 分支重命名

```
Git branch -m oldbranchname newbranchname
```

### 同步`fork`的项目

```md
// clone 自己fork的项目
git clone https://github.com/leihuazhe/incubator-dubbo

cd incubator-dubbo
// 增加原始项目远程分支到本地
//查看远程分支
git remote -v
origin https://github.com/leihuazhe/incubator-dubbo.git (fetch)
origin https://github.com/leihuazhe/incubator-dubbo.git (push)

// 如果没有原始项目远程分支，则需要增加：
git remote add dubbo https://github.com/apache/incubator-dubbo
// 确认远程分支列表：
git remote -v
dubbo https://github.com/apache/incubator-dubbo.git (fetch)
dubbo https://github.com/apache/incubator-dubbo.git (push)
origin https://github.com/leihuazhe/incubator-dubbo.git .git (fetch)
origin https://github.com/leihuazhe/incubator-dubbo.git .git (push)

// fetch 原始项目分支的新版本到本地
git fetch dubbo
// 合并两个版本的代码
git merge dubbo/master

//push 最新代码到自己账号
git push origin master
```

### Git 删除分支

删除远程分支

```
git branch -r -d origin/branch-name
git push origin :branch-name
```

[参考](http://www.yiibai.com/git/git_pull.html)
