删除一个盘下的某个容器...

```
sudo diskutil eraseVolume APFS drive /dev/disk1s5
```

例子：

```
~  diskutil list
/dev/disk0 (internal):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      GUID_partition_scheme                         251.0 GB   disk0
   1:                        EFI EFI                     314.6 MB   disk0s1
   2:                 Apple_APFS Container disk1         250.7 GB   disk0s2

/dev/disk1 (synthesized):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      APFS Container Scheme -                      +250.7 GB   disk1
                                 Physical Store disk0s2
   1:                APFS Volume Preboot                 21.5 MB    disk1s2
   2:                APFS Volume Recovery                515.1 MB   disk1s3
   3:                APFS Volume VM                      2.1 GB     disk1s4
   4:                APFS Volume Macintosh HD            20.4 GB    disk1s7
   5:                APFS Volume drive                   892.9 KB   disk1s5
```

输入命令：

```
sudo diskutil eraseVolume APFS drive /dev/disk1s2
```

结果：

```
~  diskutil list
/dev/disk0 (internal):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      GUID_partition_scheme                         251.0 GB   disk0
   1:                        EFI EFI                     314.6 MB   disk0s1
   2:                 Apple_APFS Container disk1         250.7 GB   disk0s2

/dev/disk1 (synthesized):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      APFS Container Scheme -                      +250.7 GB   disk1
                                 Physical Store disk0s2
   1:                APFS Volume Recovery                515.1 MB   disk1s3
   2:                APFS Volume VM                      2.1 GB     disk1s4
   3:                APFS Volume Macintosh HD            20.4 GB    disk1s7
   4:                APFS Volume drive                   892.9 KB   disk1s5
   5:                APFS Volume drive                   843.8 KB   disk1s2
```

#### 参考文章

- https://www.ithinkdiff.com/fix-partition-issues-in-mac-os-x-when-disk-utility-doesnt-help/
