# Jellyfin API

本软件包在 Navidrome 现有的媒体库、用户、播放列表和 scrobbling（听歌记录上报）基础设施之上，实现了 [Jellyfin](https://jellyfin.org/) REST API 的一个子集。它让兼容 Jellyfin 的客户端（例如 [Finamp](https://github.com/jmshrv/finamp)、[jftui](https://github.com/dylanmtaylor/jftui)）无需真正的 Jellyfin 服务器即可浏览和流式播放 Navidrome 媒体库。

它**不是**完整的 Jellyfin 服务器实现：只实现了浏览音乐媒体库、流式播放音频、管理歌曲/专辑/艺人/播放列表的收藏与评分、上报播放，以及管理播放列表所需的端点。视频、直播电视、插件以及 Jellyfin 的管理/仪表盘 API 均不在范围内。

## 启用

Jellyfin API 默认处于禁用状态。可通过 `navidrome.toml` 启用：

```toml
[Jellyfin]
Enabled = true
# Optional: override the server name reported to clients (defaults to "Navidrome <version>")
ServerName = "My Music Server"
# Optional: usernames to show in the client login user-picker (default: none). See "Public user list".
ExposedPublicUsers = "alice, bob"
# Optional: max collection responses streaming at once (default: half the DB connection pool,
# min 2). Each streaming response holds a DB connection for its whole duration; excess requests
# queue rather than fail.
MaxConcurrentStreams = 4
```

或通过环境变量：

```bash
ND_JELLYFIN_ENABLED=true
ND_JELLYFIN_SERVERNAME="My Music Server"
ND_JELLYFIN_EXPOSEDPUBLICUSERS="alice,bob"
```

启用后，API 挂载于：

```
http://<host>:<port>/jellyfin
```

下面的所有路径都相对于该基础 URL（例如 `System/Info/Public` 意味着 `http://localhost:4533/jellyfin/System/Info/Public`）。路由匹配是**不区分大小写**的，因为真正的 Jellyfin 客户端（以及 `jellyfin-apiclient-python`）会发送混合大小写的路径。

## 身份认证

Jellyfin 客户端使用用户的 Navidrome 用户名/密码，通过 `POST /Users/AuthenticateByName` 进行认证，并获得一个 `AccessToken`（一个 Navidrome JWT）。此后，该令牌会在每个后续请求中作为 `X-Emby-Token` 请求头发送（或嵌入在 `X-Emby-Authorization`/`Authorization` 请求头的 `Token="..."` 字段中，或作为 `api_key`/`ApiKey` 查询参数——所有这些形式都被接受，与不同客户端的做法相匹配）。

`POST /Users/AuthenticateByName` 按 IP 使用与原生 `/auth/login` 相同的限流器（`AuthRequestLimit`/`AuthWindowLength`）进行限流，因为它是一个未认证的暴力破解攻击面。

访问令牌不会过期，与真正的 Jellyfin 一致。它们会因密码更改而被撤销，密码更改会推进用户的令牌纪元（token epoch）。

### 公开用户列表（登录选择器）

`GET /Users/Public` 允许客户端渲染一个登录用户选择器（点选一个用户，然后只需输入密码），而非空白的用户名字段。它是**未认证**的，因此默认情况下不会公开**任何**用户。将 `Jellyfin.ExposedPublicUsers` 设置为逗号分隔的用户名列表以对外公布：

```toml
[Jellyfin]
ExposedPublicUsers = "alice, bob"
```

只会列出指定的用户（绝不会列出整个用户表），并按请求实时解析；配置中不存在的名称会被跳过，并以 `Warn` 级别记录日志。每个条目都是一个最小化的 DTO（`Name`、`Id`），不带 `Policy`/`Configuration`，因此管理员身份不会泄露给未认证的调用方，也没有头像（省略 `PrimaryImageTag`——Navidrome 没有针对单个用户的个人资料图片）。

## 播放器与会话

每个已认证的请求都会将调用设备注册（或刷新）为一个 Navidrome 播放器，与 Subsonic 的 `getPlayer` 类似——因此 Jellyfin 客户端只要发出任何已认证的调用，就会出现在播放器列表中（并且 scrobbling 也有一个播放器），而不必等到它上报播放。播放器 id 是来自 `X-Emby-Authorization` 的设备 id（`DeviceId="..."`）；播放器名称是 `Client [Device]`。这些字段值会进行 URL 解码，因为有些客户端会对它们进行百分号编码（Jellify 发送 `Device="Pixel%208%20Pro"`，Finamp 则发送原始值）。不带客户端/设备信息的请求（例如 `GET socket` 握手，它仅通过 `?api_key=` 进行认证）会被跳过，从而不会创建无名播放器。

## 多媒体库行为

Jellyfin 没有像 Navidrome 那样的多音乐媒体库原生概念，因此当前用户可访问的每个 Navidrome 媒体库都会作为独立的顶层 Jellyfin "CollectionFolder" 视图（`GET /UserViews`）公开，而不是将所有媒体库合并到单一视图中。浏览（`/Items`）、艺人以及“最新”列表都限定在已认证用户可访问的媒体库范围内；用户无法访问的媒体库（或其中的条目）返回 `404` 而绝不会是 `403`，因此 id 不能被用作存在性探测手段。

### 浏览过滤条件

`GET /Items` 接受客户端用于构建界面的过滤参数：`ParentId`（用于限定范围的媒体库视图 id、浏览某艺人专辑时的艺人 id，或浏览某专辑曲目时的专辑 id）；`AlbumArtistIds`/`ArtistIds`/`contributingArtistIds`（某艺人的专辑或曲目——Finamp 的艺人界面会*连同* `ParentId=<libraryId>` 一起发送这些参数）；`AlbumIds`（某专辑的曲目——Feishin 以这种方式而非 `ParentId` 获取它们）；`GenreIds`（某流派的专辑或曲目——Finamp 的流派界面以相同方式发送它；`/Artists/AlbumArtists` 和 `MusicArtist` 查询也接受它，以匹配该流派专辑中署名过的艺人）；`SearchTerm`；`Filters`（`IsFavorite`、`IsFavoriteOrLikes`、`IsPlayed`、`IsUnplayed`）以及它也可以被表达为的独立 `isFavorite`/`isPlayed` 布尔值——当两者都发送时以 `Filters` 为准，与 Jellyfin 一致；`Likes`、`Dislikes`、`IsFolder`、`IsNotFolder` 和 `IsResumable` 没有对应的 Navidrome 等价物，会被忽略；`SortBy`/`SortOrder`（每个被识别的键都会按顺序应用，因此次要键可用来打破并列；未识别的键会被跳过，而 `Random` 总是单独排序）；`StartIndex`/`Limit`；以及 `Ids`（按 id 批量获取）。带媒体库 `ParentId` 且 `Recursive=false` 时只返回直接子项（不含曲目——没有任何曲目是媒体库的直接子项）。

## 已实现的端点

| 区域 | 端点 |
|---|---|
| 握手 / 系统 | `GET System/Info/Public`, `GET System/Info` (需认证), `GET`/`POST System/Ping`, `GET System/Endpoint` (需认证), `GET QuickConnect/Enabled` |
| 认证 | `POST Users/AuthenticateByName`, `GET Users/Public` |
| 用户 | `GET UserViews`, `GET Users/{userId}/Views`, `GET Users/Me`, `GET Users/{userId}` |
| 浏览 | `GET Items`, `GET Users/{userId}/Items`, `GET Items/{itemId}`, `GET Users/{userId}/Items/{itemId}`, `GET Users/{userId}/Items/Latest`, `DELETE Items/{itemId}` (仅播放列表) |
| 艺人 / 流派 | `GET Artists`, `GET Artists/AlbumArtists`, `GET Genres`, `GET MusicGenres` |
| 相似 / 混音 | `GET Artists/{itemId}/Similar`, `GET Items/{itemId}/Similar`, `GET Items/{itemId}/InstantMix` |
| 图片 | `GET Items/{itemId}/Images/{type}[/{index}]` (公开), `POST`/`DELETE Items/{itemId}/Images/{type}` (播放列表封面, 需认证) |
| 歌曲、专辑、艺人和播放列表的收藏 / 评分 | `POST`/`DELETE UserFavoriteItems/{itemId}`, `POST`/`DELETE Users/{userId}/FavoriteItems/{itemId}`, `POST`/`DELETE Users/{userId}/Items/{itemId}/Rating`, `GET UserItems/{itemId}/UserData`, `GET Users/{userId}/Items/{itemId}/UserData` |
| 流式播放 | `GET Audio/{itemId}/stream[.{container}]`, `GET Audio/{itemId}/universal`, `GET Audio/{itemId}/main.m3u8`, `GET Items/{itemId}/File`, `GET Items/{itemId}/Download`, `GET`/`POST Items/{itemId}/PlaybackInfo` |
| 歌词 | `GET Audio/{itemId}/Lyrics` |
| 播放上报 | `POST Sessions/Playing`, `POST Sessions/Playing/Progress`, `POST Sessions/Playing/Stopped`, `POST Sessions/Capabilities[/Full]` |
| 播放列表 | `POST Playlists`, `GET Playlists/{playlistId}`, `POST Playlists/{playlistId}` (重命名 / 可见性 / 替换曲目), `GET Playlists/{playlistId}/Items`, `POST`/`DELETE Playlists/{playlistId}/Items`, `GET Playlists/{playlistId}/Users[/{userId}]` |
| 实时 | `GET socket` (WebSocket; 防止 Finamp 等客户端陷入 404 循环重连) |
| AudioMuse-AI (见下文) | `GET AudioMuseAI/info`, `GET AudioMuseAI/health`, `GET AudioMuseAI/similar_tracks`, `GET AudioMuseAI/find_path` |

任何其他路径都会返回带有 `{}` JSON 主体的 `404`，并在服务器端以 `Debug` 级别记录为 `Jellyfin API: unhandled route`（方法 + 路径）。如果你正在测试的客户端需要上表中没有的端点，请检查服务器日志中的这些行，以确切了解它正在请求什么。

## 播放列表管理

播放列表是该 API 的主要可写界面：

- **容器展开。** 在创建（`POST Playlists`）、添加（`POST Playlists/{id}/Items`）或替换（`POST Playlists/{id}`）播放列表时，`Ids` 中可能包含**容器**——专辑、艺人或播放列表 id——而不仅仅是歌曲 id。每个容器都会在写入前按顺序展开为其曲目，与 Jellyfin 客户端填充这些列表的方式一致。裸歌曲 id 会直接通过。
- **Id 列表编码。** `POST`/`DELETE Playlists/{id}/Items` 接受客户端两种拼写 id 列表的方式：重复参数（`ids=X&ids=Y`，即 Jellify 的 `@jellyfin/sdk` 序列化数组的方式）和单个逗号分隔值（`ids=X,Y`，Finamp）。如果只读取第一个值，就只会添加展开专辑中的一首曲目。
- **更新**（`POST Playlists/{id}`）：当存在 `Ids` 时，曲目列表会被**替换**（Finamp 用它来重新排序）——显式的空 `Ids`（`[]`）会**清空**播放列表，而省略 `Ids` 则保持曲目不变，只更新 `Name`/`IsPublic`。`IsPublic` 映射到 Navidrome 的 `Public` 标志，在 `GET Playlists/{id}` 上以 `OpenAccess` 呈现给客户端。
- **封面**：`POST Items/{id}/Images/Primary` 上传播放列表封面（原始或 base64 主体，通过魔数检测 JPEG/PNG/WebP/GIF，扩展名来自 `Content-Type`）；`DELETE` 则移除它。只有播放列表可通过此 API 写入——专辑/艺人封面来自标签/sidecar 扫描，因此非播放列表 id 返回 `501`。上传遵循与原生端点相同的限制：受 `MaxImageUploadSize` 约束，且非管理员需要 `EnableArtworkUpload`。
- **`PlaylistItemId`**：`GET Playlists/{id}/Items` 会为每个条目标注 `PlaylistItemId`（播放列表-曲目行 id，与歌曲 id 不同），以便客户端可以通过 `DELETE Playlists/{id}/Items?EntryIds=...` 回传它，以移除同一播放列表中出现多次的某首歌的某一次出现。

所有权由 `core/playlists` 强制执行：非所有者编辑/删除播放列表时，如果播放列表对其可见（公开）则得到 `403`，如果不可见（私有）则得到 `404`——该 API 绝不会泄露他人的私有播放列表的存在。

## 图片

`GET Items/{itemId}/Images/{type}` 路由故意设为**公开**（封面并不敏感，与 Jellyfin 宽松的图片处理一致），因此它不携带已认证用户。因此，封面在**提升权限的管理员上下文**下解析——与 `core/artwork` 缓存预热器使用的方法相同——这样像私有播放列表这类按用户限定的条目仍能解析出其封面，而不是回退到占位图。专辑、艺人、媒体文件和播放列表 id 都会被解析为它们对应的 Navidrome `ArtworkID`。

## 条目 id 是 GUID

Jellyfin 的条目 id 是 GUID，序列化为 32 个小写十六进制字符且不带连字符（`Guid.ToString("N")`）。Navidrome 的 id 是 128 位值的规范 22 字符 base62 编码，因此 `dto.EncodeID`/`dto.DecodeID` 通过 `model/id` 在两者之间进行映射——除了约 2⁻⁹⁶ 的概率（某个 id 的 128 位值落入下方保留空间）外是无损的（前 12 字节全为零）。

有三个发出的 id 不是 128 位值：整数媒体库 id、合成的播放列表文件夹，以及 `PlaylistItemId`（一个播放列表*条目位置*——`playlist_tracks.id` 是一个 `integer` 列）。它们使用保留的 GUID 空间——12 个零字节、一个非零的种类标签、一个 24 位负载——因此媒体库 `1` 就是 `00000000000000000000000001000001`。该标签永远不会为零，因为 Jellyfin 会把全零 GUID 序列化为 `null`。

`DecodeID` 接受带连字符和大写的 GUID（Jellyfin 的 `Guid.Parse` 也是这样做的），并对任何格式错误的内容——包括 ""——返回 `ok=false`，处理程序会将其表现为 404。

出于这个原因，线上格式必须保持 GUID 形状：Finamp 的已保存队列持久化会将每个条目 id 位打包成恰好 16 字节（`lib/models/finamp_models.dart` 中的 `packIds()`），因此 32 位十六进制 GUID 能精确往返，而更长的 id 会被静默截断。

## 流式播放与转码

流式播放端点复用与 Subsonic `/stream` 端点相同的转码决策流水线：

- **`GET Audio/{id}/stream[.{container}]` / `universal`**——目标格式来自 `.{container}` 路径后缀、`container` 参数，或（当两者都不存在时）`audioCodec`。`audioBitRate`/`maxStreamingBitrate` 以比特/秒为单位，遵循 Jellyfin 惯例。`static=true` 强制直接播放（原始），绝不转码。
- **`GET Items/{id}/File` / `Download`**——始终是原始文件字节，与真正的 Jellyfin 一致。当 Finamp 的转码设置关闭时，它通过 `File` 播放，因此无法解码的格式（例如 DSF）在这条路径上无法在服务器端得到补救。
- **`GET Audio/{id}/main.m3u8`**——当 Finamp 的转码设置开启时，它通过该端点播放。它被实现为单段 HLS VOD 播放列表，其唯一一个分段就是上面的渐进式转码端点，因此整条流水线（决策、缓存、强制转码）都被复用。分段的编解码器遵循 `audioCodec`，但仅限于 HLS 打包音频所能承载的格式（`aac`、`mp3`）；其他任何格式都会回退到 `aac`。与 Subsonic 转码流一样，跳转播放会从头重新读取。
- **服务器强制转码。** 在已注册播放器上配置的格式/比特率（设置 → 播放器）会应用于 `stream`、`universal` 和 `main.m3u8`——覆盖语义与 Subsonic 相同。`File`/`Download` 保持原始。对于 HLS 客户端，请强制使用 `aac` 或 `mp3`；其他格式会被通告并提供服务，但打包音频播放器无法解码它们。

## 兼容 AudioMuse-AI 的端点

针对集成了 [AudioMuse-AI](https://github.com/NeptuneHub/audiomuse-ai-plugin) 的 Jellyfin 前端的兼容层——例如 [Symfonium](https://symfonium.app/) 可以在以 Jellyfin 客户端连接时，使用这些端点进行声学混音（sonic mixes）。它由 Navidrome 的 `core/sonic` 引擎（`SonicSimilarity` 插件能力）原生支持——不涉及任何外部的 AudioMuse-AI 后端或代理。这些端点以是否加载了 `SonicSimilarity` 插件为门槛，与 Subsonic 的 `sonicSimilarity` OpenSubsonic 扩展一样。

- `GET /AudioMuseAI/info`——返回 `{"Version": <navidrome version>, "AvailableEndpoints": [...]}`（200）。`AvailableEndpoints` 仅在加载了提供者时才列出下面的端点；否则为空。
- `GET /AudioMuseAI/health`——存活探针：加载了提供者时返回 200 及空主体，否则返回 404。
- `GET /AudioMuseAI/similar_tracks?item_id=<id>&n=10&eliminate_duplicates=true`——未加载提供者时返回 404；否则返回一个 `{author, distance, item_id, title}` 的 JSON 数组（200；没有匹配项或没有 `item_id` 时为 `[]`）。`eliminate_duplicates`（默认 true）将结果限制为每个艺人一首曲目。
- `GET /AudioMuseAI/find_path?start_song_id=<id>&end_song_id=<id>&max_steps=25`——未加载提供者时返回 404；否则返回 `{"path": [{author, item_id, title, tempo?}], "total_distance": <float>}`（200），当任一 id 缺失时返回 400 及 `start_song_id and end_song_id are required.`。

`item_id`/`start_song_id`/`end_song_id` 是 Navidrome 交给 Jellyfin 客户端的 GUID 形式 id。`tempo` 在已知时来自曲目的 BPM；更丰富的 AudioMuse 每曲目特性（`energy`、`key`、`mood_vector`、`scale`、`other_features`）不会被提供。在多媒体库设置中，`find_path` 的 `path` 和 `total_distance` 只反映通过调用方可访问媒体库中曲目的跳转，因为通过不可访问媒体库的跳转会被从结果中过滤掉。

## curl 操作示例

这模拟了真实客户端（例如 Finamp）所遵循的顺序：握手、登录、浏览媒体库层级、获取播放信息、流式播放、收藏、上报播放以及管理播放列表。

```bash
BASE=http://localhost:4533/jellyfin

# 1. Handshake (no auth required)
curl -s "$BASE/System/Info/Public" | jq .

# 2. Login - capture the AccessToken
TOKEN=$(curl -s -X POST "$BASE/Users/AuthenticateByName" \
  -H 'Content-Type: application/json' \
  -d '{"Username":"admin","Pw":"password"}' | jq -r .AccessToken)

AUTH=(-H "X-Emby-Token: $TOKEN")

# 3. List the user's views (one per accessible library)
curl -s "${AUTH[@]}" "$BASE/UserViews" | jq .

# 4. Browse artists
curl -s "${AUTH[@]}" "$BASE/Items?IncludeItemTypes=MusicArtist" | jq .
ARTIST_ID=$(curl -s "${AUTH[@]}" "$BASE/Items?IncludeItemTypes=MusicArtist&Limit=1" | jq -r '.Items[0].Id')

# 5. Drill into that artist's albums (ParentId with no IncludeItemTypes defaults to MusicAlbum)
ALBUM_ID=$(curl -s "${AUTH[@]}" "$BASE/Items?ParentId=$ARTIST_ID" | jq -r '.Items[0].Id')

# 6. List the album's songs
USER_ID=$(curl -s "${AUTH[@]}" "$BASE/Users/Me" | jq -r .Id)
SONG_ID=$(curl -s "${AUTH[@]}" "$BASE/Users/$USER_ID/Items?ParentId=$ALBUM_ID&IncludeItemTypes=Audio" \
  | jq -r '.Items[0].Id')

# 7. Ask for playback info, then stream the song
curl -s -X POST "${AUTH[@]}" "$BASE/Items/$SONG_ID/PlaybackInfo" | jq .
curl -s "${AUTH[@]}" "$BASE/Audio/$SONG_ID/stream" -o /tmp/song.audio

# 8. Favorite the song
curl -s -X POST "${AUTH[@]}" "$BASE/Users/$USER_ID/FavoriteItems/$SONG_ID" | jq .

# 9. Report playback start/stop (also drives scrobbling)
curl -s -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d "{\"ItemId\":\"$SONG_ID\",\"PositionTicks\":0}" "$BASE/Sessions/Playing"
curl -s -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d "{\"ItemId\":\"$SONG_ID\",\"PositionTicks\":1200000000}" "$BASE/Sessions/Playing/Stopped"

# 10. Create a playlist from a whole album (the album id is expanded to its tracks)
PLAYLIST_ID=$(curl -s -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d "{\"Name\":\"My Playlist\",\"Ids\":[\"$ALBUM_ID\"]}" "$BASE/Playlists" | jq -r .Id)

# 11. Make it public, then remove one entry
curl -s -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d '{"IsPublic":true}' "$BASE/Playlists/$PLAYLIST_ID"
ENTRY_ID=$(curl -s "${AUTH[@]}" "$BASE/Playlists/$PLAYLIST_ID/Items" | jq -r '.Items[0].PlaylistItemId')
curl -s -X DELETE "${AUTH[@]}" "$BASE/Playlists/$PLAYLIST_ID/Items?EntryIds=$ENTRY_ID"

# 12. Delete the playlist
curl -s -X DELETE "${AUTH[@]}" "$BASE/Items/$PLAYLIST_ID"
```

## 测试

处理程序级别的单元测试与每个文件放在一起（`*_test.go`）。[`e2e/`](e2e) 中的完整端到端测试套件通过真实路由器，针对真实的 SQLite 数据库和真实仓库，对每个端点进行演练（只有封面/流式播放/ffmpeg 被替换为桩），并提供按 `Describe` 划分的快照隔离——与 Subsonic 的 `server/subsonic/e2e` 套件一致。运行方式：

```bash
make test PKG=./server/jellyfin/...
```

## 已知限制

- **流派是全局的。** `GET Genres`/`MusicGenres` 不限定于当前用户的媒体库（在 Navidrome 的模型中，流派标签不是按媒体库划分的实体）。
- **艺人的条目访问依赖于列表时的范围限定。** 与专辑和歌曲（它们各自恰好属于一个媒体库，并且在每次获取时都会对照 `user.HasLibraryAccess` 进行检查）不同，一个艺人可以通过 `library_artist` 拥有跨多个媒体库的内容，因此没有单一的媒体库 id 可用于对直接的 `GET Items/{artistId}` 或收藏/评分调用进行把关。对艺人的访问控制是通过将 `Artists`/`Items?IncludeItemTypes=MusicArtist` *列表*限定到用户媒体库，再加上持久层的纵深防御来强制实现的；已经从别处获得艺人 id 的客户端不会重新对照媒体库成员资格进行检查。
- **模糊哈希（Blurhash）是合成的，而不是根据封面计算的（待跟进）。** `ImageBlurHashes` 由 `dto/blurhash.go` 填充，它通过对条目 id 进行哈希，推导出一个格式正确的**单分量（纯色）**模糊哈希——它从不查看实际图片。真正的 Jellyfin 会在扫描时根据封面的像素（缩小到 128×128）计算一次多分量模糊哈希，并按图片存储，因此其占位图大致近似于封面。我们的实现满足协议要求（Finamp 能获得一个有效值，用作去重键和占位图，不会出现缺少模糊哈希的警告），但在封面加载期间渲染为纯色。正确的实现应在 `core/artwork` 流水线（图片已在那里解码）中计算真实的模糊哈希，像封面一样按键缓存，并让映射器读取它——同时保留合成值作为尚未渲染封面的回退。
- **WebSocket 只做保活；它不推送任何事件（待跟进）。** `GET socket` 发送 `ForceKeepAlive` 并应答 `KeepAlive` ping，使实时客户端（Finamp）能进入一个可用的会话，而不是陷入 404 循环重连，但它从不推送任何内容。后续工作将（通过 `server/events`）在其上广播真实的会话/播放状态和媒体库变更事件，与 Jellyfin 的会话消息一致。
- **歌词。** `GET Audio/{id}/Lyrics` 将主歌词轨道作为 `LyricDto` 提供（`Start` 以 100ns 刻度计，存在时还有词级 `Cues`），通过完整的 `core/lyrics` 流水线（内嵌、`.lrc` sidecar、按 `LyricsPriority` 的插件）解析，并置于 5 分钟 TTL 缓存之后，该缓存也会缓存未命中——Jellify 为每首播放的曲目获取歌词，Feishin 则按歌曲切换获取，因此无歌词的曲目是热路径。没有歌词 → 404（绝不会是空 200），三个客户端都能优雅降级。Finamp 通过 `Lyric` `MediaStream` 来开启其歌词视图（而不是 `HasLyrics`，那只是一个列表徽章）：浏览列表仅从内嵌歌词来通告它（`"[]"` 哨兵检查——该列在扫描后绝不会是 `""`），而 `PlaybackInfo` 会为每首曲目运行完整流水线，因此 sidecar/插件歌词也能点亮。Feishin 还要求服务器版本 ≥ 10.9——这就是 `jellyfinVersion` 为 10.9.11 的原因。同一曲目的并发未命中会共享一次流水线调用（`SimpleCache.GetWithLoader` 是单飞（singleflight）的），并且加载会脱离请求上下文运行，带有一分钟的时限，因此被取消的请求或挂起的插件无法使加载失败或拖住其他等待者。后续工作：只有 sidecar/插件来源歌词的曲目在列表中不会显示 `HasLyrics` 徽章（在列表时无法在不知道每行 I/O 的情况下获知请求时的来源）。
