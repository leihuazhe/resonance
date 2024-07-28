### 开启`nginx-module-vts`功能

> 默认的`tengie`不包括`nginx-module-vts`功能,需要我们自己自定义加入此模块即可，目前我们使用tengine都是基于`docker`容器，于是笔者自己根据`Dockerfile`构建了自定义的镜像，`Dockerfile`见附文

学习`nginx-module-vts`可参考 vts [Github](https://github.com/vozlt/nginx-module-vts)

#### 基于docker启动tengine并开启vts功能

- 配置`docker-compose`

```yml
tengine:
  container_name: tengine
  image: docker.today36524.com.cn:5000/basic/tengine:2.0.4
  restart: on-failure:3
  environment:
    - LANG=zh_CN.UTF-8
    - TZ=CST-8
  volumes:
    - /data/config/nginx/conf.d/:/etc/nginx/conf.d/
    - /home/today/tscompose/config/nginx.conf:/etc/nginx/nginx.conf
    - /data/config/nginx/cert/:/etc/nginx/cert/
    - /data/logs/nginx:/var/log/nginx
  ports:
    - '80:80'
    - '443:443'
```

- 配置tengine主配置文件 容器内路径 `/etc/nginx/nginx.conf`

```conf
user  nginx;
worker_processes  8;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

worker_rlimit_nofile 65535;

events {
    worker_connections  10240;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    # 开启 vts 监控功能
    vhost_traffic_status_zone;

    log_format  main  '$remote_addr||$time_local||"$request"||'
                      '$status||$body_bytes_sent||"$http_referer"'
                      '||$http_x_forwarded_for||'
                      '||$upstream_status||$upstream_addr||$request_time||$upstream_respo


    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  120;

    gzip on;
    gzip_buffers 16 8k;
    gzip_comp_level 5;
    gzip_disable "MSIE [4-6]\."
    gzip_min_length 1000;
    gzip_http_version 1.1;
    gzip_proxied any;
    gzip_types text/plain text/css application/xml application/javascript application/jso
    gzip_vary on;

    include /etc/nginx/conf.d/*.conf;
}
```

只需要在主配置文件中http模块下加入一行配置即可

```
 vhost_traffic_status_zone;
```

- 在自定义的配置文件中开启监控功能

```conf
upstream maple {
    server 192.168.10.8:9101;
    server 192.168.10.8:9102;
    # health check
    check interval=3000 rise=2 fall=3 timeout=1000 type=http;
    check_http_send "HEAD /health/check  HTTP/1.0\r\n\r\n";
    check_http_expect_alive http_2xx http_3xx;
}

server {
    listen 80;
    server_name localhost;

    access_log  /var/log/nginx/gateway.log;
    error_log /var/log/nginx/gateway-error.log;

    keepalive_timeout 300;
    send_timeout 300;
    proxy_read_timeout 300;

    location / {
        proxy_set_header   Host             $host;
        proxy_set_header   X-Real-IP        $remote_addr;
        proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;

        proxy_pass http://maple;
    }

    location /ngx_status {
        stub_status on;
        # vts功能
        vhost_traffic_status_display;
        vhost_traffic_status_display_format html;
       # 可以配置权限
        allow 127.0.0.1；
        allow 192.168.9.0/24;
       #配置拒绝所有
       #  deny all;
    }
```

- 启动容器
  在tengine 容器内部执行命令可以看到已经加载vts模块

```
nginx -V
```

可以看到有如下模块，说明加入成功`ngx_http_vhost_traffic_status_module`

- 打开浏览器，访问地址，即可显示监控内容
  ![vts.png](https://upload-images.jianshu.io/upload_images/6393906-62eef6a51ff4ef23.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 附录[自定义`tengine` `Dockerfile`]

> 需要注意与Dockerfile同一目录下需要提前写好一个nginx.conf配置

#### 使用命令

```
docker build -t your_docker_file  .
```

#### Dockerfile

```
FROM alpine:3.5

ENV TENGINE_VERSION 2.2.0

# Fork of https://github.com/kairyou/alpine-tengine

ENV CONFIG "\
	--prefix=/etc/nginx \
	--sbin-path=/usr/sbin/nginx \
	--conf-path=/etc/nginx/nginx.conf \
	--error-log-path=/var/log/nginx/error.log \
	--http-log-path=/var/log/nginx/access.log \
	--pid-path=/var/run/nginx.pid \
	--lock-path=/var/run/nginx.lock \
	--http-client-body-temp-path=/var/cache/nginx/client_temp \
	--http-proxy-temp-path=/var/cache/nginx/proxy_temp \
	--http-fastcgi-temp-path=/var/cache/nginx/fastcgi_temp \
	--http-uwsgi-temp-path=/var/cache/nginx/uwsgi_temp \
	--http-scgi-temp-path=/var/cache/nginx/scgi_temp \
	--user=nginx \
	--group=nginx \
	--with-http_ssl_module \
	--with-http_realip_module \
	--with-http_addition_module \
	--with-http_sub_module \
	--with-http_dav_module \
	--with-http_flv_module \
	--with-http_mp4_module \
	--with-http_gunzip_module \
	--with-http_gzip_static_module \
	--with-http_random_index_module \
	--with-http_secure_link_module \
	--with-http_stub_status_module \
	--with-http_auth_request_module \
	--with-http_xslt_module=shared \
	--with-http_image_filter_module=shared \
	--with-http_geoip_module=shared \
	--with-threads \
	--with-http_slice_module \
	--with-mail \
	--with-mail_ssl_module \
	--with-file-aio \
	--with-http_v2_module \
	--with-http_concat_module \
	--with-http_sysguard_module \
	--with-http_dyups_module \
	--add-module=/etc/nginx/3rd-modules/nginx-module-vts-0.1.18 \
	"


RUN addgroup -S nginx \
	&& adduser -D -S -h /var/cache/nginx -s /sbin/nologin -G nginx nginx \
	&& apk add --no-cache --virtual .build-deps \
		gcc \
		libc-dev \
		make \
		openssl-dev \
		pcre-dev \
		zlib-dev \
		linux-headers \
		curl \
		gnupg \
		libxslt-dev \
		gd-dev \
		geoip-dev;
RUN curl -L "http://tengine.taobao.org/download/tengine-$TENGINE_VERSION.tar.gz" -o tengine.tar.gz \
	&& curl -L "https://github.com/vozlt/nginx-module-vts/archive/v0.1.18.tar.gz" -o vtx.tar.gz \
	&& mkdir -p /usr/src \
	# add nginx-module-vts
	&& mkdir -p /etc/nginx/3rd-modules \
  && tar -zxC /usr/src -f tengine.tar.gz \
  && tar -zxC /etc/nginx/3rd-modules -f vtx.tar.gz \
  && rm tengine.tar.gz \
  && rm vtx.tar.gz \
  && cd /usr/src/tengine-$TENGINE_VERSION/ \
	&& ./configure $CONFIG --with-debug \
  && make -j$(getconf _NPROCESSORS_ONLN) \
	&& mv objs/nginx objs/nginx-debug \
	&& ./configure $CONFIG \
	&& make -j$(getconf _NPROCESSORS_ONLN) \
	&& make install \
	&& rm -rf /etc/nginx/html/ \
	&& mkdir /etc/nginx/conf.d/ \
	&& mkdir -p /usr/share/nginx/html/ \
	&& install -m644 html/index.html /usr/share/nginx/html/ \
	&& install -m644 html/50x.html /usr/share/nginx/html/ \
	&& install -m755 objs/nginx-debug /usr/sbin/nginx-debug \
	&& strip /usr/sbin/nginx* \
	&& strip /etc/nginx/modules/*.so \
	&& rm -rf /usr/src/tengine-$TENGINE_VERSION \
	\
	# Bring in gettext so we can get `envsubst`, then throw
	# the rest away. To do this, we need to install `gettext`
	# then move `envsubst` out of the way so `gettext` can
	# be deleted completely, then move `envsubst` back.
	&& apk add --no-cache --virtual .gettext gettext \
	&& mv /usr/bin/envsubst /tmp/ \
	\
	&& runDeps="$( \
		scanelf --needed --nobanner /usr/sbin/nginx /etc/nginx/modules/*.so /tmp/envsubst \
			| awk '{ gsub(/,/, "\nso:", $2); print "so:" $2 }' \
			| sort -u \
			| xargs -r apk info --installed \
			| sort -u \
	)" \
	&& apk add --no-cache --virtual .nginx-rundeps $runDeps \
	&& apk del .build-deps \
	&& apk del .gettext \
	&& mv /tmp/envsubst /usr/local/bin/ \
	\
	# forward request and error logs to docker log collector
	&& ln -sf /dev/stdout /var/log/nginx/access.log \
	&& ln -sf /dev/stderr /var/log/nginx/error.log

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf(仅供参考)

```
user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log error;
pid        /var/run/nginx.pid;

#Specifies the value for maximum file descriptors that can be opened by this process.
worker_rlimit_nofile 51200;

events {
  use epoll;
  worker_connections 51200;
  multi_accept on;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                     '$status $body_bytes_sent "$http_referer" '
                     '"$http_user_agent" "$http_x_forwarded_for"';

    # access_log  /var/log/nginx/access.log  main;
    access_log off;

    # Hide nginx version information
    server_tokens off;
    server_info off;

 ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:ECDH+3DES:DH+3DES:RSA+AESGCM:RSA+AES:RSA+3DES:!aNULL:!MD5:!DSS;

    sendfile on;
    tcp_nopush on;

    keepalive_timeout 65;

    server_names_hash_bucket_size 128;
    client_body_buffer_size 128k;
    client_header_buffer_size 32k;
    large_client_header_buffers 4 32k;
    client_max_body_size 50m;

    client_header_timeout  15;
    client_body_timeout    15;
    send_timeout           12;

    tcp_nodelay on;

    fastcgi_connect_timeout 300;
    fastcgi_send_timeout 300;
    fastcgi_read_timeout 300;
    fastcgi_buffer_size 64k;
    fastcgi_buffers 4 64k;
    fastcgi_busy_buffers_size 128k;
    fastcgi_temp_file_write_size 256k;

    gzip on;
    gzip_min_length  1k;
    gzip_buffers 4 16k;
    gzip_http_version 1.1;
    gzip_comp_level 2;
    gzip_vary on;
    gzip_proxied expired no-cache no-store private auth;
    gzip_disable "MSIE [1-6]\.";
    gzip_types
      application/atom+xml
      application/javascript
      application/x-javascript
      application/json
      application/rss+xml
      application/stylesheet
      application/vnd.ms-fontobject
      application/x-font-ttf
      application/x-web-app-manifest+json
      application/xhtml+xml
      application/xml
      font/opentype
      font/ttf
      font/otf
      image/svg+xml
      image/x-icon
      text/css
      text/javascript
      text/plain
      text/xml
      text/x-component;

    include conf.d/*.conf;
}
```
