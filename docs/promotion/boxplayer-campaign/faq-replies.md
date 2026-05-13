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

支持。Linux 侧有 AppImage、deb、Arch/pacman 包、zip 等包，并覆盖 x64、ARM64、ARMv7 等架构。

## 和 Emby/Jellyfin/Plex 是什么关系？

BoxPlayer 不是替代它们的媒体服务器。它可以连接 Emby、Jellyfin、Plex，也可以把网盘和本地文件整理成自己的媒体库。你可以把它当作多网盘、本地文件和媒体服务器的聚合入口。

## 安全吗？

项目免费开源，代码可以审查。BoxPlayer 尽量使用官方 SDK/API、公开接口或通用协议能力，具体以 README 说明为准。项目设计上不以拦截、存储或篡改用户网盘内容为目的；具体行为可通过源码和网络请求自行审查。实际使用前，仍建议你理解第三方客户端、接口变化和账号风控风险。

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

Windows 用户优先选 `win.exe`。macOS 用户按芯片选择 x64 或 arm64 的 dmg。Linux 用户可以优先试 AppImage；Debian/Ubuntu 可以用 deb；Arch/Manjaro 可以用 Arch/pacman 包；也可以使用 zip 免安装包。

## 可以提需求吗？

可以。欢迎在 GitHub 提 issue，最好带上系统版本、安装包类型、网盘类型、复现步骤和截图。

## 评论区简短回复模板

### 对 Linux 用户

感谢反馈。Linux 这块我也很重视，目前有 AppImage/deb/Arch-pacman/zip 和多架构包。如果你方便的话，可以说一下发行版、架构和使用哪个安装包，后面我会优先看 Linux/NAS 场景的问题。

### 对安全质疑

这个担心很正常。项目是免费开源的，代码可以审查；README 里也写了免责声明。它不承诺规避平台风控，也不建议滥用。欢迎从源码和网络行为角度帮忙一起 review。

### 对网盘支持问题

目前支持阿里云盘、百度网盘、123 网盘、115 网盘、PikPak、OneDrive、Box、Dropbox、WebDAV 和本地文件夹。如果你有其他网盘需求，可以提 issue，我会看是否适合通过官方接口或 WebDAV 支持。

### 对功能建议

感谢建议，这类反馈很有价值。可以的话请在 GitHub issue 里补一下使用场景、系统、网盘类型和你期望的交互方式，我会集中整理。
