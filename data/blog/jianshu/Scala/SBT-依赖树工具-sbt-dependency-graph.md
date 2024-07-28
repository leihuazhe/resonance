sbt-dependency-graph 我们可以将其定义为全局，这样不需要在每个 sbt 项目中引入这个插件的依赖。
在 `~/.sbt/0.13/plugins/plugins.sbt for sbt 0.13` or `~/.sbt/1.0/plugins/plugins.sbt` 添加如下插件信息即可。

```
addSbtPlugin("net.virtual-void" % "sbt-dependency-graph" % "0.9.2")
```

如果只想在一个单独的 sbt 工程中引入，在工程目录的 project 下的 plugins.sbt 加入插件信息,内容和上面一致。

## 主要的命令信息

#### dependencyTree

显示项目依赖项(ASCII树表示)

#### dependencyBrowseGraph

打开一个浏览器窗口，其中包含依赖关系图的可视化（由graphlib-dot + dagre-d3提供）

#### dependencyBrowseTree

打开一个浏览器窗口，其中包含依赖关系树的可视化（由jstree提供）

#### dependencyList

显示sbt控制台上所有传递依赖项的平面列表（按组织和名称排序）

#### whatDependsOn <organization> <module> <revision>？

查找某个jar具体的依赖项信息，显示所选模块的反向依赖关系树。 <revision>参数是可选的

#### dependencyLicenseInfo

显示按声明的许可证分组的依赖项

#### dependencyStats

显示一个表，每个模块一行包含（传递）Jar大小和依赖项数

#### dependencyGraphMl

生成一个.graphml文件，其项目依赖于target / dependencies- <config> .graphml。使用例如yEd根据您的需要格式化图表

#### dependencyDot

使用项目的依赖关系生成.dot文件到target / dependencies- <config> .dot。使用graphviz将其渲染为首选图形格式

#### dependencyGraph

显示项目在sbt控制台上的依赖关系的ASCII图（仅在sbt 0.13上支持）

ivyReport：让ivy为您的项目生成解决方案报告。使用show ivyReport获取生成的报告的文件名

### 以下命令还支持通过 `toFile` 将内容保存到文件中

- dependencyTree
- dependencyList
- dependencyStats
- dependencyLicenseInfo

toFile 子任务具有以下语法

<config>：<task> :: toFile <filename> [-f | --force]
使用 -f 强制覆盖现有文件。

例如 `test：dependencyStats :: toFile target / depstats.txt` 会将测试配置中 `dependencyStats` 的输出写入文件 `target/depstats.txt`，但不会覆盖现有文件。

可以将所有任务限定为配置，以获取特定配置的报告。 `test：dependencyGraph`，例如，打印测试配置中的依赖项。如果未指定任何配置，则通常假定编译。

注意：如果要使用 `sbt shell` 外部的参数运行任务，请确保将整个任务调用放在引号中,
例如： `sbt  "whatDependsOn <org> <module> <version>"` 。

### 更多信息

浏览 [官方说明](https://github.com/jrudolph/sbt-dependency-graph) 以获取更多信息
