<a href="https://www.navidrome.org"><img src="resources/logo-192x192.png" alt="Navidrome logo" title="navidrome" align="right" height="60px" /></a>

# Navidrome 音乐服务器 &nbsp;[![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=Tired%20of%20paying%20for%20music%20subscriptions%2C%20and%20not%20finding%20what%20you%20really%20like%3F%20Roll%20your%20own%20streaming%20service%21&url=https://navidrome.org&via=navidrome)

[![最新版本](https://img.shields.io/github/v/release/navidrome/navidrome?logo=github&label=latest&style=flat-square)](https://github.com/navidrome/navidrome/releases)
[![构建](https://img.shields.io/github/actions/workflow/status/navidrome/navidrome/pipeline.yml?branch=master&logo=github&style=flat-square)](https://nightly.link/navidrome/navidrome/workflows/pipeline/master)
[![下载量](https://img.shields.io/github/downloads/navidrome/navidrome/total?logo=github&style=flat-square)](https://github.com/navidrome/navidrome/releases/latest)
[![Docker 拉取数](https://img.shields.io/docker/pulls/deluan/navidrome?logo=docker&label=pulls&style=flat-square)](https://hub.docker.com/r/deluan/navidrome)
[![开发者聊天](https://img.shields.io/discord/671335427726114836?logo=discord&label=discord&style=flat-square)](https://discord.gg/xh7j7yF)
[![Subreddit](https://img.shields.io/reddit/subreddit-subscribers/navidrome?logo=reddit&label=/r/navidrome&style=flat-square)](https://www.reddit.com/r/navidrome/)
[![贡献者公约](https://img.shields.io/badge/Contributor%20Covenant-v2.0-ff69b4.svg?style=flat-square)](CODE_OF_CONDUCT.md)
[![Gurubase](https://img.shields.io/badge/Gurubase-Ask%20Navidrome%20Guru-006BFF?style=flat-square)](https://gurubase.io/g/navidrome)

Navidrome 是一款开源的、基于 Web 的音乐收藏服务器与流媒体播放器。它能让你在任何浏览器或移动设备上自由聆听自己的音乐收藏——就像专属于你的 Spotify！


**注意**：`master` 分支在开发过程中可能处于不稳定甚至损坏的状态。
要获取稳定的二进制文件，请使用[发布版本](https://github.com/navidrome/navidrome/releases)，而不是 `master` 分支。

## [查看在线演示！](https://www.navidrome.org/demo/)

__欢迎任何反馈！__ 如果你需要或想要某个新功能、发现了 bug，或有任何改进 Navidrome 的想法，
请提交 [GitHub issue](https://github.com/navidrome/navidrome/issues)，或加入我们的 [Subreddit](https://www.reddit.com/r/navidrome/) 参与讨论。
如果你想以其他方式为项目做贡献（[UI/后端开发](https://www.navidrome.org/docs/developers/)、
[翻译](https://www.navidrome.org/docs/developers/translations/)、[主题](https://www.navidrome.org/docs/developers/creating-themes)），
欢迎加入我们的 [Discord 服务器](https://discord.gg/xh7j7yF) 交流。

## 安装

参见[项目官网](https://www.navidrome.org/docs/installation/)的说明。

## 云端托管

[PikaPods](https://www.pikapods.com) 与我们合作，为你提供[官方支持的云托管方案](https://www.navidrome.org/docs/installation/managed/#pikapods)。
部分收入将用于资助 Navidrome 的开发，而你无需额外付费。

[![PikaPods](https://www.pikapods.com/static/run-button.svg)](https://www.pikapods.com/pods?run=navidrome)

## 功能特性

 - 可管理**超大型音乐收藏**
 - 几乎可以流式播放**任何音频格式**
 - 读取并使用你精心整理的**元数据（metadata）**
 - 对**合辑**（Various Artists 专辑）和**套装**（多碟专辑）支持良好
 - **多用户**，每个用户拥有独立的播放次数、播放列表、收藏等
 - **资源占用极低**
 - **跨平台**，可在 macOS、Linux 和 Windows 上运行，同时提供 **Docker** 镜像
 - 为主流平台提供开箱即用的二进制文件，包括**树莓派（Raspberry Pi）**
 - 自动**监控媒体库**的变化，导入新文件并重新加载元数据
 - 支持从外挂 .ttml、.yaml/.yml Lyricsfile、.elrc、.lrc、.srt、.txt 文件以及内嵌的 TTML、Enhanced LRC、LRC、SRT 和纯文本标签读取**歌词**（通过 `lyricspriority` 配置）
 - **可换主题**、现代且响应式的 **Web 界面**，基于 [Material UI](https://material-ui.com)
 - **兼容**所有 Subsonic/Madsonic/Airsonic [客户端](https://www.navidrome.org/docs/overview/#apps)
 - **即时转码**，可针对每个用户/播放器单独设置，支持 **Opus 编码**
 - 已翻译为**多种语言**

## 翻译

Navidrome 使用 [POEditor](https://poeditor.com/) 进行翻译，我们一直在寻找[更多贡献者](https://www.navidrome.org/docs/developers/translations/)。

<a href="https://poeditor.com/">
<img height="32" src="https://github.com/user-attachments/assets/c19b1d2b-01e1-4682-a007-12356c42147c">
</a>

## 文档
所有文档都可以在项目官网找到：https://www.navidrome.org/docs。以下是一些有用的直达链接：

- [概览](https://www.navidrome.org/docs/overview/)
- [安装](https://www.navidrome.org/docs/installation/)
  - [Docker](https://www.navidrome.org/docs/installation/docker/)
  - [二进制文件](https://www.navidrome.org/docs/installation/pre-built-binaries/)
  - [从源码构建](https://www.navidrome.org/docs/installation/build-from-source/)
- [开发](https://www.navidrome.org/docs/developers/)
- [Subsonic API 兼容性](https://www.navidrome.org/docs/developers/subsonic-api/)

## 截图

<p align="left">
    <img height="550" src="https://raw.githubusercontent.com/navidrome/navidrome/master/.github/screenshots/ss-mobile-login.png">
    <img height="550" src="https://raw.githubusercontent.com/navidrome/navidrome/master/.github/screenshots/ss-mobile-player.png">
    <img height="550" src="https://raw.githubusercontent.com/navidrome/navidrome/master/.github/screenshots/ss-mobile-album-view.png">
    <img width="550" src="https://raw.githubusercontent.com/navidrome/navidrome/master/.github/screenshots/ss-desktop-player.png">
</p>
