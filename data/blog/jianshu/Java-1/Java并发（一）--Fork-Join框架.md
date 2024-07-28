### Fork/Join框架

Fork/Join框架是`Java7`提供了的一个用于 **并行执行任务**的框架， 是一个把大任务分割成若干个小任务，最终汇总每个小任务结果后得到大任务结果的框架。

我们再通过Fork和Join这两个单词来理解下Fork/Join框架，Fork就是把一个大任务切分为若干子任务并行的执行，Join就是合并这些子任务的执行结果，最后得到这个大任务的结果。比如计算1+2+。。＋10000，可以分割成10个子任务，每个子任务分别对1000个数进行求和，最终汇总这10个子任务的结果。Fork/Join的运行流程图如下：

![Fork/Join](http://upload-images.jianshu.io/upload_images/6393906-c1f6e545857294a5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 工作窃取算法

### 未完待续
