# Navidrome 插件系统

Navidrome 支持通过 WebAssembly (Wasm) 插件来扩展功能。插件在安全的沙箱中运行，可以通过调度、缓存、任务队列、WebSocket 和 Subsonic API 访问等宿主服务，提供元数据代理、Scrobbler、歌词提供方、音频相似度等功能集成。

插件系统构建于 **[Extism](https://extism.org/)** 之上，这是一个用于构建 WebAssembly 插件的跨语言框架。你可以使用 Extism 支持的任何语言（Go、Rust、Python、TypeScript 等）编写插件，并使用其插件开发套件（PDK）。

**必备的 Extism 资源：**
- [Extism 文档](https://extism.org/docs/overview) – 核心概念与架构
- [插件开发套件（PDK）](https://extism.org/docs/concepts/pdk) – 用于编写插件的各语言专用库
- [Go PDK](https://github.com/extism/go-pdk) – 推荐配合 TinyGo 编写 Go 插件
- [Rust PDK](https://github.com/extism/rust-pdk) – 用于 Rust 插件
- [Python PDK](https://github.com/extism/python-pdk) – 实验性的 Python 支持
- [JavaScript PDK](https://github.com/extism/js-pdk) – 用于 TypeScript/JavaScript 插件

## 目录

- [快速开始](#quick-start)
- [插件基础](#plugin-basics)
- [能力](#capabilities)
  - [MetadataAgent](#metadataagent)
  - [Scrobbler](#scrobbler)
  - [Lyrics](#lyrics)
  - [SonicSimilarity](#sonicsimilarity)
  - [TaskWorker](#taskworker)
  - [Lifecycle](#lifecycle)
  - [SchedulerCallback](#schedulercallback)
  - [WebSocketCallback](#websocketcallback)
- [宿主服务](#host-services)
  - [HTTP](#http)
  - [Scheduler](#scheduler)
  - [Cache](#cache)
  - [KVStore](#kvstore)
  - [Storage](#storage)
  - [Task](#task)
  - [WebSocket](#websocket)
  - [Library](#library)
  - [Matcher](#matcher)
  - [Artwork](#artwork)
  - [SubsonicAPI](#subsonicapi)
  - [Config](#config)
  - [Users](#users)
  - [ScrobbleRetriever](#scrobbleretriever)
- [配置](#configuration)
- [命令行接口](#command-line-interface)
- [构建插件](#building-plugins)
- [示例](#examples)
- [安全性](#security)

---

## 快速开始

### 1. 创建一个最小插件

创建 `main.go`：

```go
package main

import "github.com/extism/go-pdk"

func main() {}

// Implement your capability functions here
```

创建 `manifest.json`：

```json
{
    "name": "My Plugin",
    "author": "Your Name",
    "version": "1.0.0"
}
```

### 2. 使用 TinyGo 构建并打包为 .ndp

```bash
# Compile to WebAssembly
tinygo build -o plugin.wasm -target wasip1 -buildmode=c-shared .

# Package as .ndp (zip archive)
zip -j my-plugin.ndp manifest.json plugin.wasm
```

### 3. 安装

将 `my-plugin.ndp` 复制到你的 Navidrome 插件目录，并在配置中启用插件：

```toml
[Plugins]
Enabled = true
Folder = "/path/to/plugins"
```

---

## 插件基础

### 什么是插件？

一个 Navidrome 插件是一个 `.ndp` 包文件（zip 压缩包），包含：

1. **`manifest.json`** – 插件元数据（名称、作者、版本、权限）
2. **`plugin.wasm`** – 编译后的 WebAssembly 模块，包含能力函数

### 插件命名

插件通过其**文件名**（不含 `.ndp` 扩展名）来标识，而非 manifest 中的 `name` 字段：

- `my-plugin.ndp` → 插件 ID 为 `my-plugin`
- manifest 中的 `name` 是显示在界面中的显示名称

这样用户可以通过重命名文件来运行同一插件的多个实例，并分别使用不同的配置。

### Manifest

每个插件都必须包含一个 `manifest.json` 文件。示例：

```json
{
  "name": "My Plugin",
  "author": "Author Name",
  "version": "1.0.0",
  "description": "What this plugin does",
  "website": "https://example.com",
  "config": {
    "schema": { ... },
    "uiSchema": { ... }
  },
  "permissions": {
    "http": {
      "reason": "Fetch metadata from external API",
      "requiredHosts": ["api.example.com", "*.musicbrainz.org"]
    }
  }
}
```

**必填字段：** `name`、`author`、`version`

**可选字段：** `description`、`website`、`config`、`permissions`

#### 配置定义

`config` 字段使用 [JSON Schema (draft-07)](https://json-schema.org/) 定义插件的配置结构，并可选地使用 [JSONForms](https://jsonforms.io/) UI schema 在 Navidrome Web 界面中渲染：

```json
{
  "config": {
    "schema": {
      "type": "object",
      "properties": {
        "api_key": { "type": "string", "title": "API Key" },
        "max_retries": { "type": "integer", "default": 3 }
      },
      "required": ["api_key"]
    },
    "uiSchema": {
      "api_key": { "ui:widget": "password" }
    }
  }
}
```

---

## 能力

能力定义了你的插件可以做什么。它们会根据你导出的函数自动检测。一个插件可以实现多种能力。

### MetadataAgent

提供艺人和专辑元数据。所有方法都是**可选的** —— 只实现你的数据源支持的那些方法即可。

> **返回“未找到”。** 当你对某个条目没有数据时，返回空响应且不返回错误。
> 在 Go PDK 中即 `return nil, nil`。Navidrome 会将其视为确定性的“未找到”，
> 并停止继续询问。
>
> 仅当插件自身发生故障时（例如 API 无法访问或宿主调用出错）才返回错误。
> Navidrome 会对失败的调用进行退避重试。如果插件在“没有数据”时报错，会导致
> Navidrome 对其没有数据的每个条目都进行重试。

| 函数                              | 输入                        | 输出                              | 说明                      |
|-----------------------------------|----------------------------|----------------------------------|--------------------------|
| `nd_get_artist_mbid`              | `{id, name}`               | `{mbid}`                         | 获取 MusicBrainz ID       |
| `nd_get_artist_url`               | `{id, name, mbid?}`        | `{url}`                          | 获取艺人 URL              |
| `nd_get_artist_biography`         | `{id, name, mbid?}`        | `{biography}`                    | 获取艺人简介              |
| `nd_get_similar_artists`          | `{id, name, mbid?, limit}` | `{artists: [{name, mbid?}]}`     | 获取相似艺人              |
| `nd_get_artist_images`            | `{id, name, mbid?}`        | `{images: [{url, size}]}`        | 获取艺人图片              |
| `nd_get_artist_top_songs`         | `{id, name, mbid?, count}` | `{songs: [{name, mbid?}]}`       | 获取热门歌曲              |
| `nd_get_album_info`               | `{name, artist, mbid?}`    | `{name, mbid, description, url}` | 获取专辑信息              |
| `nd_get_album_images`             | `{name, artist, mbid?}`    | `{images: [{url, size}]}`        | 获取专辑图片              |
| `nd_get_similar_songs_by_track`   | `{id, name, artist, ...}`  | `{songs: [{name, artist}]}`      | 按曲目获取相似歌曲        |
| `nd_get_similar_songs_by_album`   | `{id, name, artist, ...}`  | `{songs: [{name, artist}]}`      | 按专辑获取相似歌曲        |
| `nd_get_similar_songs_by_artist`  | `{id, name, mbid?, count}` | `{songs: [{name, artist}]}`      | 按艺人获取相似歌曲        |

要将插件用作元数据代理，请将其添加到配置中：

```toml
Agents = "lastfm,spotify,my-plugin"
```

**示例（使用 Go PDK 包）：**

```go
package main

import "github.com/navidrome/navidrome/plugins/pdk/go/metadata"

type myPlugin struct{}

func (p *myPlugin) GetArtistBiography(input metadata.ArtistRequest) (*metadata.ArtistBiographyResponse, error) {
    return &metadata.ArtistBiographyResponse{Biography: "Biography text..."}, nil
}

func init() { metadata.Register(&myPlugin{}) }
func main() {}
```

**示例（原生 wasmexport）：**

```go
//go:wasmexport nd_get_artist_biography
func ndGetArtistBiography() int32 {
    var input ArtistInput
    if err := pdk.InputJSON(&input); err != nil {
        pdk.SetError(err)
        return 1
    }
    pdk.OutputJSON(BiographyOutput{Biography: "Artist biography..."})
    return 0
}
```

### Scrobbler

与外部 scrobbling 服务集成。四个方法全部为**必填**。

| 函数                            | 输入        | 输出 | 说明                          |
|---------------------------------|--------------|--------|------------------------------|
| `nd_scrobbler_is_authorized`    | `{username}` | `bool` | 检查用户是否已授权            |
| `nd_scrobbler_now_playing`      | 见下文       | （无）| 发送正在播放                 |
| `nd_scrobbler_scrobble`         | 见下文       | （无）| 提交一次 scrobble            |
| `nd_scrobbler_playback_report`  | 见下文       | （无）| 发送播放状态报告             |

> **重要：** Scrobbler 插件需要在其 manifest 中声明 `users` 权限。Scrobble 事件只会发送给通过 Navidrome 配置分配给该插件的用户。

**Manifest 权限：**

```json
{
  "permissions": {
    "users": {
      "reason": "Receive scrobble events for users assigned to this plugin"
    }
  }
}
```

**NowPlaying/Scrobble 输入：**

```json
{
  "username": "john",
  "track": {
    "id": "track-id",
    "title": "Song Title",
    "album": "Album Name",
    "artist": "Artist Name",
    "albumArtist": "Album Artist",
    "duration": 180.5,
    "trackNumber": 1,
    "discNumber": 1,
    "mbzRecordingId": "...",
    "mbzAlbumId": "...",
    "mbzArtistId": "..."
  },
  "timestamp": 1703270400
}
```

**PlaybackReport 输入：**

与上述相同的 `username` 和 `track` 字段，外加播放状态详情：

```json
{
  "username": "john",
  "track": { ... },
  "state": "playing",
  "positionMs": 45000,
  "playbackRate": 1.0,
  "playerId": "player-id",
  "playerName": "My Client",
  "timestamp": 1703270400
}
```

`state` 为 `starting`、`playing`、`paused`、`stopped` 或 `expired` 之一。

**错误处理：**

成功时返回 `0`。失败时使用 `pdk.SetError()` 并配合以下错误类型之一：

- `scrobbler(not_authorized)` – 用户需要重新授权
- `scrobbler(retry_later)` – 临时故障，Navidrome 将重试
- `scrobbler(unrecoverable)` – 永久故障，该 scrobble 将被丢弃

```go
import "github.com/navidrome/navidrome/plugins/pdk/go/scrobbler"

return scrobbler.ScrobblerErrorNotAuthorized
return scrobbler.ScrobblerErrorRetryLater
return scrobbler.ScrobblerErrorUnrecoverable
```

### Lyrics

为曲目提供歌词。该方法为**必填**。

| 函数                | 输入                         | 输出                             | 说明     |
|-------------------------|-------------------------------|------------------------------------|-----------------|
| `nd_lyrics_get_lyrics`  | `{artistName, title, ...}`    | `{lyrics: [{lang, text}]}`         | 获取歌词      |

返回的每个歌词条目都包含一个 `lang`（语言代码）和 `text` 字段。可以针对不同语言返回多个条目。

### SonicSimilarity

基于声学特征（如嵌入向量）的音频相似度发现。两个方法均为**必填**。

| 函数                            | 输入                            | 输出                                     | 说明                                   |
|---------------------------------|----------------------------------|--------------------------------------------|---------------------------------------|
| `nd_get_sonic_similar_tracks`   | `{song, count}`                  | `{matches: [{song, similarity}]}`          | 查找声学上相似的曲目                  |
| `nd_find_sonic_path`            | `{startSong, endSong, count}`    | `{matches: [{song, similarity}]}`          | 查找两首歌曲之间的路径                 |

每个匹配项都包含一个 `song` 引用和一个 `similarity` 相似度分数（float64，0.0–1.0）。

### TaskWorker

处理来自队列的任务。如果你的插件使用 [Task](#task) 宿主服务，则该函数为**必填**：声明了 `taskqueue` 权限却不导出此函数会导致插件加载失败。

| 函数            | 输入                                       | 输出  | 说明                  |
|---------------------|---------------------------------------------|---------|----------------------|
| `nd_task_execute`   | `{queueName, taskID, payload, attempt}`     | `string`| 执行队列中的任务      |

`payload` 为原始字节（与传给 `TaskEnqueue` 的字节相同）。`attempt` 计数器从 1 开始，并在每次重试时递增。成功时返回一个字符串结果。

### Lifecycle

可选的初始化回调。在插件完全加载后调用一次。

| 函数     | 输入 | 输出     | 说明                          |
|--------------|-------|------------|--------------------------------|
| `nd_on_init` | `{}`  | `{error?}` | 插件加载完成后调用一次          |

可用于初始化连接、调度周期性任务等。错误会被记录日志，但不会阻止插件加载。

### SchedulerCallback

接收计划任务事件。如果你的插件使用 [Scheduler](#scheduler) 宿主服务，则该函数为**必填**：声明了 `scheduler` 权限却不导出此函数会导致插件加载失败。

| 函数                  | 输入                                        | 输出 | 说明                         |
|---------------------------|----------------------------------------------|--------|-----------------------------|
| `nd_scheduler_callback`   | `{scheduleId, payload, isRecurring}`         | （无）| 处理计划任务事件            |

### WebSocketCallback

接收 WebSocket 事件。导出以下任意子集即可处理来自 [WebSocket](#websocket) 宿主服务的事件。

| 函数                             | 输入                           | 说明                          |
|----------------------------------|---------------------------------|----------------------------------|
| `nd_websocket_on_text_message`   | `{connectionId, message}`       | 收到文本消息                    |
| `nd_websocket_on_binary_message` | `{connectionId, data}`          | 收到二进制消息（base64）        |
| `nd_websocket_on_error`          | `{connectionId, error}`         | 连接错误                        |
| `nd_websocket_on_close`          | `{connectionId, code, reason}`  | 连接已关闭                      |

每次回调调用都受 30 秒超时限制。

---

## 宿主服务

宿主服务让你的插件可以回调 Navidrome 以获得高级功能。每个服务（[Config](#config) 除外）都需要在 manifest 中声明相应的权限。

### Go PDK 设置

以下所有宿主服务示例均使用生成的 Go SDK。将此添加到你的 `go.mod`：

```
require github.com/navidrome/navidrome/plugins/pdk/go v0.0.0
replace github.com/navidrome/navidrome/plugins/pdk/go => ../../pdk/go
```

然后导入：

```go
import "github.com/navidrome/navidrome/plugins/pdk/go/host"
```

### HTTP

向外部服务发起 HTTP 请求。这是一个专用的宿主服务（独立于 Extism 内置的 HTTP 支持），具有超时和重定向控制等附加功能。

**Manifest 权限：**

```json
{
  "permissions": {
    "http": {
      "reason": "Fetch metadata from external API",
      "requiredHosts": ["api.example.com", "*.musicbrainz.org"]
    }
  }
}
```

**宿主函数：**

| 函数        | 参数                                                        | 返回值                          |
|-------------|----------------------------------------------------------|----------------------------------|
| `http_send` | `method, url, headers, body, timeoutMs, noFollowRedirects` | `statusCode, headers, body`    |

**限制：** 请求默认在 10 秒后超时（可通过 `timeoutMs` 按请求覆盖）。重定向最多跟随 5 次，并在每一跳重新检查允许的主机。响应体上限为 10MB。

**用法：**

```go
resp, err := host.HTTPSend(host.HTTPRequest{
    Method:  "GET",
    URL:     "https://api.example.com/data",
    Headers: map[string]string{"Authorization": "Bearer " + apiKey},
})
if resp.StatusCode == 200 {
    // Process resp.Body
}
```

### Scheduler

调度一次性或周期性的任务。你的插件必须导出 [`nd_scheduler_callback`](#schedulercallback) 函数才能接收事件。

**Manifest 权限：**

```json
{
  "permissions": {
    "scheduler": {
      "reason": "Schedule periodic metadata refresh"
    }
  }
}
```

**宿主函数：**

| 函数                          | 参数                                     | 说明                 |
|-------------------------------|------------------------------------------|-----------------------------|
| `scheduler_scheduleonetime`   | `delaySeconds, payload, scheduleId?`     | 调度一次性回调        |
| `scheduler_schedulerecurring` | `cronExpression, payload, scheduleId?`   | 调度周期性回调        |
| `scheduler_cancelschedule`    | `scheduleId`                             | 取消已调度的任务      |

**用法：**

```go
// Schedule one-time task in 60 seconds
scheduleID, err := host.SchedulerScheduleOneTime(60, "my-payload", "")

// Schedule recurring task with cron expression (every hour)
scheduleID, err := host.SchedulerScheduleRecurring("0 * * * *", "hourly-task", "")

// Cancel a task
err := host.SchedulerCancelSchedule(scheduleID)
```

### Cache

基于 TTL 的内存缓存。每个插件都有自己独立的命名空间。服务器重启时会被清空。

**Manifest 权限：**

```json
{
  "permissions": {
    "cache": {
      "reason": "Cache API responses to reduce external requests"
    }
  }
}
```

**宿主函数：**

| 函数              | 参数                    | 说明                   |
|-------------------|---------------------------|-----------------------|
| `cache_setstring` | `key, value, ttl_seconds` | 存储字符串            |
| `cache_getstring` | `key`                     | 获取字符串            |
| `cache_setint`    | `key, value, ttl_seconds` | 存储整数              |
| `cache_getint`    | `key`                     | 获取整数              |
| `cache_setfloat`  | `key, value, ttl_seconds` | 存储浮点数            |
| `cache_getfloat`  | `key`                     | 获取浮点数            |
| `cache_setbytes`  | `key, value, ttl_seconds` | 存储字节              |
| `cache_getbytes`  | `key`                     | 获取字节              |
| `cache_has`       | `key`                     | 检查键是否存在        |
| `cache_remove`    | `key`                     | 删除缓存的值          |

**TTL：** 传入 `0` 使用默认值（24 小时），或指定秒数。

**用法：**

```go
// Cache a value for 1 hour
host.CacheSetString("api-response", responseData, 3600)

// Retrieve (returns value, exists, error)
value, exists, err := host.CacheGetString("api-response")
if exists {
    // Use value
}
```

### KVStore

由 SQLite 支持的持久化键值存储。服务器重启后依然保留。每个插件在 `${DataFolder}/plugins/${pluginID}/kvstore.db` 拥有自己独立的数据库。

**Manifest 权限：**

```json
{
  "permissions": {
    "kvstore": {
      "reason": "Store OAuth tokens and plugin state",
      "maxSize": "1MB"
    }
  }
}
```

- `maxSize`：最大存储大小（例如 `"1MB"`、`"500KB"`）。默认值：1MB

**键约束：** 最大 256 字节，必须是有效的 UTF-8。

**宿主函数：**

| 函数                        | 参数                     | 说明                                 |
|-----------------------------|--------------------------|-----------------------------------|
| `kvstore_set`               | `key, value`             | 存储字节值                        |
| `kvstore_setwithttl`        | `key, value, ttlSeconds` | 存储并设置自动过期                |
| `kvstore_get`               | `key`                    | 获取字节值                        |
| `kvstore_getmany`           | `keys`                   | 一次性获取多个值                  |
| `kvstore_has`               | `key`                    | 检查键是否存在                    |
| `kvstore_list`              | `prefix`                 | 列出匹配前缀的键                  |
| `kvstore_delete`            | `key`                    | 删除值                            |
| `kvstore_deletebyprefix`    | `prefix`                 | 删除所有匹配前缀的键              |
| `kvstore_getstorageused`    | –                        | 获取当前存储使用量（字节）        |

**用法：**

```go
// Store a value (as raw bytes)
token := []byte(`{"access_token": "xyz", "refresh_token": "abc"}`)
host.KVStoreSet("oauth:spotify", token)

// Store with TTL (auto-expires after 1 hour)
host.KVStoreSetWithTTL("session:abc", sessionData, 3600)

// Retrieve a value
value, exists, err := host.KVStoreGet("oauth:spotify")
if exists {
    var tokenData map[string]string
    json.Unmarshal(value, &tokenData)
}

// Batch retrieve
results, err := host.KVStoreGetMany([]string{"key1", "key2", "key3"})

// List and delete by prefix
keys, err := host.KVStoreList("user:")
host.KVStoreDeleteByPrefix("user:")

// Check storage usage
usage, err := host.KVStoreGetStorageUsed()
fmt.Printf("Using %d bytes\n", usage)
```

### Storage

一个私有的读写目录，挂载在沙箱中的 `/storage`，由 `${DataFolder}/plugins/${pluginID}/storage` 支撑。服务器重启后依然保留。可用于存储不适合键值存储的数据：缓存、下载的文件、生成的索引。

**Manifest 权限：**

```json
{
  "permissions": {
    "storage": {
      "reason": "Cache generated playlists between restarts"
    }
  }
}
```

**宿主函数：**

| 函数                     | 参数 | 说明                          |
|--------------------------|------------|------------------------------------|
| `storage_getstoragepath` | –          | 获取该挂载点在客户机中的路径      |

**用法：**

挂载点内可使用常规的 WASI 文件系统调用，因此可直接使用 `os` 包：

```go
import (
	"os"
	"path/filepath"

	"github.com/navidrome/navidrome/plugins/pdk/go/host"
)

// The path never changes, so read it once instead of per operation
var storageDir = host.StorageGetStoragePath() // "/storage"

err := os.WriteFile(filepath.Join(storageDir, "cache.json"), data, 0600)
content, err := os.ReadFile(filepath.Join(storageDir, "cache.json"))
entries, err := os.ReadDir(storageDir)
```

> **安全：** 插件不能在挂载点内创建符号链接，`..` 或绝对路径会被拒绝。目录中已存在的符号链接仍会被跟随，因此从别处链接进来的任何内容依然可达。

> **注意：** 与 [KVStore](#kvstore) 不同，这里没有大小限制。插件卸载时该目录不会被删除。

### Task

带重试支持的后台任务队列。插件通过导出 [`nd_task_execute`](#taskworker) 能力函数来入队和处理任务。

**Manifest 权限：**

```json
{
  "permissions": {
    "taskqueue": {
      "reason": "Process audio analysis in the background",
      "maxConcurrency": 2
    }
  }
}
```

**宿主函数：**

| 函数                | 参数                                                          | 说明                          |
|---------------------|---------------------------------------------------------------|----------------------------|
| `task_createqueue`  | `name, concurrency, maxRetries, backoffMs, delayMs, retentionMs` | 创建命名任务队列            |
| `task_enqueue`      | `queueName, payload`                                          | 向队列添加任务              |
| `task_get`          | `taskID`                                                      | 获取任务状态和结果          |
| `task_cancel`       | `taskID`                                                      | 取消待处理的任务            |
| `task_clearqueue`   | `queueName`                                                   | 移除队列中的所有任务        |

任务持久化到 SQLite，因此待处理的任务在服务器重启后依然存在。队列行为：

- `concurrency` – 并行工作线程数（默认 1），受 manifest 中 `maxConcurrency` 的上限约束
- `maxRetries` – 任务失败时的重试次数（默认 0）；`backoffMs`（默认 1000）在每次重试时翻倍
- `delayMs` – 连续任务启动之间的最小延迟，用于限流（默认 0）
- `retentionMs` – 已完成任务的保留时长（默认 1 小时，最短 1 分钟，最长 1 周）
- 载荷上限为 1MB

**用法：**

```go
// Create a queue with retry configuration
host.TaskCreateQueue("analysis", host.QueueConfig{
    Concurrency: 2,
    MaxRetries:  3,
    BackoffMs:   1000,
})

// Enqueue a task
taskID, err := host.TaskEnqueue("analysis", []byte(`{"trackId": "abc"}`))

// Check task status
info, err := host.TaskGet(taskID)
fmt.Printf("Status: %s, Attempt: %d\n", info.Status, info.Attempt)
```

### WebSocket

与外部服务建立持久的 WebSocket 连接。你的插件必须导出 [WebSocketCallback](#websocketcallback) 函数才能接收事件。

**Manifest 权限：**

```json
{
  "permissions": {
    "websocket": {
      "reason": "Real-time connection to service",
      "requiredHosts": ["gateway.example.com", "*.discord.gg"]
    }
  }
}
```

**宿主函数：**

| 函数                        | 参数                      | 说明             |
|----------------------------|---------------------------------|-------------------|
| `websocket_connect`        | `url, headers?, connectionId?`  | 打开连接          |
| `websocket_sendtext`       | `connectionId, message`         | 发送文本消息      |
| `websocket_sendbinary`     | `connectionId, data`            | 发送二进制数据    |
| `websocket_closeconnection`| `connectionId, code?, reason?`  | 关闭连接          |

**用法：**

```go
connID, err := host.WebSocketConnect("wss://gateway.example.com", nil, "")
host.WebSocketSendText(connID, `{"op": 1, "d": null}`)
host.WebSocketCloseConnection(connID, 1000, "done")
```

### Library

访问音乐媒体库元数据，并可选地从媒体库目录读取文件。

**Manifest 权限：**

```json
{
  "permissions": {
    "library": {
      "reason": "Access library metadata for analysis",
      "filesystem": false
    }
  }
}
```

- `filesystem` – 设为 `true` 可启用对媒体库目录的访问，默认只读，除非管理员授予写权限（默认值：`false`）

**宿主函数：**

| 函数                       | 参数   | 返回值                     |
|----------------------------|------------|---------------------------|
| `library_getlibrary`       | `id`       | 媒体库元数据              |
| `library_getalllibraries`  | （无）     | 媒体库元数据数组          |

**媒体库元数据：**

```json
{
  "id": 1,
  "name": "My Music",
  "path": "/music/collection",
  "mountPoint": "/libraries/1",
  "lastScanAt": 1703270400,
  "totalSongs": 5000,
  "totalAlbums": 500,
  "totalArtists": 200,
  "totalSize": 50000000000,
  "totalDuration": 1500000.5
}
```

> **注意：** 仅当权限中设置了 `filesystem: true` 时，才会包含 `path` 和 `mountPoint` 字段。

**文件系统访问：**

当 `filesystem: true` 时，你的插件可以通过 WASI 文件系统 API 读取媒体库目录中的文件。每个媒体库挂载在 `/libraries/<id>`：

```go
import "os"

content, err := os.ReadFile("/libraries/1/Artist/Album/track.mp3")
entries, err := os.ReadDir("/libraries/1/Artist")
```

> **安全：** 插件不能在挂载点内创建符号链接，`..` 或绝对路径会被拒绝。媒体库中已存在的符号链接仍会被跟随，因此从别处链接进来的文件夹会按预期工作。访问默认为只读，除非管理员授予插件写权限（`navidrome plugin edit <name> --write-access`）。

**用法：**

```go
// Get a specific library
library, err := host.LibraryGetLibrary(1)
fmt.Printf("Library: %s (%d songs)\n", library.Name, library.TotalSongs)

// Get all libraries
libraries, err := host.LibraryGetAllLibraries()
for _, lib := range libraries {
    fmt.Printf("Library: %s (%d songs)\n", lib.Name, lib.TotalSongs)
}
```

### Matcher

将从外部获得的歌曲（例如来自推荐或相似度 API 的结果）匹配到本地媒体库中的曲目，复用 Navidrome 的匹配算法（ID > MBID > ISRC > 模糊标题）。

**Manifest 权限：**

```json
{
  "permissions": {
    "matcher": {
      "reason": "Resolve external recommendations to library tracks"
    },
    "library": {
      "reason": "Required by the matcher permission"
    }
  }
}
```

> **重要：** `matcher` 权限需要 `library` 权限。

**宿主函数：**

| 函数                 | 参数        | 返回值                 |
|----------------------|---------------|-------------------------|
| `matcher_matchsongs` | `songs, opts` | 匹配到的曲目数组        |

结果按输入歌曲的顺序一一对应；没有匹配项的歌曲对应的条目为空。结果仅限于插件（以及作用域内的用户，如有）可访问的媒体库。设置 `opts.username` 可以以特定用户的身份执行匹配：他们的收藏和评分会影响平局判定，返回的曲目也会带有他们的标注。用户作用域还需要 [`users`](#users) 权限，且用户需分配给该插件。

**用法：**

```go
import "github.com/navidrome/navidrome/plugins/pdk/go/types"

matches, err := host.MatcherMatchSongs([]types.SongRef{
    {Name: "Song Title", Artists: []types.ArtistRef{{Name: "Artist Name"}}},
}, host.MatchOptions{})
```

### Artwork

为 Navidrome 的封面（专辑、艺人、曲目、播放列表）生成公开 URL。

**Manifest 权限：**

```json
{
  "permissions": {
    "artwork": {
      "reason": "Get artwork URLs for display"
    }
  }
}
```

**宿主函数：**

| 函数                     | 参数      | 返回值     |
|--------------------------|------------|-------------|
| `artwork_getartisturl`   | `id, size` | 封面 URL    |
| `artwork_getalbumurl`    | `id, size` | 封面 URL    |
| `artwork_gettrackurl`    | `id, size` | 封面 URL    |
| `artwork_getplaylisturl` | `id, size` | 封面 URL    |

**用法：**

```go
url, err := host.ArtworkGetAlbumUrl("album-id", 300)
```

### SubsonicAPI

在内部调用 Navidrome 的 Subsonic API（无网络往返）。

**Manifest 权限：**

```json
{
  "permissions": {
    "subsonicapi": {
      "reason": "Access library data"
    },
    "users": {
      "reason": "Access user information for SubsonicAPI authorization"
    }
  }
}
```

> **重要：** `subsonicapi` 权限需要 `users` 权限。插件能以哪些用户的身份执行操作由 Navidrome 界面控制。

**宿主函数：**

| 函数                  | 参数   | 返回值                        |
|-----------------------|------------|--------------------------------|
| `subsonicapi_call`    | `uri`      | JSON 响应字符串                |
| `subsonicapi_callraw` | `uri`      | 内容类型 + 二进制响应          |

**用法：**

```go
// JSON response
response, err := host.SubsonicAPICall("getAlbumList2?type=random&size=10&u=username")

// Binary response (e.g., cover art, streams)
contentType, data, err := host.SubsonicAPICallRaw("getCoverArt?id=al-123&u=username")
```

### Config

访问插件的配置值。与仅能获取单个值的 `pdk.GetConfig()` 不同，此服务可以列出所有可用的配置键 —— 对于发现动态配置非常有用。

> **注意：** 此服务始终可用，无需声明 manifest 权限。

**宿主函数：**

| 函数            | 参数      | 返回值                     |
|-----------------|------------|-----------------------------|
| `config_get`    | `key`      | `value, exists`             |
| `config_getint` | `key`      | `value, exists`             |
| `config_keys`   | `prefix`   | 匹配的键名数组              |

**用法：**

```go
// Get a configuration value
value, exists := host.ConfigGet("api_key")

// Get an integer configuration value
count, exists := host.ConfigGetInt("max_retries")

// List all keys with a prefix (useful for user-specific config)
keys := host.ConfigKeys("user:")

// List all configuration keys
allKeys := host.ConfigKeys("")
```

### Users

访问插件被授权访问的用户信息。

**Manifest 权限：**

```json
{
  "permissions": {
    "users": {
      "reason": "Display user information in status updates"
    }
  }
}
```

**重要：** 在启用需要 `users` 权限的插件之前，管理员必须配置该插件可以访问哪些用户：

1. **允许所有用户** – 在插件设置中启用“允许所有用户”开关
2. **选择特定用户** – 从用户列表中选择单个用户

如果两个选项都未配置，则插件无法启用。

**宿主函数：**

| 函数             | 参数 | 返回值                 |
|------------------|------------|-----------------------|
| `users_getusers` | –          | User 对象数组          |
| `users_getadmins`| –          | 管理员 User 数组       |

**User 对象字段：**

| 字段       | 类型    | 说明                        |
|------------|---------|--------------------------------|
| `userName` | string  | 用户的唯一用户名              |
| `name`     | string  | 用户的显示名称                |
| `isAdmin`  | boolean | 该用户是否为管理员            |

> **安全：** 密码、电子邮件地址和内部 ID 等敏感字段绝不会暴露给插件。

**用法：**

```go
users, err := host.UsersGetUsers()
for _, user := range users {
    pdk.Log(pdk.LogInfo, "User: " + user.UserName + " (" + user.Name + ")")
}

admins, err := host.UsersGetAdmins()
```

### ScrobbleRetriever

获取插件被授权访问的用户的 scrobble 历史记录。每条 scrobble 只携带媒体文件 ID 和提交时间；请使用 Matcher 宿主服务将它们解析为曲目元数据。

**Manifest 权限：**

```json
{
  "permissions": {
    "scrobbleRetriever": {
      "reason": "Sync scrobble history to an external service"
    },
    "users": {
      "reason": "Access user information for scrobble retrieval"
    }
  }
}
```

> **重要：** `scrobbleRetriever` 权限需要 `users` 权限。插件能以哪些用户的身份执行操作由 Navidrome 界面控制。

**宿主函数：**

| 函数                                  | 参数                | 返回值                          |
|---------------------------------------|-----------------------|----------------------------------|
| `scrobbleretriever_getfirsttimestamp` | `username`            | 最早一条 scrobble 的 Unix 时间戳，或 null |
| `scrobbleretriever_getlasttimestamp`  | `username`            | 最新一条 scrobble 的 Unix 时间戳，或 null |
| `scrobbleretriever_getscrobbles`      | `username`, `options` | 一页 scrobble 及下一页的选项             |
| `scrobbleretriever_getscrobblecount`  | `username`, `options` | 该范围内的 scrobble 数量                 |

**ScrobbleOptions 字段**（均为可选）：

| 字段             | 类型    | 说明                                                  |
|-----------------|---------|----------------------------------------------------------|
| `fromTimestamp` | int64   | 范围起点（含）。默认值：第一条 scrobble                  |
| `toTimestamp`   | int64   | 范围终点（含）。默认值：最后一条 scrobble                |
| `descending`    | boolean | 从最新开始。默认值：从最早开始                          |
| `maxItems`      | int     | 每页大小，上限为 5000（默认值）                          |
| `offset`        | int     | 由宿主管理用于分页。切勿手动设置                        |

**ScrobbleRef 字段：**

| 字段              | 类型   | 说明                                              |
|------------------|--------|------------------------------------------------|
| `id`             | int64  | Scrobble ID，即使重复提交也保持唯一             |
| `mediaFileId`    | string | 被 scrobble 的媒体文件                          |
| `submissionTime` | int64  | 提交的 Unix 时间戳                              |

**用法：**

`GetScrobbles` 返回一页数据以及获取下一页所需的选项。将它们原样传回并重复，直到它们为 nil：

```go
opts := host.ScrobbleOptions{MaxItems: 500}
var all []host.ScrobbleRef
for {
    page, next, err := host.ScrobbleRetrieverGetScrobbles("username", opts)
    if err != nil {
        return err
    }
    all = append(all, page...)
    if next == nil {
        break // no more scrobbles
    }
    opts = *next
}

// Range boundaries and counts
first, err := host.ScrobbleRetrieverGetFirstTimestamp("username") // nil if no scrobbles
count, err := host.ScrobbleRetrieverGetScrobbleCount("username", host.ScrobbleCountOptions{
    FromTimestamp: first,
})
```

> **注意：** 返回的 `next` 选项带有调整后的 `fromTimestamp`/`toTimestamp`，所以如果你仍需使用原来的范围，请保留一份原始选项的副本。

---

## 配置

### 服务器配置

在 `navidrome.toml` 中启用插件：

```toml
[Plugins]
Enabled = true
Folder = "/path/to/plugins"   # Default: DataFolder/plugins
AutoReload = true             # Auto-reload on file changes (dev mode)
LogLevel = "debug"            # Plugin-specific log level
CacheSize = "200MB"           # Compilation cache size limit
```

### 插件配置

插件配置通过 Navidrome Web 界面管理。导航到“插件”页面，选择一个插件，并以键值对的形式编辑其配置。

在插件中访问配置值：

```go
apiKey, ok := pdk.GetConfig("api_key")
if !ok {
    pdk.SetErrorString("api_key configuration is required")
    return 1
}
```

如需更高级的访问（列出键、整数值），请使用 [Config](#config) 宿主服务。

---

## 命令行接口

使用 `navidrome plugin` 从命令行管理插件：

| 命令                                                    | 说明                                                        |
|--------------------------------------------------------|------------------------------------------------------------|
| `navidrome plugin list [-f table|csv|json]`          | 列出已安装的插件                                            |
| `navidrome plugin info <id|file.ndp> [-f text|json]` | 显示已安装插件或 `.ndp` 包的详细信息                        |
| `navidrome plugin validate <id|file.ndp>`             | 校验已安装插件或 `.ndp` 包的 manifest                        |
| `navidrome plugin enable <id>`                         | 启用插件                                                    |
| `navidrome plugin disable <id>`                        | 禁用插件                                                    |
| `navidrome plugin edit <id>`                           | 更新插件的配置和/或权限                                     |
| `navidrome plugin rescan`                              | 重新发现插件目录中的插件                                    |

**`plugin edit` 标志：**

- `--config <json>` / `--config-file <path>` – 设置插件配置（`-` 从 stdin 读取）
- `--users <list>` / `--all-users` – 插件可访问的用户名（逗号分隔或 JSON 数组），或所有用户
- `--libraries <list>` / `--all-libraries` – 插件可访问的媒体库 ID（逗号分隔或 JSON 数组），或所有媒体库
- `--write-access` / `--no-write-access` – 允许或拒绝插件对媒体库的写访问

---

## 构建插件

### 支持的语言

插件可以用 Extism 支持的任何语言编写。我们推荐：

- **Go** – 配合 [TinyGo](https://tinygo.org/) 和 [Go PDK](https://github.com/extism/go-pdk) 获得最佳整体体验。语法熟悉，标准库支持出色。
- **Rust** – 最适合性能关键的插件。二进制最小，类型安全出色。使用 [Rust PDK](https://github.com/extism/rust-pdk)。
- **Python** – 最适合快速原型开发。通过 [extism-py](https://github.com/extism/python-pdk) 提供实验性支持。请注意，与编译型语言相比存在一些限制。
- **TypeScript** – 通过 [extism-js](https://github.com/extism/js-pdk) 提供实验性支持。

### 使用 TinyGo 的 Go（推荐）

```bash
# Install TinyGo: https://tinygo.org/getting-started/install/

# Build WebAssembly module
tinygo build -o plugin.wasm -target wasip1 -buildmode=c-shared .

# Package as .ndp
zip -j my-plugin.ndp manifest.json plugin.wasm
```

#### 使用 Go PDK 包

Navidrome 在 `plugins/pdk/go/` 中为每种能力和宿主服务提供了类型安全的 Go 包。无需使用 `//go:wasmexport` 手动导出函数，改用 `Register()` 模式：

```go
package main

import "github.com/navidrome/navidrome/plugins/pdk/go/metadata"

type myPlugin struct{}

func (p *myPlugin) GetArtistBiography(input metadata.ArtistRequest) (*metadata.ArtistBiographyResponse, error) {
    return &metadata.ArtistBiographyResponse{Biography: "Biography text..."}, nil
}

func init() { metadata.Register(&myPlugin{}) }
func main() {}
```

添加到你的 `go.mod`：

```
require github.com/navidrome/navidrome v0.0.0
replace github.com/navidrome/navidrome => ../../..
```

**可用的能力包：**

| 包                 | 导入路径                          | 说明                                  |
|-------------------|--------------------------------------|--------------------------------------|
| `metadata`        | `plugins/pdk/go/metadata`            | 艺人/专辑元数据提供方                 |
| `scrobbler`       | `plugins/pdk/go/scrobbler`           | Scrobbling 服务                       |
| `lyrics`          | `plugins/pdk/go/lyrics`              | 歌词提供方                            |
| `sonicsimilarity` | `plugins/pdk/go/sonicsimilarity`     | 音频相似度发现                        |
| `taskworker`      | `plugins/pdk/go/taskworker`          | 后台任务处理                          |
| `lifecycle`       | `plugins/pdk/go/lifecycle`           | 插件初始化                            |
| `scheduler`       | `plugins/pdk/go/scheduler`           | 计划任务回调                          |
| `websocket`       | `plugins/pdk/go/websocket`           | WebSocket 事件处理器                  |
| `host`            | `plugins/pdk/go/host`                | 宿主服务 SDK（所有服务）              |
| `types`           | `plugins/pdk/go/types`               | 共享数据类型（曲目、艺人、歌曲引用）  |
| `pdk`             | `plugins/pdk/go/pdk`                 | 底层辅助工具（封装 extism/go-pdk：配置、日志、内存） |

完整的使用模式请参见 [examples/](examples/) 中的示例插件。

### Rust

```bash
# Build WebAssembly module
cargo build --release --target wasm32-wasip1

# Package as .ndp
zip -j my-plugin.ndp manifest.json target/wasm32-wasip1/release/plugin.wasm
```

#### 使用 Rust PDK

```toml
# Cargo.toml
[dependencies]
nd-pdk = { path = "../../pdk/rust/nd-pdk" }
extism-pdk = "1.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

**使用 trait 和宏实现能力：**

```rust
use nd_pdk::scrobbler::{Scrobbler, IsAuthorizedRequest, Error};
use nd_pdk::register_scrobbler;

#[derive(Default)]
struct MyPlugin;

impl Scrobbler for MyPlugin {
    fn is_authorized(&self, req: IsAuthorizedRequest) -> Result<bool, Error> {
        Ok(true)
    }
    fn now_playing(&self, req: NowPlayingRequest) -> Result<(), Error> { Ok(()) }
    fn scrobble(&self, req: ScrobbleRequest) -> Result<(), Error> { Ok(()) }
}

register_scrobbler!(MyPlugin);  // Generates all WASM exports
```

**使用宿主服务：**

```rust
use nd_pdk::host::{cache, scheduler, library};

cache::set_string("my_key", "my_value", 3600)?;
scheduler::schedule_recurring("@every 5m", "payload", "task_id")?;
let libs = library::get_all_libraries()?;
```

详细文档请参见 [pdk/rust/README.md](pdk/rust/README.md)。

### Python（使用 extism-py）

```bash
# Build WebAssembly module (requires extism-py installed)
extism-py plugin.wasm -o plugin.wasm *.py

# Package as .ndp
zip -j my-plugin.ndp manifest.json plugin.wasm
```

### 使用 XTP CLI（脚手架）

根据 schema 引导创建新插件：

```bash
# Install XTP CLI: https://docs.xtp.dylibso.com/docs/cli

# Create a metadata agent plugin
xtp plugin init \
  --schema-file plugins/capabilities/metadata_agent.yaml \
  --template go \
  --path ./my-agent \
  --name my-agent

# Build and package
cd my-agent && xtp plugin build
zip -j my-agent.ndp manifest.json dist/plugin.wasm
```

可用的 schema 和脚手架示例请参见 [capabilities/README.md](capabilities/README.md)。

---

## 示例

完整可用的插件请参见 [examples/](examples/)：

| 插件                                                             | 语言       | 能力                                      | 宿主服务                                          | 说明                        |
|----------------------------------------------------------------|----------------|-----------------------------------------------|--------------------------------------------|--------------------------------|
| [minimal](examples/minimal/)                                   | Go             | MetadataAgent | –                                          | 基本结构示例                 |
| [wikimedia](examples/wikimedia/)                               | Go             | MetadataAgent | HTTP                                       | Wikidata/Wikipedia 集成      |
| [coverartarchive-py](examples/coverartarchive-py/)             | Python         | MetadataAgent | HTTP                                       | Cover Art Archive            |
| [webhook-rs](examples/webhook-rs/)                             | Rust           | Scrobbler                                        | HTTP                                               | HTTP webhook                |
| [nowplaying-py](examples/nowplaying-py/)                       | Python         | Lifecycle, SchedulerCallback                     | Scheduler, SubsonicAPI                             | 周期性正在播放记录器        |
| [library-inspector-rs](examples/library-inspector-rs/)         | Rust           | Lifecycle, SchedulerCallback                     | Library, Scheduler                                 | 周期性媒体库统计日志        |
| [crypto-ticker](examples/crypto-ticker/)                       | Go             | Lifecycle, SchedulerCallback, WebSocketCallback  | WebSocket, Scheduler                               | 实时加密货币价格演示        |
| [discord-rich-presence-rs](examples/discord-rich-presence-rs/) | Rust           | Scrobbler, SchedulerCallback, WebSocketCallback  | HTTP, WebSocket, Cache, Scheduler, Artwork, Config | Discord 集成                |

---

## 安全性

插件在由 [Extism](https://extism.org/) 和 [Wazero](https://wazero.io/) 运行时提供的安全 WebAssembly 沙箱中运行：

1. **主机白名单** – 仅显式允许的主机可通过 HTTP/WebSocket 访问
2. **受限的文件系统** – 插件不能在挂载点内创建符号链接，`..` 或绝对路径会被拒绝，但已存在的符号链接仍会被跟随。媒体库访问需要 `library.filesystem` 权限，且默认为只读，除非管理员授予写权限；`storage` 权限授予一个插件私有的读写目录
3. **禁止网络监听** – 插件不能绑定端口
4. **配置隔离** – 插件只会收到自己的配置段
5. **内存限制** – 由 WebAssembly 运行时控制
6. **用户作用域授权** – 具有 `subsonicapi`、`scrobbleRetriever` 或 `scrobbler` 能力的插件，只能访问/接收通过 Navidrome 配置分配给它们的用户的事件
7. **Users 权限** – 请求用户访问的插件必须显式配置允许的用户；敏感数据（密码、电子邮件）绝不会暴露

---

## 运行时管理

### 自动重载

当 `AutoReload = true` 时，Navidrome 会监视插件目录，并自动检测 `.ndp` 文件的新增、修改或删除。当插件文件发生变化时，该插件会被禁用，并从压缩包中重新读取其元数据。

如果 `AutoReload` 被禁用，则需要重启 Navidrome 才能生效插件变更。

### 启用/禁用插件

插件可以通过 Navidrome 界面或 [`navidrome plugin` CLI](#command-line-interface) 启用/禁用。插件状态持久化在数据库中。

### 重要说明

- **进行中的请求** – 重新加载时，现有请求会在新版本接管前完成
- **配置变更** – 在界面中对插件配置的更改会立即生效
- **缓存持久化** – 插件卸载时，内存缓存会被清空
