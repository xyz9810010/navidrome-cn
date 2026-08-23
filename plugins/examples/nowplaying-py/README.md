# 正在播放记录器插件（Python）

一个 Python 示例插件，通过定期记录 Navidrome 当前正在播放的内容来演示 **Scheduler** 和 **SubsonicAPI** 宿主服务。

## 功能

- 使用 `scheduler_schedulerecurring` 宿主函数设置定期任务
- 使用 `subsonicapi_call` 宿主函数查询 `getNowPlaying` API
- 可通过插件配置设置 cron 表达式和用户
- 演示使用 `@extism.import_fn` 导入 Python 宿主函数

## 前置条件

- [extism-py](https://github.com/extism/python-pdk) - Python PDK 编译器
  ```bash
  curl -Ls https://raw.githubusercontent.com/extism/python-pdk/main/install.sh | bash
  ```

> **注意：** `extism-py` 需要安装 [Binaryen](https://github.com/WebAssembly/binaryen/)（`wasm-merge`、`wasm-opt`）。

## 构建

在 `plugins/examples` 目录下：

```bash
make nowplaying-py.ndp
```

或直接构建：

```bash
extism-py plugin/__init__.py -o plugin.wasm
zip -j nowplaying-py.ndp manifest.json plugin.wasm
```

## 安装

1. 将 `nowplaying-py.ndp` 复制到你的 Navidrome 插件文件夹

2. 在 `navidrome.toml` 中启用插件：
   ```toml
   [Plugins]
   Enabled = true
   Folder = "/path/to/plugins"
   ```

3. 在 UI 中配置插件（设置 → 插件 → nowplaying-py）

## 配置

| 键    | 描述                         | 默认       |
|--------|-------------------------------------|---------------|
| `cron` | 检查频率的 cron 表达式 | `*/1 * * * *` |
| `user` | 用于 SubsonicAPI 的 Navidrome 用户      | `admin`       |

## 测试

测试 manifest：

```bash
extism call nowplaying-py.wasm nd_manifest --wasi
```

## 输出

运行时，插件会记录类似以下的消息：

```
🎵 john is playing: Pink Floyd - Comfortably Numb (The Wall)
🎵 jane is playing: Radiohead - Paranoid Android (OK Computer)
```

或当没有人在播放时：

```
🎵 No users currently playing music
```

## 工作原理

1. **初始化（`nd_on_init`）**：从配置读取 cron 表达式，并使用 Scheduler 宿主服务安排一个定期任务。

2. **回调（`nd_scheduler_callback`）**：当定时任务触发时，调用 SubsonicAPI 的 `getNowPlaying` 端点并记录结果。

## 宿主函数用法（Python）

此插件演示如何从 Python 调用 Navidrome 宿主函数：

```python
import extism
import json

# Import the host function
@extism.import_fn("extism:host/user", "subsonicapi_call")
def _subsonicapi_call(offset: int) -> int:
    """Raw host function - returns memory offset."""
    ...

# Wrapper for JSON marshalling
def subsonicapi_call(uri: str) -> dict:
    request = {"uri": uri}
    request_bytes = json.dumps(request).encode('utf-8')
    request_mem = extism.memory.alloc(request_bytes)
    response_offset = _subsonicapi_call(request_mem.offset)
    response_mem = extism.memory.find(response_offset)
    response = json.loads(extism.memory.string(response_mem))
    
    if response.get("error"):
        raise Exception(response["error"])
    
    return json.loads(response.get("responseJSON", "{}"))
```
