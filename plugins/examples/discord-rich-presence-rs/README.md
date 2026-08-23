# Discord Rich Presence 插件（Rust）

一个 Navidrome 插件，使用 Rich Presence 在 Discord 上显示你当前正在播放的曲目。这是 Rust 实现，演示如何使用 `nd-pdk` 库。

## ⚠️ 警告

此插件**仅用于演示**。它要求在 Navidrome 配置文件中存储你的 Discord token，这：

1. 不安全（token 绝不应以明文存储）
2. 可能违反 Discord 的服务条款

**使用风险自负。**

## 功能

- 在 Discord Rich Presence 上显示当前正在播放的曲目
- 显示专辑封面
- 以开始/结束时间戳显示曲目进度
- 曲目结束时自动清除 presence
- 支持多个用户

## 能力

此插件实现多项能力以演示 nd-pdk 库：

- **Scrobbler**：从 Navidrome 接收正在播放事件
- **SchedulerCallback**：处理心跳和活动清除定时器
- **WebSocketCallback**：与 Discord 网关通信（文本、二进制、错误和关闭处理器）

## 配置

在 Navidrome UI 中配置（设置 → 插件 → discord-rich-presence-rs）：

| 键           | 描述                          | 示例                   |
|---------------|--------------------------------------|---------------------------|
| `clientid`    | 你的 Discord 应用 ID          | `123456789012345678`      |
| `user.<name>` | 指定用户的 Discord token | `user.alice` = `token123` |

每个用户都使用 `user.` 前缀作为独立的键进行配置。


### 获取配置值

1. **客户端 ID**：在 https://discord.com/developers/applications 创建 Discord 应用并复制应用 ID

2. **Discord Token**：这需要从 Discord 提取你的用户 token（出于安全原因不推荐）

3. **多个用户**：添加多个用户键：
   ```properties
   user.user1 = "token1"
   user.user2 = "token2"
   ```

## 构建

```bash
# From the plugins/examples directory
make discord-rich-presence-rs.ndp

# This creates discord-rich-presence-rs.ndp containing:
# - manifest.json
# - plugin.wasm
```

## 安装

1. 使用上述命令构建插件
2. 将 `.ndp` 文件复制到你的 Navidrome 插件目录
3. 在 Navidrome UI 中启用并配置插件（设置 → 插件）
4. 如有需要，重启 Navidrome

## 使用 nd-pdk 库

此插件演示如何使用 Rust 插件开发套件：

```rust
use nd_pdk::host::{artwork, cache, scheduler, websocket};
use std::collections::HashMap;

// Get artwork URL
let url = artwork::get_track_url(track_id, 300)?;

// Cache operations
cache::set_string("key", "value", 3600)?;
if let Some(value) = cache::get_string("key")? {
    // Use the cached value
}

// Schedule tasks
scheduler::schedule_one_time(60, "payload", "task-id")?;
scheduler::schedule_recurring("@every 30s", "heartbeat", "heartbeat-task")?;

// WebSocket operations
let conn_id = websocket::connect("wss://example.com/socket", HashMap::new(), "my-conn")?;
websocket::send_text(&conn_id, "Hello")?;
```

## 许可证

GPL-3.0
