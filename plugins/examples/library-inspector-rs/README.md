# 媒体库检查器插件

一个用 Rust 编写的 Navidrome 插件，演示 Library 宿主服务。它会定期记录所有已配置音乐媒体库的详细信息，并找出每个媒体库目录根目录中最大的文件。

## 功能

- 记录全面的媒体库统计信息（歌曲、专辑、艺人、大小、时长）
- 列出每个媒体库根目录中找到的最大文件
- 可通过 cron 表达式配置检查间隔
- 在插件加载时运行一次初始检查

## 要求

- 带有 `wasm32-wasip1` target 的 Rust 工具链
- 启用插件的 Navidrome

## 构建

```bash
# Install the WASM target if you haven't already
rustup target add wasm32-wasip1

# Build the plugin
cargo build --target wasm32-wasip1 --release

# Package as .ndp
zip -j library-inspector.ndp manifest.json target/wasm32-wasip1/release/library_inspector.wasm
```

或使用示例目录提供的 Makefile：

```bash
cd plugins/examples
make library-inspector.ndp
```

## 安装

1. 将 `.ndp` 文件复制到你的 Navidrome 插件文件夹
2. 在你的 Navidrome 配置中启用插件：

```toml
[Plugins]
Enabled = true
Folder = "/path/to/plugins"
```

3. 重启 Navidrome 并在 UI 中启用插件

## 配置

在 Navidrome UI 中配置检查间隔（设置 → 插件 → library-inspector）：

| 键    | 描述                              | 默认      |
|--------|------------------------------------------|--------------|
| `cron` | 检查间隔的 cron 表达式  | `@every 1m`  |

## 权限

此插件需要：

- **Library**（带文件系统）：读取媒体库元数据并扫描目录
- **Scheduler**：安排定期检查

## 示例输出

```
=== Library Inspection Started ===
Found 2 libraries
----------------------------------------
Library: My Music (ID: 1)
  Songs:    5432 tracks
  Albums:   456
  Artists:  234
  Size:     45.67 GB
  Duration: 312h 45m
  Mount:    /libraries/1
  Largest file in root: cover.jpg (2.34 MB)
----------------------------------------
Library: Podcasts (ID: 2)
  Songs:    128 tracks
  Albums:   12
  Artists:  8
  Size:     3.21 GB
  Duration: 48h 15m
  Mount:    /libraries/2
  Largest file in root: episode-001.mp3 (156.78 MB)
=== Library Inspection Complete ===
```

## 许可证

GPL-3.0 - 与 Navidrome 相同
