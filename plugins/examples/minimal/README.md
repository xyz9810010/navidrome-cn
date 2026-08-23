# Minimal Navidrome 插件示例

这是一个最小示例，演示如何使用 Go 和 Navidrome PDK 创建 Navidrome 插件。

## 构建

1. 安装 [TinyGo](https://tinygo.org/getting-started/install/)
2. 构建插件：
   ```bash
   go mod tidy
   tinygo build -o plugin.wasm -target wasip1 -buildmode=c-shared .
   zip -j minimal.ndp manifest.json plugin.wasm
   ```

或使用示例的 Makefile：
   ```bash
   cd plugins/examples
   make minimal.ndp
   ```

## 安装

将 `minimal.ndp` 复制到你的 Navidrome 插件文件夹（默认：`<data-folder>/plugins/`）。

## 配置

在你的 `navidrome.toml` 中启用插件：

```toml
[Plugins]
Enabled = true

# Add the plugin to your agents list
Agents = "lastfm,spotify,minimal"
```

## 此示例演示的内容

- 插件包结构（`.ndp` = 含 `manifest.json` + `plugin.wasm` 的 zip）
- 使用 Navidrome PDK 的 `metadata` 子包
- 实现 `ArtistBiographyProvider` 接口
- 使用 `metadata.Register()` 的注册模式

## PDK 用法

```go
import "github.com/navidrome/navidrome/plugins/pdk/go/metadata"

type myPlugin struct{}

func init() {
    metadata.Register(&myPlugin{})
}

func (p *myPlugin) GetArtistBiography(input metadata.ArtistRequest) (metadata.ArtistBiographyResponse, error) {
    return metadata.ArtistBiographyResponse{Biography: "..."}, nil
}
```

## 扩展示例

要添加更多能力，请实现 `metadata` 包中的其他提供者接口：

- `ArtistMBIDProvider` - 获取艺人的 MusicBrainz ID
- `ArtistURLProvider` - 获取艺人的外部 URL
- `SimilarArtistsProvider` - 获取相似艺人
- `ArtistImagesProvider` - 获取艺人图片
- `ArtistTopSongsProvider` - 获取艺人热门歌曲
- `AlbumInfoProvider` - 获取专辑信息
- `AlbumImagesProvider` - 获取专辑图片

完整的输入/输出格式请参阅 `/plugins/README.md` 中的文档。
