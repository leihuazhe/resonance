> 一旦给应用程序发送了任务之后，可用的线程就会试图处理所有的请求。我们需要理解如何去使用这些资源，这可以帮助服务使用尽可能少的延迟来达到尽可能多的吞吐量。

在 Actor 中使用配置好的 Dispatcher

在 application.conf 中创建一个 Dispatcher

```conf
article-parsing-dispatcher {
  # Dispatcher is the name of the event-based dispatcher
  type = Dispatcher

  # What kind of ExecutionService to use
  executor = "fork-join-executor"

  # Configuration for the fork join pool
  fork-join-executor {
    # Min number of threads to cap factor-based parallelism number to
    parallelism-min = 2
    # Parallelism (threads) ... ceil(available processors * factor)
    parallelism-factor = 2.0
    # Max number of threads to cap factor-based parallelism number to }
    parallelism-max = 8
  }
  throughput = 50
}
```

在创建一个 actor 时 使用这个 dispatcher

```scala
class ParsingActor(articleList: List[String]) extends Actor {
  val log = Logging(context.system, this)

  val futures: List[Future[String]] = articleList.map(article => {
    Future(ArticleParser.apply(article))
  })

  val articlesFuture: Future[List[String]] = Future.sequence(futures)

  override def receive: Receive = {
    case "maple" ⇒ log.info("receive message maple")
  }
}

object ParsingActor {
  private implicit val timeout: Timeout = Timeout(10 seconds)

  def main(args: Array[String]): Unit = {

    val system = ActorSystem("specify-dispatcher")
    //Actor Pool
    val parsingActor: ActorRef = system.actorOf(Props(classOf[ParsingActor], List("1"))
      .withDispatcher("article-parsing-dispatcher"), "parsingActor")

    parsingActor ! "maple"
  }
}
```
