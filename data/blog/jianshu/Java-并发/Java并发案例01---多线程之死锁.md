### 多线程之死锁案例一

```java
package example;
/**
 * 模拟死锁
 * @author maple
 *
 */
public class DeadLock {

	public int flag = 1;
	/**
	 * 这里必须要用静态的锁对象,o1,o2
	 * 因为new两个对象时，他们共享静态变量，持有的锁才会有冲突
	 */
	private static Object o1 = new Object();
	private static Object o2 = new Object();

	public DeadLock(int flag) {
		this.flag=flag;
	}


	public void m(){
		if(flag == 1){
			synchronized (o1) {
				System.out.println("i am in  flag 1");
				try {
					Thread.sleep(500);
				} catch (InterruptedException e) {
					e.printStackTrace();
				}

				synchronized (o2) {
					System.out.println("i have o2");
				}

			}
		}

		if(flag == 0){
			synchronized (o2) {
				System.out.println("i am in  flag 0");
				try {
					Thread.sleep(500);
				} catch (InterruptedException e) {
					e.printStackTrace();
				}

				synchronized (o1) {
					System.out.println("i have o1");
				}

			}
		}


	}

	public static void main(String[] args) {
		DeadLock d1 = new DeadLock(1);
		DeadLock d2 = new DeadLock(0);

		new Thread(()->d1.m(),"t1").start();
		new Thread(()->d2.m(),"t2").start();
	}

}

```
