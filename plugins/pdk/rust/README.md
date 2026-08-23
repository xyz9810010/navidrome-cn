# Navidrome Rust 插件开发套件

此目录包含用于构建 Navidrome 插件的 Rust PDK crate。

## Crate 结构

```
plugins/pdk/rust/
├── nd-pdk/              # 汇总 crate - 将其作为你的依赖使用
├── nd-pdk-host/         # 宿主函数包装器（调用 Navidrome 服务）
└── nd-pdk-capabilities/ # 能力 trait 和类型（生成）
```

## 用法

在插件的 `Cargo.toml` 中将 `nd-pdk` crate 添加为依赖：

```toml
[package]
name = "my-plugin"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
nd-pdk = { path = "../../pdk/rust/nd-pdk" }
extism-pdk = "1.2"
```

### 实现 Scrobbler（全部必需模式）

Scrobbler 能力要求实现所有方法：

```rust
use nd_pdk::scrobbler::{
    Error, IsAuthorizedRequest,
    NowPlayingRequest, ScrobbleRequest, Scrobbler,
};

// Register WASM exports for all Scrobbler methods
nd_pdk::register_scrobbler!(MyPlugin);

#[derive(Default)]
struct MyPlugin;

impl Scrobbler for MyPlugin {
    fn is_authorized(&self, req: IsAuthorizedRequest) -> Result<bool, Error> {
        Ok(true)
    }

    fn now_playing(&self, req: NowPlayingRequest) -> Result<(), Error> {
        // Handle now playing notification
        Ok(())
    }

    fn scrobble(&self, req: ScrobbleRequest) -> Result<(), Error> {
        // Submit scrobble
        Ok(())
    }
}
```

### 实现元数据代理（可选模式）

MetadataAgent 能力允许实现单个方法：

```rust
use nd_pdk::metadata::{
    ArtistBiographyProvider, GetArtistBiographyRequest, ArtistBiography, Error,
};

// Register only the methods you implement
nd_pdk::register_artist_biography!(MyPlugin);

#[derive(Default)]
struct MyPlugin;

impl ArtistBiographyProvider for MyPlugin {
    fn get_artist_biography(&self, req: GetArtistBiographyRequest) 
        -> Result<ArtistBiography, Error> 
    {
        // Return artist biography
        Ok(ArtistBiography {
            biography: "Artist bio text...".into(),
            ..Default::default()
        })
    }
}
```

### 使用宿主服务

通过 host 模块访问 Navidrome 服务：

```rust
use nd_pdk::host::{artwork, scheduler, library};

// Get artwork URL for a track
let url = artwork::get_track_url("track-id", 300)?;

// Schedule a one-time callback
scheduler::schedule_one_time(60, "my-payload", "schedule-id")?;

// Get library information
let libs = library::get_all()?;
```

## 可用的能力

| 能力  | 模式      | 描述                                         |
|-------------|--------------|-----------------------------------------------------|
| `scrobbler` | 全部必需 | 向外部服务提交收听历史       |
| `metadata`  | 可选     | 从外部来源提供艺人/专辑元数据 |
| `lifecycle` | 可选     | 处理插件初始化                        |
| `scheduler` | 可选     | 接收定时回调                         |
| `websocket` | 可选     | 处理 WebSocket 消息                           |

## 构建

Rust 插件必须使用 `wasm32-wasip1` target 编译为 WASM：

```bash
cargo build --release --target wasm32-wasip1
```

生成的 `.wasm` 文件可以打包为 `.ndp` 插件包。

## 示例

完整的实现请参见示例插件：

- [webhook-rs](../../examples/webhook-rs/) - 使用 PDK 的简单 scrobbler
- [discord-rich-presence-rs](../../examples/discord-rich-presence-rs/) - 具有多项能力的复杂插件
- [library-inspector-rs](../../examples/library-inspector-rs/) - 宿主服务演示

## 代码生成

`nd-pdk-capabilities` 中的能力模块是从 Go 能力定义自动生成的。要在能力变更后重新生成：

```bash
make gen
```

这会生成 Go 和 Rust 两种 PDK 代码。
