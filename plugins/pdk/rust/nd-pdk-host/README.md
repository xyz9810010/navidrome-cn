# Navidrome Rust 宿主函数包装器

此目录包含 Navidrome 宿主服务的自动生成 Rust 包装器。
这些包装器为从 WASM 插件与 Navidrome 交互提供了符合 Rust 习惯的 API。

## ⚠️ 自动生成的代码

**请勿手动编辑这些文件。** 它们由 `ndpgen` 工具生成。

要重新生成：

```bash
make gen
```

## 用法

在插件的 `Cargo.toml` 中将此 crate 添加为依赖：

```toml
[dependencies]
nd-host = { path = "../../pdk/rust/host" }
```

然后导入你需要的服务：

```rust
use nd_host::{cache, scheduler, library};
use nd_host::library::Library; // Import the typed struct

#[plugin_fn]
pub fn my_callback(input: String) -> FnResult<String> {
    // Use the cache service
    cache::set("my_key", b"my_value", 3600)?;

    // Schedule a recurring task  
    scheduler::schedule_recurring("@every 5m", "payload", "task_id")?;

    // Access library data with typed structs
    let libraries: Vec<Library> = library::get_all_libraries()?;
    for lib in &libraries {
        info!("Library: {} with {} songs", lib.name, lib.total_songs);
    }

    Ok("done".to_string())
}
```

## 类型化结构体

处理领域对象的服务提供类型化的 Rust 结构体，而不是
`serde_json::Value`。这支持编译期类型检查和 IDE
自动补全。

例如，`library` 模块提供了 `Library` 结构体：

```rust
use nd_host::library::Library;

let libs: Vec<Library> = library::get_all_libraries()?;
println!("First library: {} ({} songs)", libs[0].name, libs[0].total_songs);
```

所有结构体都派生 `Debug`、`Clone`、`Serialize` 和 `Deserialize`，
便于日志记录和序列化。

## 可用的服务

| 模块        | 描述                                        |
|---------------|----------------------------------------------------|
| `artwork`     | 访问专辑和艺人封面                    |
| `cache`       | 带 TTL 的临时键值存储               |
| `kvstore`     | 持久化键值存储                       |
| `library`     | 访问音乐媒体库（专辑、艺人、曲目） |
| `scheduler`   | 安排一次性任务和定期任务              |
| `subsonicapi` | 发起 Subsonic API 调用                            |
| `websocket`   | 向客户端发送实时消息                 |

## 构建插件

Rust 插件必须编译为 WebAssembly：

```bash
cargo build --target wasm32-wasip1 --release
```

完整的插件实现请参见 [webhook-rs](../../examples/webhook-rs/) 示例。
