# Navidrome Go 插件开发套件

此目录包含用于构建 Navidrome 插件的自动生成的 Go PDK（插件开发套件）。
该 PDK 提供与 Navidrome 交互的**宿主函数包装器**以及用于实现插件功能的
**能力接口**。

## ⚠️ 自动生成的代码

**请勿手动编辑此目录中的文件。** 它们由 `ndpgen` 工具生成。

要重新生成：

```bash
make gen
```

## 模块结构

这是一个整合的 Go 模块，包含：

- `host/` - 用于从插件调用 Navidrome 服务的宿主函数包装器
- `lifecycle/` - 插件生命周期钩子（初始化）
- `metadata/` - 用于艺人/专辑信息的元数据代理能力
- `scheduler/` - 用于定时任务的调度回调能力
- `scrobbler/` - 用于播放跟踪的 Scrobbler 能力
- `websocket/` - 用于实时消息的 WebSocket 回调能力

## 用法

在插件的 `go.mod` 中将此模块添加为依赖：

```go
require github.com/navidrome/navidrome/plugins/pdk/go v0.0.0

replace github.com/navidrome/navidrome/plugins/pdk/go => ../../pdk/go
```

然后导入你需要的包：

```go
package main

import (
    "github.com/navidrome/navidrome/plugins/pdk/go/host"
    "github.com/navidrome/navidrome/plugins/pdk/go/lifecycle"
    "github.com/navidrome/navidrome/plugins/pdk/go/scheduler"
)

func init() {
    lifecycle.Register(&myPlugin{})
    scheduler.Register(&myPlugin{})
}

type myPlugin struct{}

func (p *myPlugin) OnInit() error {
    // Initialize your plugin
    return nil
}

func (p *myPlugin) OnCallback(req scheduler.SchedulerCallbackRequest) error {
    // Handle scheduled task
    return host.WebSocketBroadcast("task-complete", req.ScheduleID)
}

func main() {}
```

## 宿主服务

`host` 包提供调用 Navidrome 宿主服务的包装器：

| 服务       | 描述                                        |
|---------------|----------------------------------------------------|
| `Artwork`     | 访问专辑和艺人封面                    |
| `Cache`       | 带 TTL 的临时键值存储               |
| `KVStore`     | 持久化键值存储                       |
| `Library`     | 访问音乐媒体库（专辑、艺人、曲目） |
| `Scheduler`   | 安排一次性任务和定期任务              |
| `SubsonicAPI` | 发起 Subsonic API 调用                            |
| `WebSocket`   | 向客户端发送实时消息                 |

### 示例：使用宿主服务

```go
package main

import (
    "github.com/navidrome/navidrome/plugins/pdk/go/host"
)

func myPluginFunction() error {
    // Use the cache service
    _, err := host.CacheSetString("my_key", "my_value", 3600)
    if err != nil {
        return err
    }

    // Schedule a recurring task  
    _, err = host.SchedulerScheduleRecurring("@every 5m", "payload", "task_id")
    if err != nil {
        return err
    }

    // Access library data with typed structs
    resp, err := host.LibraryGetAllLibraries()
    if err != nil {
        return err
    }
    for _, lib := range resp.Result {
        // Library: %s with %d songs", lib.Name, lib.TotalSongs
    }

    return nil
}
```

## 能力

能力定义了你的插件实现的功能。在 `init()` 函数中注册你的实现。

### 生命周期

提供插件初始化钩子。

```go
import "github.com/navidrome/navidrome/plugins/pdk/go/lifecycle"

func init() {
    lifecycle.Register(&myPlugin{})
}

type myPlugin struct{}

func (p *myPlugin) OnInit() error {
    // Called once when plugin is loaded
    return nil
}
```

### MetadataAgent

从外部来源提供艺人和专辑元数据。

```go
import "github.com/navidrome/navidrome/plugins/pdk/go/metadata"

func init() {
    metadata.Register(&myAgent{})
}

type myAgent struct{}

func (a *myAgent) GetArtistBiography(req metadata.ArtistRequest) (*metadata.ArtistBiographyResponse, error) {
    return &metadata.ArtistBiographyResponse{
        Biography: "Artist biography text...",
    }, nil
}

func (a *myAgent) GetArtistImages(req metadata.ArtistRequest) (*metadata.ArtistImagesResponse, error) {
    return &metadata.ArtistImagesResponse{
        Images: []metadata.ImageInfo{
            {URL: "https://example.com/image.jpg", Size: 1000},
        },
    }, nil
}
```

### Scheduler

处理来自定时任务的回调。

```go
import (
    "github.com/navidrome/navidrome/plugins/pdk/go/host"
    "github.com/navidrome/navidrome/plugins/pdk/go/scheduler"
)

func init() {
    scheduler.Register(&myScheduler{})
}

type myScheduler struct{}

func (s *myScheduler) OnCallback(req scheduler.SchedulerCallbackRequest) error {
    // Handle the scheduled task
    if req.Payload == "update-data" {
        // Do work...
        return host.WebSocketBroadcast("data-updated", "")
    }
    return nil
}
```

### Scrobbler

跟踪播放活动。

```go
import "github.com/navidrome/navidrome/plugins/pdk/go/scrobbler"

func init() {
    scrobbler.Register(&myScrobbler{})
}

type myScrobbler struct{}

func (s *myScrobbler) Scrobble(req scrobbler.ScrobbleRequest) error {
    // Track the play
    return nil
}

func (s *myScrobbler) NowPlaying(req scrobbler.NowPlayingRequest) error {
    // Update now playing status
    return nil
}
```

### WebSocket

处理传入的 WebSocket 消息。

```go
import "github.com/navidrome/navidrome/plugins/pdk/go/websocket"

func init() {
    websocket.Register(&myHandler{})
}

type myHandler struct{}

func (h *myHandler) OnWebSocketMessage(req websocket.WebSocketMessageRequest) error {
    // Handle incoming message
    return nil
}
```

## 构建插件

Go 插件必须使用 TinyGo 编译为 WebAssembly：

```bash
tinygo build -o plugin.wasm -target=wasip1 -buildmode=c-shared .
```

或使用插件示例中提供的 Makefile target：

```bash
make plugin.wasm
```

## 测试插件

该 PDK 为所有宿主服务提供 [testify/mock](https://github.com/stretchr/testify) 实现，
使你能够在非 WASM 平台（你的开发机器）上对插件代码进行单元测试。

### PDK 抽象层

`pdk` 子包提供了围绕 Extism PDK 函数的可测试包装器。不要直接导入
`github.com/extism/go-pdk`，而是导入抽象层：

```go
import "github.com/navidrome/navidrome/plugins/pdk/go/pdk"

func myFunction() {
    // Use pdk functions - same API as extism/go-pdk
    config, ok := pdk.GetConfig("my_setting")
    if ok {
        pdk.Log(pdk.LogInfo, "Setting: " + config)
    }
    
    var input MyInput
    if err := pdk.InputJSON(&input); err != nil {
        pdk.SetError(err)
        return
    }
    
    output := processInput(input)
    pdk.OutputJSON(output)
}
```

对于 WASM 构建，这些函数以零开销直接委托给 `extism/go-pdk`。
对于原生构建（测试），它们使用你可以配置的 mock：

```go
package myplugin

import (
    "testing"
    
    "github.com/navidrome/navidrome/plugins/pdk/go/pdk"
)

func TestMyFunction(t *testing.T) {
    // Reset mock state before each test
    pdk.ResetMock()
    
    // Set up expectations
    pdk.PDKMock.On("GetConfig", "my_setting").Return("test_value", true)
    pdk.PDKMock.On("Log", pdk.LogInfo, "Setting: test_value").Return()
    pdk.PDKMock.On("InputJSON", mock.Anything).Return(nil).Run(func(args mock.Arguments) {
        // Populate the input struct
        input := args.Get(0).(*MyInput)
        input.Name = "test"
    })
    pdk.PDKMock.On("OutputJSON", mock.Anything).Return(nil)
    
    // Call your function
    myFunction()
    
    // Verify expectations
    pdk.PDKMock.AssertExpectations(t)
}
```

### Mock 实例

每个宿主服务都有一个自动实例化的 mock 实例：

| 服务       | Mock 实例            |
|---------------|--------------------------|
| `Artwork`     | `host.ArtworkMock`       |
| `Cache`       | `host.CacheMock`         |
| `Config`      | `host.ConfigMock`        |
| `KVStore`     | `host.KVStoreMock`       |
| `Library`     | `host.LibraryMock`       |
| `Scheduler`   | `host.SchedulerMock`     |
| `SubsonicAPI` | `host.SubsonicAPIMock`   |
| `WebSocket`   | `host.WebSocketMock`     |

### 示例测试

```go
package myplugin

import (
    "testing"

    "github.com/navidrome/navidrome/plugins/pdk/go/host"
)

func TestMyPluginFunction(t *testing.T) {
    // Set expectations on the mock
    host.CacheMock.On("GetString", "my-key").Return("cached-value", true, nil)
    host.CacheMock.On("SetString", "new-key", "new-value", int64(3600)).Return(nil)

    // Call your plugin code that uses host.CacheGetString / host.CacheSetString
    result, err := myPluginFunction()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // Assert the result
    if result != "expected" {
        t.Errorf("unexpected result: %s", result)
    }

    // Verify all expected calls were made
    host.CacheMock.AssertExpectations(t)
}
```

### 运行测试

由于测试在你的开发机器（而非 WASM）上运行，请使用标准 Go 测试：

```bash
go test ./...
```

带 mock 的 stub 文件仅在非 WASM 构建（`//go:build !wasip1`）中编译，
因此它们不会影响你的生产 WASM 二进制文件。

### 完整示例

更多综合性示例（包括 HTTP 请求、内存处理和各种测试模式），
请参见 [pdk/example_test.go](pdk/example_test.go)。
