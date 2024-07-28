> 使用`nginx`搭建简单的静态web服务器

```conf
server {
    listen 9999;
    server_name localhost;

    location / {
      root /var/data/static/starts;
      autoindex on;
      autoindex_exact_size off;
      autoindex_localtime on;
    }

}
```

参数说明:

- autoindex on;
  Nginx默认是不允许列出整个目录的。如需此功能，打开nginx.conf文件，在location server 或 http段中加入
- autoindex_exact_size off;
  默认为on，显示出文件的确切大小，单位是bytes。
  改为off后，显示出文件的大概大小，单位是kB或者MB或者GB
- autoindex_localtime on;
  默认为off，显示的文件时间为GMT时间。
  改为on后，显示的文件时间为文件的服务器时间

## 跳转错误

```conf
server {
    listen 8001;
    server_name 127.0.0.1;
    access_log /var/log/nginx/test_access.log  main;
    proxy_set_header Host             $host;
    proxy_set_header X-Real-IP        $remote_addr;
    proxy_connect_timeout 600;
    proxy_read_timeout 600;
    proxy_send_timeout 600;
    proxy_set_header X-Forwarded-For $http_x_forwarded_for;
    client_max_body_size 20m;

    location / {
    root /etc/nginx/html/store_app/dist/;
    index index.html;
    }

    location /dapeng/ {
        proxy_pass http://10.10.10.48:8989/;
    }

    location /bigdata/ {
        proxy_pass http://superdz.today36524.com/;
    }

    location /biservice/ {
        proxy_pass http://biservice.today36524.com/;
    }

    location ^~ /interface/ {
        rewrite ^/interface/(.*)$ http://biservice.today36524.com/bigData/$1 permanent;
#       proxy_pass http://biservice.today36524.com/bigData/;
    }

    error_log /var/log/nginx/t-mini-8085-8485.log;
    access_log /var/log/nginx/t-mini-8085-8485.log;
}

```

### 重写 url跳转

> 需求`http://dalao.com/api/supplier_download/excel/excelDownload.html?fileType=someImport`跳转到
> `http://192.168.10.101/api/excel/excelDownload.html?fileType=someImport`

```conf
server {
    listen 80;
    server_name dalao.com;

    access_log  /var/log/nginx/dalao-com.log;
    error_log /var/log/nginx/dalao-com-error.log;

    location /api/supplier_download/ {

        proxy_set_header   Host             $host;
        proxy_set_header   X-Real-IP        $remote_addr;
        proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;
        rewrite /api/supplier_download/(.*) http://eywa.sandbox5.today.cn/api/$1 permanen
    }

    location / {
        #Proxy Settings
        proxy_set_header   Host             $host;
        proxy_set_header   X-Real-IP        $remote_addr;
        proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;

        proxy_pass  http://192.168.10.101:8989;
    }
}
```

### `nginx`正则配置

```
~ 为区分大小写匹配(可用正则表达式)
!~为区分大小写不匹配
~* 为不区分大小写匹配(可用正则表达式)
!~*为不区分大小写不匹配
^~ 如果把这个前缀用于一个常规字符串,那么告诉nginx 如果路径匹配那么不测试正则表达式。
```
