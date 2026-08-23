此文件夹将元数据查找抽象为 "agent"。每个 agent 都可以通过使用一组细粒度的接口（参见 [interfaces](interfaces.go)）来实现，以获取外部数据源所提供的尽可能多的信息。

新的 agent 必须遵循以下简单的实现规则：
1) 实现 `AgentName()` 方法。它仅返回 agent 的名称，用于日志记录。
2) 实现一个或多个 `*Retriever()` 接口。agent 的逻辑就位于其中。
3) 在它的 `init()` 函数中注册自身。

一个 agent 要被使用，需要被列在 `Agents` 配置项中（默认是 `"deezer,lastfm"`）。顺序决定了 agent 的优先级。

关于一个简单的 Agent 示例，请查看 [local_agent](local_agent.go) agent 的源代码。
