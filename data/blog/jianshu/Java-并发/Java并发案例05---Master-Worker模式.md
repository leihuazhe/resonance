> Master-Worker 模式是常用的并行计算模式。它的核心思想是系统由两类进程协同工作，Master和Worker进程。Master负责接收和分配任务，Worker负责处理子任务。当各个Worker子进程处理完毕后，会将结果返回给Master，由Master做归纳和小结。其好处是能够将一个大任务分解成若干个小任务，并行执行，从而提高系统的吞吐量。

### Master-Worker模式结构图

![结构图1](http://upload-images.jianshu.io/upload_images/6393906-e60b4a7d1d1b58f0?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![结构图2](http://upload-images.jianshu.io/upload_images/6393906-0f3da5e2d08f7ead?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 代码架构：

![image](http://upload-images.jianshu.io/upload_images/6393906-8dee075bb4bd9714.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

##### Master 负责接收和分配任务

##### Worker 负责处理子任务

##### Main 主函数，启动类

---

### Master类

```java
public class Master {

	//1 有一个盛放任务的容器  1.任务不需要阻塞   2.性能高   3.线程安全,每一个worker来这里拿100个task，所以要考虑线程安全。
	private ConcurrentLinkedQueue<Task> workQueue = new ConcurrentLinkedQueue<Task>();

	//2 需要有一个盛放worker的集合	1.不存在多线程争抢场景
	private HashMap<String, Thread> workers = new HashMap<String, Thread>();

	//3 需要有一个盛放每一个worker执行任务的结果集合	结果集，多个worker并发回写操作
	private ConcurrentHashMap<String, Object> resultMap = new ConcurrentHashMap<String, Object>();

	//4 构造方法
	public Master(Worker worker , int workerCount){
		worker.setWorkQueue(this.workQueue);
		worker.setResultMap(this.resultMap);

		for(int i = 0; i < workerCount; i ++){
			this.workers.put(Integer.toString(i), new Thread(worker));
		}

	}

	//5 需要一个提交任务的方法
	public void submit(Task task){
		this.workQueue.add(task);
	}

	//6 需要有一个执行的方法，启动所有的worker方法去执行任务
	public void execute(){
		for(Map.Entry<String, Thread> me : workers.entrySet()){
			me.getValue().start();
		}
	}

	//7 判断是否运行结束的方法
	public boolean isComplete() {
		for(Map.Entry<String, Thread> me : workers.entrySet()){
			if(me.getValue().getState() != Thread.State.TERMINATED){
				return false;
			}
		}
		return true;
	}

	//8 计算结果方法
	public int getResult() {
		int priceResult = 0;
		for(Map.Entry<String, Object> me : resultMap.entrySet()){
			priceResult += (Integer)me.getValue();
		}
		return priceResult;
	}

}
```

需要说明的几点：1.存放任务的容器，需要一个高并发，线程安全，性能好的容器，因为每一个Worker都回来这里取任务执行，存在线程安全问题，因此选择ConcurrentLinkedQueue。2.存放结果的容器，同样，worker也持有他的引用，每一个worker做完事情后，会把结果写入这个map中，存在线程安全问题，所以采用ConcurrentHashMap。3.存放worker的容器没有线程并发访问，只在Master类中进行了遍历，不存在线程安全问题。

### Worker类

```java
public class Worker implements Runnable {

	private ConcurrentLinkedQueue<Task> workQueue;
	private ConcurrentHashMap<String, Object> resultMap;

	public void setWorkQueue(ConcurrentLinkedQueue<Task> workQueue) {
		this.workQueue = workQueue;
	}

	public void setResultMap(ConcurrentHashMap<String, Object> resultMap) {
		this.resultMap = resultMap;
	}

	@Override
	public void run() {
		while(true){
			Task input = this.workQueue.poll();
			if(input == null) break;
			Object output = handle(input);
			System.out.println("当前线程"+Thread.currentThread().getName()+"  计算完毕"+ input);
			this.resultMap.put(Integer.toString(input.getId()), output);
		}
	}

	private Object handle(Task input) {
		Object output = null;
		try {
			//处理任务的耗时。。 比如说进行操作数据库。。。
			Thread.sleep(500);
			output = input.getPrice();
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
		return output;
	}

}

```

Worker类需要实现Runnable接口

### 任务类

```java
public class Task {

	private int id;
	private int price ;
	public int getId() {
		return id;
	}
	public void setId(int id) {
		this.id = id;
	}
	public int getPrice() {
		return price;
	}
	public void setPrice(int price) {
		this.price = price;
	}
	@Override
	public String toString() {
		return "Task [id=" + id + ", price=" + price + "]";
	}

}
```

任务类比较简单，不再敖述。

### 接下来是启动类

```java
public class Main {

	public static void main(String[] args) {
		/**20个worker*/
		Master master = new Master(new Worker(), 20);

		Random r = new Random();
		//100 个任务
		for(int i = 1; i <= 1000; i++){
			Task t = new Task();
			t.setId(i);
			t.setPrice(r.nextInt(1000));
			//添加任务
			master.submit(t);
		}
		//执行任务
		master.execute();
		long start = System.currentTimeMillis();

		while(true){
			if(master.isComplete()){
				long end = System.currentTimeMillis() - start;
				int priceResult = master.getResult();
				System.out.println("最终结果：" + priceResult + ", 执行时间：" + end);
				break;
			}
		}

	}
}

```

### 运行结果如下

![image](http://upload-images.jianshu.io/upload_images/6393906-16e8443126d2e7c1.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 总结

Master-Worker模式是一种将串行任务并行化的方案，被分解的子任务在系统中可以被并行处理，同时，如果有需要，Master进程不需要等待所有子任务都完成计算，就可以根据已有的部分结果集计算最终结果集。
