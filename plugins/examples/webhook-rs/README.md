# Webhook Scrobbler 插件（Rust）

一个用 Rust 编写的 Navidrome 插件，在曲目被 scrobble 时发送 HTTP webhook 通知。它可用于集成外部服务，例如家庭自动化系统、Discord 机器人、监控工具，或任何能接收 HTTP 请求的服务。

## 功能

- 在每次 scrobble 事件时向配置的 URL 发送 HTTP GET 请求
- 将曲目元数据（标题、艺人、专辑、用户名、时间戳）作为查询参数包含在内
- 支持多个 webhook URL（逗号分隔）
- 所有用户自动获得授权（无需外部服务认证）
- 正在播放事件被忽略（webhook 仅在完成 scrobble 时触发）

## 前置条件

- [Rust](https://rustup.rs/) 工具链
- WebAssembly target：`rustup target add wasm32-unknown-unknown`

## 构建

在 `plugins/examples` 目录下：

```bash
make webhook-rs.ndp
```

或直接使用 cargo 构建：

```bash
cd webhook-rs
cargo build --release
zip -j webhook-rs.ndp manifest.json target/wasm32-unknown-unknown/release/webhook_rs.wasm
```

## 安装

将 `webhook-rs.ndp` 复制到你的 Navidrome 插件文件夹（通过配置中的 `Plugins.Folder` 设置）。

## 配置

在 Navidrome UI 中配置（设置 → 插件 → webhook-rs）：

| 键    | 描述                          | 示例                                                   |
|--------|--------------------------------------|-----------------------------------------------------------|
| `urls` | 逗号分隔的 webhook URL 列表 | `https://example.com/hook1,https://example.com/hook2`     |

## Webhook 请求格式

发生 scrobble 时，插件会向每个配置的 URL 发送 HTTP GET 请求，并带有以下查询参数：

| 参数   | 描述                                   |
|-------------|-----------------------------------------------|
| `title`     | 曲目标题                                   |
| `artist`    | 曲目艺人                                  |
| `album`     | 专辑名称                                    |
| `user`      | 执行 scrobble 的用户名                        |
| `timestamp` | 曲目开始播放时的 Unix 时间戳 |

示例请求：
```
GET https://example.com/webhook?title=Song%20Name&artist=Artist%20Name&album=Album%20Name&user=john&timestamp=1703270400
```

## 用例

- **家庭自动化**：音乐开始播放时触发灯光或显示器
- **Discord/Slack 通知**：将当前正在播放的曲目发布到频道
- **日志/分析**：在外部系统中跟踪收听历史
- **IFTTT/Zapier 集成**：通过 webhook 触发器连接到成千上万的服务

## 开发

此插件使用 [Extism Rust PDK](https://github.com/extism/rust-pdk) 构建。关键导出：

- `nd_manifest` - 返回插件元数据和权限
- `nd_scrobbler_is_authorized` - 始终返回 `true`（所有用户获得授权）
- `nd_scrobbler_now_playing` - 空操作（返回成功但不执行任何操作）
- `nd_scrobbler_scrobble` - 向配置的 URL 发送 webhook
