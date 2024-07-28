### 4.Future和 FutureTask

#### 4.1 Future是Callable的返回结果。

##### 它有三个功能

- 1.判断任务是否完成
- 2.能够中断任务
- 3.能够获取任务返回结果

#### 4.2 FutureTask

##### FutureTask 实现了RunnableFuture接口，RunnableFuture这个接口又继承自Runnable和Future

##### 因此FutureTask 既可以作为Runnable被线程执行(通过包装Callable对象),又可以作为Future得到Callable返回值。

```java
public FutureTask(Callable<V> callable) {
    if (callable == null)
            throw new NullPointerException();
        this.callable = callable;
        this.state = NEW;       // ensure visibility of callable
    }

public FutureTask(Runnable runnable, V result) {
    this.callable = Executors.callable(runnable, result);
    this.state = NEW;       // ensure visibility of callable
}

```

##### 两个构造方法,FutureTask接口是Future的唯一实现类。

##### 实现了Callable的对象

```java
class Task implements Callable<String> {


	@Override
	public String call() throws Exception {
		TimeUnit.SECONDS.sleep(5);
		System.out.println("我睡了5s");
		return "success";
	}
}
```

##### 方法1：通过FutureTask包装task，然后使用Thread的方式执行

```java
public static void main(String[] args) throws InterruptedException, ExecutionException {

		Task task = new Task();
		/**
		 * 用FutureTask包装Task对象，然后给thread去执行
		 */
		FutureTask<String> ft = new FutureTask<String>(task);

		new Thread(ft).start();

		System.out.println("主线程获取运行结果为:"+ft.get());
}


```

##### 方法2：通过FutureTask包装task，然后使用线程池的方式执行

```java
public static void main(String[] args) throws InterruptedException, ExecutionException {

	ExecutorService executorService = Executors.newCachedThreadPool();

	Task task = new Task();
	/**
	 * 用FutureTask包装Task对象，然后给线程池去执行
	 */
	FutureTask<String> ft = new FutureTask<String>(task);


	Future<String> result = executorService.submit(task);

	executorService.shutdown();

	System.out.println("主线程获取运行结果为:"+result.get());

}
```

##### 方法3：直接使用线程池提交Callable对象

```java
public static void main(String[] args) throws InterruptedException, ExecutionException {

	ExecutorService executorService = Executors.newCachedThreadPool();

	Task task = new Task();

	Future<String> result = executorService.submit(task);

	executorService.shutdown();

	System.out.println("主线程获取运行结果为:"+result.get());

}


```

### 总结

Future是一个接口， FutureTask类是Future 的一个实现类，并实现了Runnable，因此FutureTask可以传递到线程对象Thread中新建一个线程执行。所以可通过Excutor(线程池) 来执行,也可传递给Thread对象执行。
