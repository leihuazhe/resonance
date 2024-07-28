> 网上几乎所有启动`etcd`容器方式都是以 `dokcer run`的形式,但是由于生产上采用`docker-compose`的写法会更方便维护，于是通过不断尝试后，最终测试出了以`dokcer-compose`启动`etcd`的方式

## 1.以`docker run`形式启动`etcd`

```yml
# 设置HostIP
export HostIP=192.168.1.102
# 执行etcd安装启动命令
docker run -d -v /usr/share/ca-certificates/:/etc/ssl/certs -p 4001:4001 -p 2380:2380 -p 2379:2379 \
 --restart=always \
 --name etcd registry.cn-hangzhou.aliyuncs.com/coreos_etcd/etcd:v3 \
 /usr/local/bin/etcd \
 -name etcd0 \
 -advertise-client-urls http://${HostIP}:2379,http://${HostIP}:4001 \
 -listen-client-urls http://0.0.0.0:2379,http://0.0.0.0:4001 \
 -initial-advertise-peer-urls http://${HostIP}:2380 \
 -listen-peer-urls http://0.0.0.0:2380 \
 -initial-cluster-token etcd-cluster-1 \
 -initial-cluster etcd0=http://${HostIP}:2380 \
 -initial-cluster-state new
```

## 2.以`docker-compose`启动的模式如下

```yml
etcd:
  container_name: etcd0
  image: registry.cn-hangzhou.aliyuncs.com/coreos_etcd/etcd:v3
  ports:
    - '2379:2379'
    - '4001:4001'
    - '2380:2380'
  environment:
    - TZ=CST-8
    - LANG=zh_CN.UTF-8
  command: /usr/local/bin/etcd
    -name etcd0
    -data-dir /etcd-data
    -advertise-client-urls http://${host_ip}:2379,http://${host_ip}:4001
    -listen-client-urls http://0.0.0.0:2379,http://0.0.0.0:4001
    -initial-advertise-peer-urls http://${host_ip}:2380
    -listen-peer-urls http://0.0.0.0:2380
    -initial-cluster-token docker-etcd
    -initial-cluster etcd0=http://${host_ip}:2380
    -initial-cluster-state new
  volumes:
    - '/data/conf/etcd/data:/etcd-data'
    # - "/data/config/etcd/ca-certificates/:/etc/ssl/certs"
  labels:
    - project.source=
    - project.extra=public-image
    - project.depends=
    - project.owner=LHZ
```
