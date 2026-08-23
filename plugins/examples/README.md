# Navidrome 插件示例

此文件夹包含多个示例插件，展示了 Navidrome 插件系统支持的各种能力和语言。

## 可用示例

| 插件                                                | 语言 | 能力                                    | 描述                    |
|-------------------------------------------------------|----------|-------------------------------------------------|--------------------------------|
| [minimal](minimal/)                                   | Go       | MetadataAgent                                   | 基本插件结构         |
| [wikimedia](wikimedia/)                               | Go       | MetadataAgent                                   | Wikidata/Wikipedia 元数据    |
| [crypto-ticker](crypto-ticker/)                       | Go       | Scheduler、WebSocket、Cache                     | 实时加密货币价格（演示） |
| [coverartarchive-py](coverartarchive-py/)             | Python   | MetadataAgent                                   | Cover Art Archive              |
| [nowplaying-py](nowplaying-py/)                       | Python   | Scheduler、SubsonicAPI                          | 正在播放记录器             |
| [webhook-rs](webhook-rs/)                             | Rust     | Scrobbler                                       | scrobble 时的 HTTP webhook       |
| [library-inspector-rs](library-inspector-rs/)         | Rust     | Library、Scheduler                              | 定期媒体库统计日志 |
| [discord-rich-presence-rs](discord-rich-presence-rs/) | Rust     | Scrobbler、Scheduler、WebSocket、Cache、Artwork | Discord 集成（Rust）     |

## 构建

### 前置条件

- **Go 插件：** [TinyGo](https://tinygo.org/getting-started/install/) 0.30+
- **Python 插件：** [extism-py](https://github.com/extism/python-pdk)
- **Rust 插件：** [Rust](https://rustup.rs/) 以及 `wasm32-unknown-unknown` target

### 构建所有插件

```bash
make all
```

这会为每个插件创建 `.ndp` 包文件。

### 构建单个插件

```bash
make minimal.ndp
make wikimedia.ndp
make discord-rich-presence-rs.ndp
```

### 清理

```bash
make clean
```

## 测试插件

### 使用 Extism CLI

无需运行 Navidrome 即可测试任何插件。首先从 `.ndp` 包中提取 `.wasm` 文件：

```bash
# Install: https://extism.org/docs/install

# Extract the wasm file from the package
unzip -p minimal.ndp plugin.wasm > minimal.wasm

# Test a capability function
extism call minimal.wasm nd_get_artist_biography --wasi \
  --input '{"id":"1","name":"The Beatles"}'
```

对于发起 HTTP 请求的插件，需要允许这些主机：

```bash
unzip -p wikimedia.ndp plugin.wasm > wikimedia.wasm
extism call wikimedia.wasm nd_get_artist_biography --wasi \
  --input '{"id":"1","name":"Yussef Dayes"}' \
  --allow-host "query.wikidata.org" \
  --allow-host "en.wikipedia.org"
```

### 使用 Navidrome

1. 将 `.ndp` 文件复制到你的插件文件夹
2. 在 `navidrome.toml` 中启用插件：
   ```toml
   [Plugins]
   Enabled = true
   Folder = "/path/to/plugins"
   ```
3. 对于元数据代理，将其添加到你的代理列表中：
   ```toml
   Agents = "lastfm,spotify,wikimedia"
   ```

## 创建你自己的插件

### 方式 1：从 Minimal 开始

复制 [minimal](minimal/) 示例并修改：

```bash
cp -r minimal my-plugin
cd my-plugin
# Edit main.go and manifest.json
tinygo build -o plugin.wasm -target wasip1 -buildmode=c-shared .
zip -j my-plugin.ndp manifest.json plugin.wasm
```

### 方式 2：使用 XTP CLI 引导

从模式生成样板代码：

```bash
# Install XTP: https://docs.xtp.dylibso.com/docs/cli

xtp plugin init \
  --schema-file ../schemas/metadata_agent.yaml \
  --template go \
  --path ./my-plugin \
  --name my-plugin

# Then create manifest.json and package
cd my-plugin
xtp plugin build
zip -j my-plugin.ndp manifest.json dist/plugin.wasm
```

[../schemas/](../schemas/) 中可用的模式：
- `metadata_agent.yaml` – 艺人/专辑元数据
- `scrobbler.yaml` – Scrobbling 集成
- `lifecycle.yaml` – 初始化回调
- `scheduler_callback.yaml` – 定时任务
- `websocket_callback.yaml` – WebSocket 事件

### 方式 3：使用不同语言

参见各语言的具体示例：
- **Python：** [coverartarchive-py](coverartarchive-py/)
- **Rust：** [webhook-rs](webhook-rs/)

## 示例详解

### Minimal（Go）

尽可能最简单的插件。展示：
- Manifest 导出
- 单个能力函数
- 基本的输入/输出处理

### Wikimedia（Go）

真实世界的元数据代理。展示：
- 对外部 API 的 HTTP 请求
- SPARQL 查询（Wikidata）
- 错误处理
- 主机允许列表

### Discord Rich Presence（Go）

复杂的多能力插件。展示：
- **Scrobbler** – 接收播放事件
- **WebSocket** – 维持 Discord 网关连接
- **Scheduler** – 心跳和超时管理
- **Cache** – 连接状态存储
- **Artwork** – 获取专辑封面 URL

### Cover Art Archive（Python）

Python 元数据代理。展示：
- extism-py 插件结构
- HTTP 请求
- JSON 处理

### Webhook（Rust）

Rust scrobbler。展示：
- extism-rs 插件结构
- HTTP POST 请求
- 最小化依赖

## 资源

- [插件系统文档](../README.md)
- [Extism PDK 文档](https://extism.org/docs/concepts/pdk)
- [TinyGo WebAssembly](https://tinygo.org/docs/guides/webassembly/)
- [XTP CLI](https://docs.xtp.dylibso.com/docs/cli)
