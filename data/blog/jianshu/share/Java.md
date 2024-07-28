范型 TT;

```
public static void main(String[] args) throws NoSuchFieldException {
        Class<?> flag = Main.class.getDeclaredField("date").getType();
        Type flag1 = Main.class.getDeclaredField("date").getGenericType();
        System.out.println(flag.toString());
        System.out.println(flag1.toString());
    }
```

![1.png](https://upload-images.jianshu.io/upload_images/6393906-0e8cebeb768a2dc2.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![路由.png](https://upload-images.jianshu.io/upload_images/6393906-7c34e5d21feb90a0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![初始化channel.png](https://upload-images.jianshu.io/upload_images/6393906-20c8142133a3ce4d.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![image.png](https://upload-images.jianshu.io/upload_images/6393906-c29ef9a9a640f45d.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![image.png](https://upload-images.jianshu.io/upload_images/6393906-f9a58a1d299e366b.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

![image.png](https://upload-images.jianshu.io/upload_images/6393906-fee5e1e6a80b090c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
