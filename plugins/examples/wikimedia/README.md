# Navidrome 的 Wikimedia 插件

一个从 Wikidata、DBpedia 和 Wikipedia 获取艺人元数据的 Navidrome 插件。

## 生成插件

此插件使用 XTP CLI 生成：

```bash
xtp plugin init \
  --schema-file plugins/schemas/metadata_agent.yaml \
  --template go \
  --path ./wikimedia \
  --name wikimedia-plugin
```

## 功能

- **艺人 URL**：使用 Wikidata（通过 MBID 或名称）、DBpedia 获取艺人的 Wikipedia URL，或回退到 Wikipedia 搜索 URL
- **艺人简介**：获取艺人 Wikipedia 页面的介绍性文本
- **艺人图片**：从 Wikidata 获取艺人图片

## 构建

### 使用 TinyGo

```bash
tinygo build -target wasip1 -buildmode=c-shared -o plugin.wasm .
zip -j wikimedia.ndp manifest.json plugin.wasm
```

### 使用 Makefile

在 `plugins/examples` 目录下：

```bash
make wikimedia.ndp
```

### 使用 XTP CLI

```bash
xtp plugin build
zip -j wikimedia.ndp manifest.json dist/plugin.wasm
```

## 安装

将 `.ndp` 文件复制到你的 Navidrome 插件文件夹：

```bash
cp wikimedia.ndp /path/to/navidrome/plugins/
```

然后在你的 `navidrome.toml` 中启用插件：

```toml
[Plugins]
Enabled = true
Folder = "/path/to/navidrome/plugins"
```

将插件添加到你的代理列表：

```toml
Agents = "lastfm,wikimedia"
```

## 使用 Extism CLI 测试

安装 [Extism CLI](https://extism.org/docs/install)：

```bash
brew install extism/tap/extism  # macOS
# or see https://extism.org/docs/install for other platforms
```

从包中提取 wasm 文件并测试：

```bash
# Extract wasm from package
unzip -p wikimedia.ndp plugin.wasm > wikimedia.wasm

# Test artist URL lookup with MBID (The Beatles)
extism call wikimedia.wasm nd_get_artist_url --wasi \
  --input '{"id":"1","name":"The Beatles","mbid":"b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d"}' \
  --allow-host "query.wikidata.org"
```

预期输出：
```json
{"url":"https://en.wikipedia.org/wiki/The_Beatles"}
```

### 测试艺人简介

```bash
extism call wikimedia.wasm nd_get_artist_biography --wasi \
  --input '{"id":"1","name":"The Beatles","mbid":"b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d"}' \
  --allow-host "query.wikidata.org" \
  --allow-host "en.wikipedia.org"
```

### 测试艺人图片

```bash
extism call wikimedia.wasm nd_get_artist_images --wasi \
  --input '{"id":"1","name":"The Beatles","mbid":"b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d"}' \
  --allow-host "query.wikidata.org"
```

预期输出：
```json
{"images":[{"url":"http://commons.wikimedia.org/wiki/Special:FilePath/Beatles%20ad%201965%20just%20the%20beatles%20crop.jpg","size":0}]}
```

## 项目结构

```
wikimedia/
├── main.go       # Plugin implementation with Wikimedia API logic
├── pdk.gen.go    # Generated types and export wrappers (DO NOT EDIT)
├── go.mod        # Go module file
├── go.sum        # Go module checksums
├── prepare.sh    # Build preparation script
└── xtp.toml      # XTP plugin configuration
```

## 使用的 API 端点

| 服务   | 端点                             | 用途                                                   |
|-----------|--------------------------------------|-----------------------------------------------------------|
| Wikidata  | `https://query.wikidata.org/sparql`  | 用于 Wikipedia URL 和图片的 SPARQL 查询              |
| DBpedia   | `https://dbpedia.org/sparql`         | Wikipedia URL 和简短简介的回退 SPARQL 查询 |
| Wikipedia | `https://en.wikipedia.org/w/api.php` | 用于文章摘要的 MediaWiki API                        |

## 已实现的函数

| 函数                  | 描述                                   |
|---------------------------|-----------------------------------------------|
| `nd_manifest`             | 返回带 HTTP 权限的插件 manifest |
| `nd_get_artist_url`       | 返回艺人的 Wikipedia URL           |
| `nd_get_artist_biography` | 返回来自 Wikipedia 的艺人简介       |
| `nd_get_artist_images`    | 返回来自 Wikidata 的艺人图片 URL       |
