# BoxPlayer Promotion Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a reusable BoxPlayer promotion package with platform-specific posts, FAQ replies, screenshot guidance, and a manual posting checklist.

**Architecture:** Create a self-contained content package under `docs/promotion/boxplayer-campaign/`. Keep strategy, drafts, replies, screenshot mapping, and posting checklist in separate Markdown files so each asset can be reviewed and copied independently.

**Tech Stack:** Markdown documentation, existing README/README.en.md content, existing screenshots in `screenshot/` and `images/`, manual review with `rg`.

---

## File Structure

- Create: `docs/promotion/boxplayer-campaign/README.md`
  - Campaign index, positioning summary, file map, and publishing order.
- Create: `docs/promotion/boxplayer-campaign/long-article-zh.md`
  - Long Chinese article for Zhihu, Juejin, WeChat, or blog.
- Create: `docs/promotion/boxplayer-campaign/forum-short-zh.md`
  - Short Chinese forum versions for V2EX, Linux.do, 52pojie, Coolapk, and Zhihu short post.
- Create: `docs/promotion/boxplayer-campaign/linux-nas-zh.md`
  - Linux/NAS/home-media focused Chinese draft.
- Create: `docs/promotion/boxplayer-campaign/english-posts.md`
  - Reddit, Hacker News, and open-source community English drafts.
- Create: `docs/promotion/boxplayer-campaign/faq-replies.md`
  - Reusable replies for common objections and questions.
- Create: `docs/promotion/boxplayer-campaign/screenshots.md`
  - Screenshot mapping, caption suggestions, and optional cover image brief.
- Create: `docs/promotion/boxplayer-campaign/posting-checklist.md`
  - Manual platform-by-platform posting checklist and follow-up tracker.

## Task 1: Create Campaign Index

**Files:**
- Create: `docs/promotion/boxplayer-campaign/README.md`

- [ ] **Step 1: Create the campaign directory**

Run:

```bash
mkdir -p docs/promotion/boxplayer-campaign
```

Expected: directory exists at `docs/promotion/boxplayer-campaign`.

- [ ] **Step 2: Write the index**

Create `docs/promotion/boxplayer-campaign/README.md` with:

```markdown
# BoxPlayer 宣发包

Date: 2026-05-12

## 一句话定位

BoxPlayer 是一个免费开源、跨平台的多网盘聚合播放器，支持阿里云盘、百度网盘、123 网盘、115 网盘、PikPak、OneDrive、Box、Dropbox、WebDAV、本地媒体库，以及 Emby/Jellyfin/Plex 等媒体服务器。

## 使用原则

- 对外统一使用 BoxPlayer，`aliyunpan` 只作为 GitHub 仓库名出现。
- 不把 GitHub 当发帖平台，只作为源码、下载和 issue 入口。
- 不同社区不要复制粘贴同一篇，至少调整标题、开头和截图。
- 不承诺不会封号、无限速或绝对安全。
- 优先使用“开源项目分享、欢迎试用反馈”的语气。

## 文件说明

- `long-article-zh.md`: 中文长文，适合知乎、掘金、公众号、博客。
- `forum-short-zh.md`: 中文短帖，适合 V2EX、Linux.do、吾爱破解、酷安。
- `linux-nas-zh.md`: Linux、NAS、家庭影音用户版本。
- `english-posts.md`: Reddit、Hacker News、海外开源社区版本。
- `faq-replies.md`: 常见问题和评论回复模板。
- `screenshots.md`: 截图使用建议和宣发封面 brief。
- `posting-checklist.md`: 平台发布顺序、发布前检查和复盘记录。

## 推荐发布顺序

1. V2EX、Linux.do、吾爱破解、酷安、知乎短帖或长文。
2. Linux/NAS/家庭影音社区。
3. Reddit r/selfhosted、r/linux、r/opensource、Hacker News Show HN。

## 主要入口

- 项目仓库: https://github.com/gaozhangmin/aliyunpan
- 下载页面: https://github.com/gaozhangmin/aliyunpan/releases
- 最新下载: https://github.com/gaozhangmin/aliyunpan/releases/latest
```

- [ ] **Step 3: Review the index**

Run:

```bash
sed -n '1,220p' docs/promotion/boxplayer-campaign/README.md
```

Expected: the file contains the positioning, principles, file map, publishing order, and links.

- [ ] **Step 4: Commit**

```bash
git add -f docs/promotion/boxplayer-campaign/README.md
git commit -m "docs: add BoxPlayer promotion campaign index"
```

## Task 2: Draft Long Chinese Article

**Files:**
- Create: `docs/promotion/boxplayer-campaign/long-article-zh.md`

- [ ] **Step 1: Write the long article**

Create `docs/promotion/boxplayer-campaign/long-article-zh.md` with this structure:

```markdown
# 我做了一个免费开源的多网盘聚合播放器 BoxPlayer

## 可选标题

1. 我做了一个免费开源的多网盘聚合播放器 BoxPlayer
2. BoxPlayer：把阿里/百度/115/123/PikPak/OneDrive/Dropbox/Box/WebDAV 聚合到一个播放器里
3. 给 Linux/NAS/影音用户的开源多网盘播放器：BoxPlayer

## 正文

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

BoxPlayer 是免费开源项目，使用时请遵守相关法律法规和各平台服务条款。项目通过官方 SDK/API 或通用协议能力实现相关功能，不拦截、存储或篡改用户数据。

使用任何第三方客户端或工具前，都建议你理解可能存在的账号风控、限速或接口变化风险。这个项目不能承诺“不会封号”或“永远不限速”，但代码公开，大家可以审查、反馈和一起改进。

## 欢迎反馈

如果你试用了 BoxPlayer，欢迎反馈：

- 哪个系统和安装包是否能顺利运行。
- 哪个网盘体验最好或最需要改进。
- 字幕、音轨、媒体库、搜索、下载等功能是否符合你的使用习惯。
- Linux/NAS 场景下还缺什么。

如果觉得项目有用，也欢迎 Star、提 issue 或参与贡献。
```

- [ ] **Step 2: Check for risky claims**

Run:

```bash
rg -n "绝对|不会封号|无限速|吊打|最强|唯一" docs/promotion/boxplayer-campaign/long-article-zh.md
```

Expected: no output.
If output appears only in the warning sentence `不能承诺“不会封号”或“永远不限速”`, it is acceptable.

- [ ] **Step 3: Check required drive names**

Run:

```bash
rg -n "阿里云盘|百度网盘|123 网盘|115 网盘|PikPak|OneDrive|Box|Dropbox|WebDAV|Emby|Jellyfin|Plex" docs/promotion/boxplayer-campaign/long-article-zh.md
```

Expected: each supported service appears at least once.

- [ ] **Step 4: Commit**

```bash
git add -f docs/promotion/boxplayer-campaign/long-article-zh.md
git commit -m "docs: draft BoxPlayer long promotion article"
```

## Task 3: Draft Short Chinese Forum Posts

**Files:**
- Create: `docs/promotion/boxplayer-campaign/forum-short-zh.md`

- [ ] **Step 1: Write short forum drafts**

Create `docs/promotion/boxplayer-campaign/forum-short-zh.md` with:

```markdown
# 中文短帖版本

## V2EX

标题：

我做了一个免费开源的多网盘聚合播放器 BoxPlayer，支持阿里/百度/115/123/PikPak/OneDrive/Dropbox/Box/WebDAV

正文：

大家好，最近在继续维护一个开源项目 BoxPlayer。仓库名还是 `aliyunpan`，但对外宣传会统一叫 BoxPlayer。

它的定位是：免费、开源、跨平台的多网盘聚合播放器。支持阿里云盘、百度网盘、123 网盘、115 网盘、PikPak、OneDrive、Box、Dropbox、WebDAV，也支持本地文件夹和 Emby/Jellyfin/Plex。

我自己更希望它解决的是这个问题：电影、剧集、动漫、资料散落在多个网盘和本地目录里时，可以统一管理、搜索、整理媒体库，并直接播放。

目前主要功能：

- 多网盘和多账号管理
- TMDB 媒体库刮削、海报墙、详情页
- 聚合搜索
- 原画在线播放、字幕、多音轨、清晰度切换
- MPV/IINA 等第三方播放器
- Aria2c 下载和远程下载
- Windows/macOS/Linux，Linux 有 AppImage/deb/pacman/zip

下载：

- Release: https://github.com/gaozhangmin/aliyunpan/releases
- 最新版本: https://github.com/gaozhangmin/aliyunpan/releases/latest
- 源码: https://github.com/gaozhangmin/aliyunpan

这是免费开源项目，欢迎试用、提 issue、提建议。也想听听大家对 Linux/NAS/多网盘播放器这类工具的真实需求。

## Linux.do

标题：

BoxPlayer：一个免费开源的跨平台多网盘播放器，Linux 有 AppImage/deb/pacman

正文：

分享一个我在维护的开源项目：BoxPlayer。仓库名是 `aliyunpan`，对外产品名叫 BoxPlayer。

它不是单一网盘客户端，而是多网盘聚合播放器 + 媒体库。支持阿里云盘、百度网盘、123 网盘、115 网盘、PikPak、OneDrive、Box、Dropbox、WebDAV、本地文件夹，也能连接 Emby/Jellyfin/Plex。

比较想重点听 Linux/NAS 用户反馈：

- AppImage/deb/pacman/zip 哪种安装方式更常用？
- x64、ARM64、ARMv7 包是否够用？
- NAS/迷你主机上更需要 WebDAV、远程 Aria2，还是媒体库？
- 多网盘聚合搜索和在线播放是否符合你的工作流？

下载和源码：

- https://github.com/gaozhangmin/aliyunpan/releases
- https://github.com/gaozhangmin/aliyunpan

项目免费开源，欢迎试用反馈。使用前也请理解各网盘平台可能存在接口变化、账号风控或限速风险。

## 吾爱破解

标题：

[开源] BoxPlayer 免费多网盘聚合播放器，支持阿里/百度/115/123/PikPak/OneDrive/Dropbox/Box/WebDAV

正文：

分享一个免费开源项目 BoxPlayer，仓库名是 `aliyunpan`。

它主要面向多网盘和影音用户：支持阿里云盘、百度网盘、123 网盘、115 网盘、PikPak、OneDrive、Box、Dropbox、WebDAV，也支持本地文件夹、Emby、Jellyfin、Plex。

主要功能：

- 多网盘、多账号统一管理
- 文件管理、文件夹树、批量操作
- 媒体库扫描和 TMDB 元数据
- 在线播放、字幕、多音轨、清晰度切换
- MPV/IINA 第三方播放器
- Aria2c 高速下载和远程下载
- Windows/macOS/Linux

下载：

https://github.com/gaozhangmin/aliyunpan/releases

源码：

https://github.com/gaozhangmin/aliyunpan

说明：项目免费开源，仅用于学习交流和方便管理个人文件。请遵守法律法规和各平台服务条款。

## 酷安

标题：

BoxPlayer：免费开源的多网盘聚合播放器

正文：

做了一个免费开源的多网盘聚合播放器 BoxPlayer，仓库名叫 `aliyunpan`。

支持阿里云盘、百度网盘、123 网盘、115 网盘、PikPak、OneDrive、Box、Dropbox、WebDAV，也支持本地媒体库和 Emby/Jellyfin/Plex。

它更像是“网盘 + 媒体库 + 播放器”：

- 多账号、多网盘统一管理
- 自动整理电影/剧集/动漫媒体库
- 海报墙、详情页、聚合搜索
- 在线播放、字幕、多音轨、清晰度切换
- Windows/macOS/Linux 都有包

下载地址：

https://github.com/gaozhangmin/aliyunpan/releases

源码：

https://github.com/gaozhangmin/aliyunpan

欢迎试用和反馈，尤其想听多网盘、Linux、NAS 用户的建议。
```

- [ ] **Step 2: Check platform sections**

Run:

```bash
rg -n "^## " docs/promotion/boxplayer-campaign/forum-short-zh.md
```

Expected: V2EX, Linux.do, 吾爱破解, and 酷安 sections appear.

- [ ] **Step 3: Check for risky claims**

Run:

```bash
rg -n "绝对|不会封号|无限速|吊打|最强|唯一" docs/promotion/boxplayer-campaign/forum-short-zh.md
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add -f docs/promotion/boxplayer-campaign/forum-short-zh.md
git commit -m "docs: draft BoxPlayer Chinese forum posts"
```

## Task 4: Draft Linux/NAS Chinese Post

**Files:**
- Create: `docs/promotion/boxplayer-campaign/linux-nas-zh.md`

- [ ] **Step 1: Write the Linux/NAS draft**

Create `docs/promotion/boxplayer-campaign/linux-nas-zh.md` with:

```markdown
# Linux/NAS/家庭影音版本

## 推荐标题

1. BoxPlayer：Linux 上可用的免费开源多网盘聚合播放器
2. 给 Linux/NAS 用户的多网盘媒体库：BoxPlayer
3. BoxPlayer 支持 AppImage/deb/pacman，把多网盘和 Emby/Jellyfin/Plex 聚合到一起

## 正文

分享一个我在维护的免费开源项目：BoxPlayer。

它的仓库名是 `aliyunpan`，但现在对外统一叫 BoxPlayer。这个项目比较适合 Linux 桌面、NAS、迷你主机、家庭影音用户：它把多网盘、本地媒体库、媒体服务器和播放器放在一个跨平台应用里。

## 为什么特别想请 Linux/NAS 用户试试

很多网盘工具优先照顾 Windows/macOS，Linux 上要么没有客户端，要么只有文件同步/下载能力。BoxPlayer 希望补上的是“多网盘 + 媒体库 + 播放器”这个场景。

目前 Linux 包包括：

- AppImage
- deb
- pacman
- zip
- x64、ARM64、ARMv7 等架构

## 支持内容

云盘和协议：

- 阿里云盘
- 百度网盘
- 123 网盘
- 115 网盘
- PikPak
- OneDrive
- Box
- Dropbox
- WebDAV
- 本地文件夹

媒体服务器：

- Emby
- Jellyfin
- Plex

播放器和媒体库：

- TMDB 元数据刮削
- 电影、剧集、动漫整理
- 海报墙和列表视图
- 聚合搜索
- 在线播放
- 字幕、多音轨、清晰度切换
- MPV/IINA 第三方播放器
- Aria2c 下载和远程下载

## 下载

- Release: https://github.com/gaozhangmin/aliyunpan/releases
- 最新版本: https://github.com/gaozhangmin/aliyunpan/releases/latest
- 源码: https://github.com/gaozhangmin/aliyunpan

## 想收集的反馈

- 你的发行版和架构是什么？
- 哪种包格式最好用？
- AppImage/deb/pacman 是否能正常运行？
- NAS 或迷你主机上最需要哪个功能？
- WebDAV、多网盘搜索、在线播放、远程下载哪个更重要？

项目免费开源，欢迎试用和提 issue。也请遵守法律法规和各平台服务条款；任何第三方客户端都可能受接口变化、账号风控或限速影响。
```

- [ ] **Step 2: Verify Linux package terms**

Run:

```bash
rg -n "AppImage|deb|pacman|zip|x64|ARM64|ARMv7" docs/promotion/boxplayer-campaign/linux-nas-zh.md
```

Expected: all Linux package and architecture terms appear.

- [ ] **Step 3: Commit**

```bash
git add -f docs/promotion/boxplayer-campaign/linux-nas-zh.md
git commit -m "docs: draft BoxPlayer Linux NAS promotion post"
```

## Task 5: Draft English Posts

**Files:**
- Create: `docs/promotion/boxplayer-campaign/english-posts.md`

- [ ] **Step 1: Write English drafts**

Create `docs/promotion/boxplayer-campaign/english-posts.md` with:

```markdown
# English Promotion Drafts

## Reddit r/selfhosted / r/linux

Title:

BoxPlayer: a free open-source media player for cloud drives, Linux, and media servers

Body:

Hi everyone, I am maintaining an open-source project called BoxPlayer. The repository is still named `aliyunpan`, but the public product name is BoxPlayer.

BoxPlayer is a free, open-source, cross-platform media player and media library for multiple cloud drives. It supports Aliyun Drive, Baidu Netdisk, 123Pan, 115 Drive, PikPak, OneDrive, Box, Dropbox, WebDAV, local folders, and media servers such as Emby, Jellyfin, and Plex.

The main use case is simple: if your videos are spread across cloud drives, local folders, and media servers, BoxPlayer gives you one place to browse, search, organize, and play them.

Current features include:

- Multi-cloud and multi-account management
- Local folder import
- TMDB metadata scraping
- Movies, TV shows, anime, poster wall, and list views
- Aggregated search
- Online playback
- External subtitles, multiple audio tracks, quality switching, and playlists
- MPV/IINA external player support
- Aria2c downloads and remote Aria2 downloads
- Windows, macOS, and Linux builds
- Linux packages: AppImage, deb, pacman, zip, x64, ARM64, and ARMv7

Links:

- Releases: https://github.com/gaozhangmin/aliyunpan/releases
- Latest release: https://github.com/gaozhangmin/aliyunpan/releases/latest
- Source code: https://github.com/gaozhangmin/aliyunpan

I would especially appreciate feedback from Linux, NAS, and home media users. The project is free and open source. Please use it responsibly and follow the terms of the services you connect to.

## Hacker News Show HN

Title:

Show HN: BoxPlayer, an open-source player for cloud drives and media servers

Body:

Hi HN, I am working on BoxPlayer, a free open-source cross-platform media player for cloud drives, local folders, and media servers.

It supports Aliyun Drive, Baidu Netdisk, 123Pan, 115 Drive, PikPak, OneDrive, Box, Dropbox, WebDAV, local media libraries, and Emby/Jellyfin/Plex. The app is built with Electron, Vue, and TypeScript.

The motivation is to make scattered media files easier to browse and play, especially for users who keep videos across several cloud drives or use Linux/NAS setups where native clients are limited.

Features:

- Multi-cloud account management
- TMDB metadata scraping
- Poster wall and list views
- Aggregated search
- Online playback with subtitles, audio tracks, and quality switching
- External player support
- Aria2c downloads
- Windows/macOS/Linux packages, including AppImage/deb/pacman

Source and releases:

https://github.com/gaozhangmin/aliyunpan

Feedback is welcome, especially around Linux packaging, NAS usage, and self-hosted media workflows.

## Reddit r/opensource

Title:

BoxPlayer: free open-source cross-platform media player for cloud drives

Body:

I am sharing BoxPlayer, a free open-source project for managing and playing media across cloud drives, local folders, and media servers.

Supported sources include Aliyun Drive, Baidu Netdisk, 123Pan, 115 Drive, PikPak, OneDrive, Box, Dropbox, WebDAV, local folders, Emby, Jellyfin, and Plex.

The app is built with Electron, Vue, and TypeScript, and provides Windows, macOS, and Linux builds. Linux packages include AppImage, deb, pacman, and zip.

Repository:

https://github.com/gaozhangmin/aliyunpan

Releases:

https://github.com/gaozhangmin/aliyunpan/releases

I would love feedback from open-source users and contributors.
```

- [ ] **Step 2: Check English service names**

Run:

```bash
rg -n "Aliyun Drive|Baidu Netdisk|123Pan|115 Drive|PikPak|OneDrive|Box|Dropbox|WebDAV|Emby|Jellyfin|Plex" docs/promotion/boxplayer-campaign/english-posts.md
```

Expected: supported services appear in English.

- [ ] **Step 3: Check for risky English claims**

Run:

```bash
rg -n "guarantee|unlimited|no ban|safest|best|only" docs/promotion/boxplayer-campaign/english-posts.md
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add -f docs/promotion/boxplayer-campaign/english-posts.md
git commit -m "docs: draft BoxPlayer English promotion posts"
```

## Task 6: Write FAQ And Reply Templates

**Files:**
- Create: `docs/promotion/boxplayer-campaign/faq-replies.md`

- [ ] **Step 1: Write FAQ replies**

Create `docs/promotion/boxplayer-campaign/faq-replies.md` with:

```markdown
# FAQ 和评论回复模板

## 这是什么？

BoxPlayer 是一个免费开源、跨平台的多网盘聚合播放器。它把网盘、本地文件夹、媒体服务器和播放器放到一个应用里，方便统一浏览、搜索、整理和播放。

## 为什么仓库叫 aliyunpan，宣传叫 BoxPlayer？

这是项目历史原因。仓库名沿用了 `aliyunpan`，但现在项目已经不只是阿里云盘工具，所以对外统一使用 BoxPlayer 这个产品名。

## 免费吗？

免费。项目是开源项目，可以从 GitHub Release 下载，也可以查看源码。

## 开源吗？

开源，使用 MIT License。源码地址是 https://github.com/gaozhangmin/aliyunpan

## 支持哪些网盘？

目前支持阿里云盘、百度网盘、123 网盘、115 网盘、PikPak、OneDrive、Box、Dropbox、WebDAV，也支持本地文件夹。WebDAV 可以连接更多兼容 WebDAV 的网盘或存储服务。

## 支持 Linux 吗？

支持。Linux 侧有 AppImage、deb、pacman、zip 等包，并覆盖 x64、ARM64、ARMv7 等架构。

## 和 Emby/Jellyfin/Plex 是什么关系？

BoxPlayer 不是替代它们的媒体服务器。它可以连接 Emby、Jellyfin、Plex，也可以把网盘和本地文件整理成自己的媒体库。你可以把它当作多网盘、本地文件和媒体服务器的聚合入口。

## 安全吗？

项目免费开源，代码可以审查。BoxPlayer 按 README 中的说明，通过官方 SDK/API 或通用协议能力实现相关功能，不拦截、存储或篡改用户数据。实际使用前，仍建议你理解第三方客户端、接口变化和账号风控风险。

## 会封号吗？会限速吗？

不能承诺不会。任何第三方客户端或工具都可能受到平台策略、接口变化、账号风控和限速影响。建议遵守各平台服务条款，不要滥用。

## 下载地址在哪里？

Release 下载：

https://github.com/gaozhangmin/aliyunpan/releases

最新版本：

https://github.com/gaozhangmin/aliyunpan/releases/latest

源码：

https://github.com/gaozhangmin/aliyunpan

## 我应该下载哪个安装包？

Windows 用户优先选 `win.exe`。macOS 用户按芯片选择 x64 或 arm64 的 dmg。Linux 用户可以优先试 AppImage；Debian/Ubuntu 可以用 deb；Arch/Manjaro 可以用 pacman；也可以使用 zip 免安装包。

## 可以提需求吗？

可以。欢迎在 GitHub 提 issue，最好带上系统版本、安装包类型、网盘类型、复现步骤和截图。

## 评论区简短回复模板

### 对 Linux 用户

感谢反馈。Linux 这块我也很重视，目前有 AppImage/deb/pacman/zip 和多架构包。如果你方便的话，可以说一下发行版、架构和使用哪个安装包，后面我会优先看 Linux/NAS 场景的问题。

### 对安全质疑

这个担心很正常。项目是免费开源的，代码可以审查；README 里也写了免责声明。它不承诺规避平台风控，也不建议滥用。欢迎从源码和网络行为角度帮忙一起 review。

### 对网盘支持问题

目前支持阿里云盘、百度网盘、123 网盘、115 网盘、PikPak、OneDrive、Box、Dropbox、WebDAV 和本地文件夹。如果你有其他网盘需求，可以提 issue，我会看是否适合通过官方接口或 WebDAV 支持。

### 对功能建议

感谢建议，这类反馈很有价值。可以的话请在 GitHub issue 里补一下使用场景、系统、网盘类型和你期望的交互方式，我会集中整理。
```

- [ ] **Step 2: Check FAQ coverage**

Run:

```bash
rg -n "^## " docs/promotion/boxplayer-campaign/faq-replies.md
```

Expected: FAQ sections cover identity, name, price, open source, drives, Linux, media servers, safety, account risk, downloads, package choice, and feature requests.

- [ ] **Step 3: Commit**

```bash
git add -f docs/promotion/boxplayer-campaign/faq-replies.md
git commit -m "docs: add BoxPlayer promotion FAQ replies"
```

## Task 7: Write Screenshot Mapping And Cover Brief

**Files:**
- Create: `docs/promotion/boxplayer-campaign/screenshots.md`

- [ ] **Step 1: Write screenshot mapping**

Create `docs/promotion/boxplayer-campaign/screenshots.md` with:

```markdown
# 截图使用建议

## 核心截图组合

### 1. 媒体服务器主页和海报墙

用途：证明 BoxPlayer 是播放器和媒体库，不只是网盘文件管理器。

推荐文件：

- `screenshot/截屏2026-04-24 23.06.07.png`
- `screenshot/截屏2026-04-24 23.18.46.png`
- `images/media-library.png`
- `images/movie-grid.png`

建议说明：

> 媒体库主页、继续观看、分类浏览和海报墙。

### 2. 媒体详情和剧集

用途：展示 TMDB 信息、详情页和剧集体验。

推荐文件：

- `screenshot/截屏2026-04-24 23.06.22.png`
- `screenshot/截屏2026-04-24 23.28.52.png`
- `images/movie-details.png`
- `images/movie-info.png`

建议说明：

> 电影/剧集详情、评分、简介、分集列表和播放进度。

### 3. 聚合搜索和媒体库列表

用途：展示跨库搜索和查找能力。

推荐文件：

- `screenshot/截屏2026-04-24 23.19.41.png`
- `screenshot/截屏2026-04-24 23.19.53.png`
- `screenshot/截屏2026-04-24 23.20.36.png`
- `images/movie-list.png`

建议说明：

> 跨网盘、本地媒体库和媒体服务器的聚合搜索。

### 4. 文件管理和文件夹树

用途：展示网盘管理、文件夹树和文件操作能力。

推荐文件：

- `screenshot/截屏2026-04-24 23.20.18.png`
- `images/folder-tree.png`
- `images/file-manager.png`

建议说明：

> 文件管理、文件夹树、批量操作和快速浏览。

### 5. 多账号和登录

用途：展示多账号、多网盘管理。

推荐文件：

- `images/multi-account.png`
- `images/login-qr.png`

建议说明：

> 多账号管理和二维码登录。

## 平台建议

- V2EX: 2-3 张截图即可，优先媒体库、聚合搜索、文件管理。
- Linux.do: 媒体库 + Linux 安装包说明截图或下载页面链接。
- 吾爱破解: 文件管理、多账号、播放器能力截图。
- 酷安: 海报墙、详情页、多账号，视觉优先。
- Zhihu/掘金长文: 每个能力模块各放 1-2 张图。
- Reddit/Hacker News: 1 张最能说明产品的组合图，正文保持简洁。

## 宣发封面 brief

尺寸：

- 横版 1600x900，适合文章封面和论坛首图。
- 可另做 1200x630，用于链接预览。

布局：

- 左侧：BoxPlayer 标题。
- 副标题：免费开源的多网盘聚合播放器。
- 右侧：3-4 张界面截图，优先选择海报墙、聚合搜索、文件管理、多账号。
- 底部标签：Free / Open Source / Windows / macOS / Linux / Multi-Cloud。

文案：

> BoxPlayer
> 免费开源的多网盘聚合播放器
> 阿里 / 百度 / 115 / 123 / PikPak / OneDrive / Box / Dropbox / WebDAV

风格：

- 清爽、可信、开源项目感。
- 不使用“最强”“唯一”“无限速”等字样。
- 不遮挡产品界面中的核心内容。
```

- [ ] **Step 2: Verify referenced screenshots exist**

Run:

```bash
while IFS= read -r path; do test -f "$path" || echo "missing: $path"; done < <(rg -o "`[^`]+\\.(png|jpg|jpeg|webp)`" docs/promotion/boxplayer-campaign/screenshots.md | tr -d '`')
```

Expected: no `missing:` output.

- [ ] **Step 3: Commit**

```bash
git add -f docs/promotion/boxplayer-campaign/screenshots.md
git commit -m "docs: map BoxPlayer promotion screenshots"
```

## Task 8: Write Manual Posting Checklist

**Files:**
- Create: `docs/promotion/boxplayer-campaign/posting-checklist.md`

- [ ] **Step 1: Write checklist**

Create `docs/promotion/boxplayer-campaign/posting-checklist.md` with:

```markdown
# 发布清单

## 发布前统一检查

- [ ] 标题已按平台调整，不是全平台复制粘贴。
- [ ] 开头 3 行说明 BoxPlayer 是什么。
- [ ] 已包含下载链接和源码链接。
- [ ] 已包含免费开源信息。
- [ ] 已包含主要网盘支持：阿里云盘、百度网盘、123 网盘、115 网盘、PikPak、OneDrive、Box、Dropbox、WebDAV。
- [ ] 没有承诺不会封号、无限速、绝对安全。
- [ ] 如果平台允许图片，已选择 1-4 张匹配截图。
- [ ] 如果平台规则限制推广，已改成“开源项目分享/征求反馈”语气。

## 第一批：中文核心社区

### V2EX

- [ ] 节点选择：分享创造、程序员、Linux 或相关节点。
- [ ] 使用 `forum-short-zh.md` 的 V2EX 版本。
- [ ] 图片：媒体库、聚合搜索、文件管理。
- [ ] 发布后记录链接：
- [ ] 24 小时后记录反馈：

### Linux.do

- [ ] 使用 `forum-short-zh.md` 的 Linux.do 版本。
- [ ] 强调 Linux 包、NAS、WebDAV、媒体服务器。
- [ ] 发布后记录链接：
- [ ] 24 小时后记录反馈：

### 吾爱破解

- [ ] 使用 `forum-short-zh.md` 的吾爱破解版本。
- [ ] 确认板块规则允许开源项目分享。
- [ ] 强调开源、学习交流、合法合规使用。
- [ ] 发布后记录链接：
- [ ] 24 小时后记录反馈：

### 酷安

- [ ] 使用 `forum-short-zh.md` 的酷安版本。
- [ ] 图片优先使用视觉效果强的海报墙和详情页。
- [ ] 发布后记录链接：
- [ ] 24 小时后记录反馈：

### 知乎/掘金

- [ ] 使用 `long-article-zh.md`。
- [ ] 每个能力模块配 1 张截图。
- [ ] 发布后记录链接：
- [ ] 24 小时后记录反馈：

## 第二批：Linux/NAS/家庭影音社区

- [ ] 使用 `linux-nas-zh.md`。
- [ ] 根据平台删减无关网盘说明。
- [ ] 重点询问发行版、架构、安装包和 NAS 场景。
- [ ] 发布后记录链接：
- [ ] 24 小时后记录反馈：

## 第三批：英文社区

### Reddit r/selfhosted / r/linux / r/opensource

- [ ] 使用 `english-posts.md` 的 Reddit 版本。
- [ ] 检查 subreddit self-promotion rules。
- [ ] 首段说明 open-source、cross-platform、Linux builds。
- [ ] 发布后记录链接：
- [ ] 24 小时后记录反馈：

### Hacker News Show HN

- [ ] 使用 `english-posts.md` 的 Show HN 版本。
- [ ] 标题以 `Show HN:` 开头。
- [ ] 正文简洁，避免营销味。
- [ ] 发布后记录链接：
- [ ] 24 小时后记录反馈：

## 复盘指标

- [ ] GitHub stars 变化：
- [ ] Release downloads 变化：
- [ ] 新 issue 数量：
- [ ] 最高互动平台：
- [ ] 最常见问题：
- [ ] 需要补充到 FAQ 的回复：
- [ ] 下一轮应该强化的卖点：
```

- [ ] **Step 2: Check checklist structure**

Run:

```bash
rg -n "^## |^### |^- \\[ \\]" docs/promotion/boxplayer-campaign/posting-checklist.md
```

Expected: sections and checklist items are visible.

- [ ] **Step 3: Commit**

```bash
git add -f docs/promotion/boxplayer-campaign/posting-checklist.md
git commit -m "docs: add BoxPlayer promotion posting checklist"
```

## Task 9: Final Campaign Review

**Files:**
- Verify: `docs/promotion/boxplayer-campaign/*.md`

- [ ] **Step 1: List generated files**

Run:

```bash
find docs/promotion/boxplayer-campaign -maxdepth 1 -type f -name '*.md' -print | sort
```

Expected:

```text
docs/promotion/boxplayer-campaign/README.md
docs/promotion/boxplayer-campaign/english-posts.md
docs/promotion/boxplayer-campaign/faq-replies.md
docs/promotion/boxplayer-campaign/forum-short-zh.md
docs/promotion/boxplayer-campaign/linux-nas-zh.md
docs/promotion/boxplayer-campaign/long-article-zh.md
docs/promotion/boxplayer-campaign/posting-checklist.md
docs/promotion/boxplayer-campaign/screenshots.md
```

- [ ] **Step 2: Run risky-claim scan**

Run:

```bash
rg -n "绝对|不会封号|无限速|吊打|最强|唯一|guarantee|unlimited|no ban|safest|best|only" docs/promotion/boxplayer-campaign
```

Expected: no output, except if the wording appears in a warning such as "不承诺不会封号、无限速、绝对安全".

- [ ] **Step 3: Run required-link scan**

Run:

```bash
rg -n "github.com/gaozhangmin/aliyunpan|github.com/gaozhangmin/aliyunpan/releases|github.com/gaozhangmin/aliyunpan/releases/latest" docs/promotion/boxplayer-campaign
```

Expected: campaign files include repository, releases, and latest release links.

- [ ] **Step 4: Run support-coverage scan**

Run:

```bash
rg -n "阿里云盘|百度网盘|123 网盘|115 网盘|PikPak|OneDrive|Box|Dropbox|WebDAV|Emby|Jellyfin|Plex|Aliyun Drive|Baidu Netdisk|123Pan|115 Drive" docs/promotion/boxplayer-campaign
```

Expected: Chinese and English drafts mention the relevant service names.

- [ ] **Step 5: Final commit if review fixes were needed**

If Task 9 required any edits, commit them:

```bash
git add -f docs/promotion/boxplayer-campaign
git commit -m "docs: polish BoxPlayer promotion campaign"
```

If Task 9 required no edits, do not create an empty commit.
