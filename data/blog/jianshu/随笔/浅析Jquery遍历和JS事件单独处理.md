> 最近在工作上面碰到如下需求，要将下面三列中的大于100%的数据都以100%显示，小于的则不处理。

#### 需求分析

---

由于报表数据是在后台组合的，每个指标间的数据都是取自缓存，如果直接在后台进行逻辑处理，会打乱很多业务处理流程，因此经过一番琢磨后，决定在前台页面进行修改，等报表组合完毕后。

> 这里要注意的是，报表展示页面为静态的HTML文件，前后台是分离的，数据通过AJAX调用后台接口，因此，请求不同的ID会有不同的报表在相同的页面进行展示，如果直接在JS中写处理逻辑的话，会导致其他报表的TABLE相同的部分也会被处理，这显然不是我们需要的。

###### 这是需求

---

![需求1.png](http://upload-images.jianshu.io/upload_images/6393906-a6393f695ef99c2c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

###### 这是处理后的结果

---

![需求2.png](http://upload-images.jianshu.io/upload_images/6393906-7e64ac889264d40a.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

#### 前台数据修改

---

通过Jquery在报表生成之后，对指定的数据进行修改

```JS
var str = "0,1,2";
function reset_percent(str){
    var arr=str.split(",");
    if (arr.length>0){
        $(".table_body table tbody tr").each(function(i,n){
            for (var j=0; j<arr.length;j++){
                if(parseInt($(n).children("td:eq("+parseInt(arr[j])+")").html())>=100){
                  $(n).children("td:eq("+parseInt(arr[j])+")").html("100%");
                }
            }
          })
    }
}
```

分析,我们先分析报表的组成结构，类似于如下结构

```html
<table>
  <thead>
    <tr>
      <th></th>
      <th></th>
      <th></th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>
```

我们可以通过Jquery选择器先找到table，然后找到tbody，再找到tbody下面的tr，然后通过each函数对tr进行遍历，使得每个tr下面具体需要的第几个td的数据进行改变，因此代码如下

```JS
//重置 三列的百分比
function reset_percent(str){
    var arr=str.split(",");
    if (arr.length>0){
        $(".table_body table tbody tr").each(function(i,n){
            for (var j=0; j<arr.length;j++){
                if(parseInt($(n).children("td:eq("+parseInt(arr[j])+")").html())>=100){
                  $(n).children("td:eq("+parseInt(arr[j])+")").html("100%");
                }
            }
          })
    }
}
```

如上，我们通过遍历每一个tr元素，找到tr元素下面具体的td进行修改，我们在其他地方调用上面这个方法，传入需要改变的几列的字符串，需要注意的是，td的index是以0开头的，所以改变第一列td的话，就从0开始。

#### 后台处理

---

后台报表模型里面添加，JS事件处理，即每一个报表都可以配置自己需要的JS Handler 事件，当然，这些事件提前写好在一个JS文件里，只是我们根据不同的报表去具体的调用。
举个例子，报表A的模型里有一栏是写JS的，如下：

![addition_handler.png](http://upload-images.jianshu.io/upload_images/6393906-2f360eecd93d7e72.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

将配置写在模型的sql中进行保存，以XML格式保存，然后通过Simple XML进行解析，我之前也写过Simple XML解析XML的方式，[传送门](http://www.jianshu.com/p/b5283224d0f1)

接下来，我们在组装报表之前，和组装报表之后，分别判断从后台传来的结果是否包含额外的事件处理

```JS
function build_table_simple(jsonData){
	reset_title_link();
		//是否有附加处理js
			if (additionHandle!=null && additionHandle.execute_time=="create_table_before"){
					eval(additionHandle.execute_function);
			}

    .... 省略
```

如果有要处理的话，通过eval()解析字符串，让字符串具有JS的时间处理能力，传来的字符串相当于调用了上面写的那个方法，并传入了具体需要修改的td列。

#### 总结

---

我们在业务处理中，很多表格都是通过遍历来组成的，因此你无法手动去修改表格里面哪一行那一列具体的值。
而且很多页面是公用的，他通过传入ID的不同展示不同的表格和数据，这样的话，你如果在页面引用的JS里面直接调用处理函数，这样其他的报表也会受到影响，因此，最好的方法就是，不同的报表配置不同的事后JS处理事件，存在数据库中，当调用这个报表时，也调用相对应的JS处理函数，这样需求也就解决了。

---

END
