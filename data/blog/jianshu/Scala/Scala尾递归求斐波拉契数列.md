```
@tailRec
private def fibonacci(n:Int,res1:Int,res2:Int):Int＝ {
     if(n＜＝2)  res2
     else fibonacci(n－1,res2,res1+res2)
}

def getFib(n:Int):Int = {
  fibonacci(n,1,1)
}



```

![image.png](http://upload-images.jianshu.io/upload_images/6393906-f807b00789013455.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
