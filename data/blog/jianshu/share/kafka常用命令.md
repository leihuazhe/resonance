# Kafka Cheat Sheet

Kafka Docs: [http://kafka.apache.org/documentation.html](http://kafka.apache.org/documentation.html)

## [](http://ronnieroller.com/kafka/cheat-sheet#describe-configs-for-a-topic)Describe configs for a topic

```
bin/kafka-configs.sh --zookeeper localhost:2181 --describe --entity-type topics --entity-name test_topic
```

## [](http://ronnieroller.com/kafka/cheat-sheet#set-retention-times)Set retention times

```
# Deprecated way
bin/kafka-topics.sh  --zookeeper localhost:2181 --alter --topic test_topic --config retention.ms=1000

# Modern way
bin/kafka-configs.sh --zookeeper localhost:2181 --alter --entity-type topics --entity-name test_topic --add-config retention.ms=1000
```

If you need to delete all messages in topic, you can exploit the retention times. First set the retention time to something very low (1000 ms), wait a few seconds, then revert the retention times back to the previous value.

Note: The default retention time is 24 hours (86400000 millis).

## [](http://ronnieroller.com/kafka/cheat-sheet#delete-a-topic)Delete a topic

```
bin/kafka-topics.sh --zookeeper localhost:2181 --delete --topic test_topic
```

## [](http://ronnieroller.com/kafka/cheat-sheet#describe-a-topic)Describe a topic

```
bin/kafka-topics.sh --describe --zookeeper localhost:2181 --topic test_topic
```

## [](http://ronnieroller.com/kafka/cheat-sheet#add-a-partition)Add a partition

```
bin/kafka-topics.sh --alter --zookeeper localhost:2181 --topic test_topic --partitions 3
```

## [](http://ronnieroller.com/kafka/cheat-sheet#create-a-topic)Create a topic

```
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 3 --topic test_topic
```

## [](http://ronnieroller.com/kafka/cheat-sheet#list-topics)List topics

```
bin/kafka-topics.sh --list --zookeeper localhost:2181
```

## [](http://ronnieroller.com/kafka/cheat-sheet#push-a-file-of-messages-to-kafka)Push a file of messages to Kafka

Messages should be one per line.

```
bin/kafka-console-producer.sh --broker-list localhost:9092 --topic test_topic < file.log
```

## [](http://ronnieroller.com/kafka/cheat-sheet#listing-messages-from-a-topic)Listing messages from a topic

```
bin/kafka-console-consumer.sh --zookeeper localhost:2181 --topic test_topic --from-beginning
```

## [](http://ronnieroller.com/kafka/cheat-sheet#to-see-offset-positions-for-consumer-group-per-partition)To see offset positions for consumer group per partition

```
bin/kafka-consumer-offset-checker.sh  --zookeeper localhost:2181 --group {group-id} --topic {topic}

# To start over (reset offset to 0)
bin/kafka-streams-application-reset.sh  --input-topics {topic}  --application-id {group-id} --bootstrap-servers kafkahost:9092
```

Last edited on 2017-05-20 13:50:39
