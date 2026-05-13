# 我做了一个免费开源的多网盘聚合播放器 BoxPlayer

大家好，我最近在继续维护一个开源项目：BoxPlayer。

它的仓库名叫 `aliyunpan`，但现在对外更希望大家记住 BoxPlayer 这个名字。它不是单一网盘客户端，而是一个免费开源、跨平台的多网盘聚合播放器：一边管理网盘和本地文件，一边把它们整理成更接近影音库的使用体验。

如果你平时有这些需求，可能会比较适合试试：

- 电影、剧集、动漫散落在不同网盘里，希望统一搜索和播放。
- 同时用阿里云盘、百度网盘、123 网盘、115 网盘、PikPak、OneDrive、Box、Dropbox 或 WebDAV。
- 想在 Linux 或 NAS 场景下找一个能跑的多网盘播放器。
- 已经在用 Emby、Jellyfin、Plex，但还希望有一个网盘和媒体库聚合入口。
- 想要一个免费开源、代码可查、能反馈 issue 的工具。

## BoxPlayer 能做什么

### 多网盘聚合

BoxPlayer 支持阿里云盘、百度网盘、123 网盘、115 网盘、PikPak、OneDrive、Box、Dropbox，也支持通过 WebDAV 连接更多网盘服务。你也可以导入本地文件夹，把本地媒体纳入同一个媒体库。

### 智能媒体库

它可以扫描网盘和本地文件，结合 TMDB 元数据整理电影、电视剧、动漫等内容，形成海报墙、列表视图和详情页。对影音用户来说，它更像一个“多来源媒体库”，而不只是文件列表。

### 在线播放

播放器支持原画播放、多音轨、外挂字幕、字幕轨道切换、清晰度切换、播放速度、播放列表，也可以调用 MPV、IINA 等第三方播放器。

### 媒体服务器

BoxPlayer 支持连接 Emby、Jellyfin、Plex，可以浏览继续观看、最近添加、电影、剧集、动漫等内容，也支持跨服务器搜索。

### Linux 支持

BoxPlayer 提供 Windows、macOS、Linux 版本。Linux 侧支持 AppImage、deb、pacman、zip 等安装方式，并覆盖 x64、ARM64、ARMv7 等架构。对 Linux 桌面、NAS、迷你主机用户来说，这一点会比较实用。

## 下载和源码

- 项目仓库: https://github.com/gaozhangmin/aliyunpan
- Release 下载: https://github.com/gaozhangmin/aliyunpan/releases
- 最新版本: https://github.com/gaozhangmin/aliyunpan/releases/latest

## 开源和安全说明

BoxPlayer 是免费开源项目，使用时请遵守相关法律法规和各平台服务条款。项目尽量基于官方 SDK/API、开放接口或通用协议能力实现相关功能。项目代码公开，数据处理逻辑可审查；建议用户自行了解授权、缓存和第三方服务风险。

使用任何第三方客户端或工具前，都建议你理解可能存在的账号风控、限速或接口变化风险。这个项目不能承诺“不会封号”或“永远不限速”，但代码公开，大家可以审查、反馈和一起改进。

## 欢迎反馈

如果你试用了 BoxPlayer，欢迎反馈：

- 哪个系统和安装包是否能顺利运行。
- 哪个网盘体验最好或最需要改进。
- 字幕、音轨、媒体库、搜索、下载等功能是否符合你的使用习惯。
- Linux/NAS 场景下还缺什么。

如果觉得项目有用，也欢迎 Star、提 issue 或参与贡献。

## 发布备注

### 备用标题

1. 我做了一个免费开源的多网盘聚合播放器 BoxPlayer
2. BoxPlayer：把阿里/百度/115/123/PikPak/OneDrive/Dropbox/Box/WebDAV 聚合到一个播放器里
3. 给 Linux/NAS/影音用户的开源多网盘播放器：BoxPlayer
