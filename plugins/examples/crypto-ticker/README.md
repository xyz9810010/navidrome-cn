# 加密货币行情插件

这是一个面向 Navidrome 的基于 WebSocket 的 WASM 插件，用于显示来自 Coinbase 的实时加密货币价格。

## 功能

- 连接 Coinbase WebSocket API 以接收实时行情更新
- 可配置跟踪多个加密货币交易对
- 实现用于消息处理的 WebSocket 回调处理器
- 使用 scheduler 服务在连接断开时自动重连
- 显示价格、最佳买价、最佳卖价和 24 小时涨跌幅

## 配置

在 Navidrome UI 中配置（设置 → 插件 → crypto-ticker）：

| 键       | 描述                                                          | 默认   |
|-----------|----------------------------------------------------------------------|-----------|
| `tickers` | 逗号分隔的加密货币符号列表（例如 `BTC,ETH,SOL`） | `BTC,ETH` |

插件会为任何未指定交易对的符号追加 `-USD`。

## 工作原理

1. 插件初始化时，连接 Coinbase 的 WebSocket API
2. 订阅所配置加密货币的行情更新
3. 传入的行情数据通过 `nd_websocket_on_text_message` 回调处理
4. 连接断开时，通过 scheduler 服务安排重连尝试
5. 重连会持续尝试直到成功

## 构建

构建插件并打包为 `.ndp`：

```bash
# Using TinyGo (recommended - smaller binary)
tinygo build -o plugin.wasm -target wasip1 -buildmode=c-shared .
zip -j crypto-ticker.ndp manifest.json plugin.wasm
```

或从 `plugins/examples/` 目录：

```bash
make crypto-ticker.ndp
```

## 安装

将生成的 `crypto-ticker.ndp` 复制到你的 Navidrome 插件文件夹。

## 示例输出

```
[Crypto] Crypto Ticker Plugin initializing...
[Crypto] Configured tickers: [BTC-USD ETH-USD]
[Crypto] Connected to Coinbase WebSocket API (connection: crypto-ticker-conn)
[Crypto] Subscription message sent to Coinbase WebSocket API
[Crypto] Received subscriptions message
[Crypto] 💰 BTC-USD: $98765.43 (24h: +2.35%) Bid: $98764.00 Ask: $98766.00
[Crypto] 💰 ETH-USD: $3456.78 (24h: -0.54%) Bid: $3455.90 Ask: $3457.80
```

## 所需权限

- **config**：读取行情符号配置
- **websocket**：连接 `ws-feed.exchange.coinbase.com`
- **scheduler**：安排重连尝试

## 文件

- `main.go` - 主插件实现
- `go.mod` - Go 模块文件

## PDK

此插件直接导入 Navidrome PDK 子包：

```go
import (
    "github.com/navidrome/navidrome/plugins/pdk/go/host"
    "github.com/navidrome/navidrome/plugins/pdk/go/lifecycle"
    "github.com/navidrome/navidrome/plugins/pdk/go/scheduler"
    "github.com/navidrome/navidrome/plugins/pdk/go/websocket"
)
```

`go.mod` 文件使用 `replace` 指令指向本地包以方便开发。

---

更多细节请参阅 `main.go` 中的源代码。
