> kafka消费者在消费消息时,分为心跳线程和用户线程(处理消息的线程)

### 消费消息`poll`方法

我们在第一次启动消费者消费消息时，首先调用的时poll()

```java
while (isRunning) {
    ConsumerRecords<String, String> records = consumer.poll(100);
        if (records != null && records.count() > 0) {
           dealMessage(records);
        }
}
```

### KafkaConsumer poll

```java
public ConsumerRecords<K, V> poll(long timeout) {
        acquireAndEnsureOpen();
        try {
            if (timeout < 0)
                throw new IllegalArgumentException("Timeout must not be negative");

            if (this.subscriptions.hasNoSubscriptionOrUserAssignment())
                throw new IllegalStateException("Consumer is not subscribed to any topics or assigned any partitions");

            // poll for new data until the timeout expires
            long start = time.milliseconds();
            long remaining = timeout;
            do {
                Map<TopicPartition, List<ConsumerRecord<K, V>>> records = pollOnce(remaining);
                if (!records.isEmpty()) {
                    // before returning the fetched records, we can send off the next round of fetches
                    // and avoid block waiting for their responses to enable pipelining while the user
                    // is handling the fetched records.
                    //
                    // NOTE: since the consumed position has already been updated, we must not allow
                    // wakeups or any other errors to be triggered prior to returning the fetched records.
                    if (fetcher.sendFetches() > 0 || client.hasPendingRequests())
                        client.pollNoWakeup();

                    if (this.interceptors == null)
                        return new ConsumerRecords<>(records);
                    else
                        return this.interceptors.onConsume(new ConsumerRecords<>(records));
                }

                long elapsed = time.milliseconds() - start;
                remaining = timeout - elapsed;
            } while (remaining > 0);

            return ConsumerRecords.empty();
        } finally {
            release();
        }
}
```

### 3.pollOnce(remaining)

```java
private Map<TopicPartition, List<ConsumerRecord<K, V>>> pollOnce(long timeout) {
        client.maybeTriggerWakeup();
        coordinator.poll(time.milliseconds(), timeout);

        // fetch positions if we have partitions we're subscribed to that we
        // don't know the offset for
        if (!subscriptions.hasAllFetchPositions())
            updateFetchPositions(this.subscriptions.missingFetchPositions());

        // if data is available already, return it immediately
        Map<TopicPartition, List<ConsumerRecord<K, V>>> records = fetcher.fetchedRecords();
        if (!records.isEmpty())
            return records;

        // send any new fetches (won't resend pending fetches)
        fetcher.sendFetches();

        long now = time.milliseconds();
        long pollTimeout = Math.min(coordinator.timeToNextPoll(now), timeout);

        client.poll(pollTimeout, now, new PollCondition() {
            @Override
            public boolean shouldBlock() {
                // since a fetch might be completed by the background thread, we need this poll condition
                // to ensure that we do not block unnecessarily in poll()
                return !fetcher.hasCompletedFetches();
            }
        });

        // after the long poll, we should check whether the group needs to rebalance
        // prior to returning data so that the group can stabilize faster
        if (coordinator.needRejoin())
            return Collections.emptyMap();

        return fetcher.fetchedRecords();
}
```

### 4.coordinator.poll(time.milliseconds(), timeout);

```java
public void poll(long now, long remainingMs) {
        invokeCompletedOffsetCommitCallbacks();

        if (subscriptions.partitionsAutoAssigned()) {
            if (coordinatorUnknown()) {
                ensureCoordinatorReady();
                now = time.milliseconds();
            }

            if (needRejoin()) {
                // due to a race condition between the initial metadata fetch and the initial rebalance,
                // we need to ensure that the metadata is fresh before joining initially. This ensures
                // that we have matched the pattern against the cluster's topics at least once before joining.
                if (subscriptions.hasPatternSubscription())
                    client.ensureFreshMetadata();

                ensureActiveGroup();
                now = time.milliseconds();
            }
        } else {
            // For manually assigned partitions, if there are no ready nodes, await metadata.
            // If connections to all nodes fail, wakeups triggered while attempting to send fetch
            // requests result in polls returning immediately, causing a tight loop of polls. Without
            // the wakeup, poll() with no channels would block for the timeout, delaying re-connection.
            // awaitMetadataUpdate() initiates new connections with configured backoff and avoids the busy loop.
            // When group management is used, metadata wait is already performed for this scenario as
            // coordinator is unknown, hence this check is not required.
            if (metadata.updateRequested() && !client.hasReadyNodes()) {
                boolean metadataUpdated = client.awaitMetadataUpdate(remainingMs);
                if (!metadataUpdated && !client.hasReadyNodes())
                    return;
                now = time.milliseconds();
            }
        }

        pollHeartbeat(now);
        maybeAutoCommitOffsetsAsync(now);
}
```

### 5.ensureActiveGroup();

```
public void ensureActiveGroup() {
        // always ensure that the coordinator is ready because we may have been disconnected
        // when sending heartbeats and does not necessarily require us to rejoin the group.
        ensureCoordinatorReady();
        startHeartbeatThreadIfNeeded();
        joinGroupIfNeeded();
}
```

### 6.startHeartbeatThreadIfNeeded

> 启动心跳线程

```
private synchronized void startHeartbeatThreadIfNeeded() {
        if (heartbeatThread == null) {
            heartbeatThread = new HeartbeatThread();
            heartbeatThread.start();
        }
}

```

### 分析

到这一步我们发现了，消费者与broker的心跳连接是启动了一个后台线程专门来做的。
