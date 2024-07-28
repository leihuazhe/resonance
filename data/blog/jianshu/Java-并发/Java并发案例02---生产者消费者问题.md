```java

package example;

import java.util.LinkedList;
import java.util.concurrent.TimeUnit;

public class MyContainer3<T> {

	final private LinkedList<T>  lists = new LinkedList<T>();
	final private int MAX = 10; //最多10个元素
	private int count = 0;

	public synchronized void put(T t){
		while(lists.size()==MAX){
			try {
				this.wait(); //wait 99%和while结合使用，而不是和if结合使用
				//容器满了，在这里wait，被叫醒时，直接是往下执行的，还没运行到往里扔的适合，另外一个线程往里扔了，导致出错。
				//如果用while时，他会继续再检查一遍，醒了的时候，再检查一遍。 notifyAll可以叫醒多个线程。
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}

		lists.add(t);
		count++;
		this.notifyAll();
	}


	public synchronized  T get(){
		while(lists.size()==0){
			try {
				this.wait();
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
		T t = lists.removeFirst();
		count--;
		/**注意唤醒*/
		this.notifyAll();
		return t;
	}


	public static void main(String[] args) {

		MyContainer3<String> c = new MyContainer3<>();

		//启动消费者线程
		for(int i=0; i<10; i++) {
			new Thread(()->{
				for(int j=0; j<5; j++) System.out.println(Thread.currentThread().getName() +"--"+c.get());
			}, "c" + i).start();
		}

		try {
			TimeUnit.SECONDS.sleep(2);
		} catch (InterruptedException e) {
			e.printStackTrace();
		}

		//启动生产者线程
		for(int i=0; i<2; i++) {
			new Thread(()->{
				for(int j=0; j<25; j++) c.put(Thread.currentThread().getName() + " " + j);
			}, "p" + i).start();
		}
	}

}

```

### 面试点：关于为什么用*while* 而不用*if*

#### wait 99%和while结合使用，而不是和if结合使用

容器满了，然后空了一个，此时有两个线程都醒了,他们都要争取到那一把锁，结果t2把那把锁抢到了，然后它向容器里放了容器，此时当t1再次被获得锁时，它就不会检查容器的容量，而继续向下执行，导致出错，如果用while的话，它会回到上面再检查一次，然后睡眠。

---

### 面试点：为什么用*notifyAll* 而不用*notify*?

因为如果生产者生产满了容器后，它notify的另外一个线程也是生产者，结果他去运行的时候。也直接wait了，这个时候，程序就死了，因为所有的线程都睡了。

> effective java 永远不要去使用notify而使用notifyAll
