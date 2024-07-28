### docker网络之mtu调整

> docker mtu默认是1500,阿里云的mtu和docker的mtu都为1500,所以使用阿里云不需要任何调整

#### 如果虚拟机的mtu不是1500，而是1450.可以通过如下配置，将docker默认的mtu改为1450

```
networks:
  net:
    driver_opts:
      com.docker.network.driver.mtu: 1450
    external: false
```

#### docker-compose里的应用加网络选项

```
kafkaMsgAgent:
    networks:
       - net
    extends:
      file: dc-all.yml
      service: kafkaMsgAgent
```

### 批量删除docker容器

```
//1
docker images | grep doss-api | awk '{print $3}'
//2
docker rmi $(docker images | grep doss-api | awk '{print $3}')
```
