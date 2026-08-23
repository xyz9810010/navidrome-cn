# Cover Art Archive 插件（Python）

一个 Python 示例插件，使用 MusicBrainz Release MBID 从 [Cover Art Archive](https://coverartarchive.org/) API 获取专辑封面图片。

## 功能

- 实现 MetadataAgent 插件接口的 `nd_get_album_images` 方法
- 返回给定 release MBID 的正面封面图片
- 如果未提供 MBID 或未找到图片，返回 `not found`
- 演示 Navidrome 的 Python 插件开发

## 前置条件

- [extism-py](https://github.com/extism/python-pdk) - Python PDK 编译器
  ```bash
  curl -Ls https://raw.githubusercontent.com/extism/python-pdk/main/install.sh | bash
  ```

> **注意：** `extism-py` 需要安装 [Binaryen](https://github.com/WebAssembly/binaryen/)（`wasm-merge`、`wasm-opt`）。

## 构建

在 `plugins/examples` 目录下：

```bash
make coverartarchive-py.ndp
```

或直接构建：

```bash
extism-py plugin/__init__.py -o plugin.wasm
zip -j coverartarchive-py.ndp manifest.json plugin.wasm
```

## 安装

1. 将 `coverartarchive-py.ndp` 复制到你的 Navidrome 插件文件夹

2. 在 `navidrome.toml` 中启用插件：
   ```toml
   [Plugins]
   Enabled = true
   Folder = "/path/to/plugins"
   ```

3. 将其添加到你的代理列表：
   ```toml
   Agents = "coverartarchive-py,spotify,lastfm"
   ```

## 测试

提取 wasm 文件并测试：

```bash
unzip -p coverartarchive-py.ndp plugin.wasm > coverartarchive-py.wasm
extism call coverartarchive-py.wasm nd_get_album_images --wasi \
  --input '{"name":"Dummy","artist":"Portishead","mbid":"76df3287-6cda-33eb-8e9a-044b5e15ffdd"}' \
  --allow-host "coverartarchive.org" --allow-host "archive.org"
```

## 工作原理

1. **专辑图片请求（`nd_get_album_images`）**：接收包含 MusicBrainz Release MBID 的专辑元数据。

2. **API 查询**：从 `https://coverartarchive.org/release/{mbid}` 获取封面元数据。

3. **响应**：如果找到，返回正面封面图片 URL。

## API 参考

- [Cover Art Archive API](https://musicbrainz.org/doc/Cover_Art_Archive/API)
