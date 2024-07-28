> 也称为 tail based sampling.

## 什么是 Intelligent Sampling?

> Intelligent Sampling 又称为tail-based sampling，是一种用于分布式链路追踪的技术，用于将采样的数据限制为更相关的采样（limit the collection of traces to those that are more relevant）。

众所周知，链路跟踪的数据要跟踪应用程序中的每个请求，所以它很冗长。 对于大批量应用，这会导致大批量数据采集。 其中一些跟踪（例如包含错误的跟踪）很重要，而其他跟踪（例如每个HTTP状态代码200的延迟非常相似）则不重要。

为了解决跟踪数据的冗长性，引入了基于头部的采样(head-based)。 在基于头的情况下，采样会在请求起点处来做是否采样的决定。
尽管这很容易实现，但是它有很大的局限性。最大的问题是有关下游跨度的信息（例如延迟，错误等）都未知，因为在起点决定是否采样时我们尚未收集到下游数据。 这意味着基于头的采样擅长减少冗长，但不利于收集相关我们需要的重要指标的轨迹。

另一种解决方案是基于尾部的采样模式(Tail based)。对于基于尾部的采样，仅在收集完整个轨迹之后才做出采样决策。 结果，通过基于尾部的采样，可以捕获相关迹线，这样可以最少化甚至从不采样不太相关的迹线（即没有错误的链路信息）。

尽管基于尾部的采样是理想的，但它引入了相当多的复杂性。 例如，给定追踪的所有Span都需要由同一系统处理，并且直到完整的追踪链路全部被收集完成并做出采样决定后，后端才能获取到该链路追踪全部数据（我们很难知道追踪何时能完成 ）。

## OpenCensus 怎么处理 Intelligent Sampling

> OpenCensus 在 OpenCensus Collector 中提供了智能采样(Intelligent Sampling)。

现在我们可以通过 `OpenCensus Collector` 对每一个出口进行单一采集规则。支持以下采样策略

- 速率限制：每秒导出字符串标签过滤器的
- 最大跨度数：导出具有指定键/字符串值标签的跟踪
- 数字标签过滤器：导出具有指定键/值标签的跟踪
- 始终采样：发送所有跟踪 作为完整的痕迹

通过采样配置部分完成配置。例如：

```yml
sampling:
  mode: tail
  # amount of time from seeing the first span in a trace until making the sampling decision
  decision-wait: 10s
  # maximum number of traces kept in the memory
  num-traces: 10000
  policies:
    # user-defined policy name
    my-string-tag-filter:
      # exporters the policy applies to
      exporters:
        - jaeger
      policy: string-tag-filter
      configuration:
        tag: tag1
        values:
          - value1
          - value2
    my-numeric-tag-filter:
      exporters:
        - zipkin
      policy: numeric-tag-filter
      configuration:
        tag: tag1
        min-value: 0
        max-value: 100
```

除了策略外，还必须注意`Decision-waitconfiguration`参数。 此参数指定应用采样策略之前要等待的时间。 如果知道追踪所花费的时间超过十秒钟，则应更改此配置。

## 总结

借助OpenCensus Collector，您可以配置分布式跟踪数据的智能采样。 它支持当今的各种不同策略，并且具有可扩展的后端，可以轻松地根据需要添加更多策略。 目前，它支持为每个导出器支持一个策略，但并不能解决基于traceID的路由，但这是将来计划要解决的。

## 参考

原文([https://sflanders.net/2019/04/17/intelligent-sampling-with-opencensus/](https://sflanders.net/2019/04/17/intelligent-sampling-with-opencensus/)
)
