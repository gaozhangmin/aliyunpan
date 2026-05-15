# clouddrive-cli

Multi-cloud storage CLI with AI-driven media organization.  
Supports 阿里云盘, OneDrive, Dropbox, Box, 百度网盘, 115网盘, PikPak.

中文 | [English](#english)

---

## Install CLI

```bash
npm install -g clouddrive-cli
```

Or install from the BoxPlayer desktop app: **账户设置 → 安装命令行工具**

### Verify

```bash
clouddrive-cli auth list
clouddrive-cli --help
```

---

## Install Claude Code Skill

The skill lets Claude run `clouddrive-cli` commands on your behalf directly in the terminal.

### Method A — npx (recommended)

```bash
npx skills add boxplayer/clouddrive-cli -g
```

This installs the skill to `~/.claude/skills/clouddrive-cli/`.

### Method B — paste to your AI agent

Copy this prompt and paste it to Claude:

> Install the clouddrive-cli Claude Code skill. Read the file at `$(npm root -g)/clouddrive-cli/skill/SKILL.md` and copy it to `~/.claude/skills/clouddrive-cli/SKILL.md`.

---

# BoxPlayer CLI 使用说明

`clouddrive-cli` 是 BoxPlayer 面向终端和 AI Agent 暴露的安全自动化入口。它可以读取 Electron App 导出的已登录网盘账号，列出或递归遍历网盘文件，生成媒体重命名计划，先 dry-run 校验，再执行可追踪、可撤销的批量重命名操作。

适合的场景：

- 让 AI 批量整理网盘中的电影、剧集、动漫文件名。
- 将文件命名规范化为 Jellyfin、Emby、Plex 更容易刮削的格式。
- 在执行写操作前生成计划、检查差异、保留操作日志。
- 读取本地文档，把命名规则、整理要求、媒体库约定提供给 AI 作为上下文。
- 通过 `clouddrive-mcp` 把同一套能力暴露给支持 MCP 的 AI 客户端。

## 安装模式

`clouddrive-cli` 支持两种安装模式。

### 模式 1：跟随 Electron App 安装

安装 BoxPlayer Electron App 后，应用会注册：

- `clouddrive-cli`
- `clouddrive-mcp`

macOS / Linux 默认写入：

```bash
~/.local/bin/clouddrive-cli
~/.local/bin/clouddrive-mcp
```

Windows 默认写入：

```text
%LOCALAPPDATA%\BoxPlayer\bin\clouddrive-cli.cmd
%LOCALAPPDATA%\BoxPlayer\bin\clouddrive-mcp.cmd
```

如果终端提示找不到命令，请重启终端，或确认上述目录已经加入 `PATH`。

这种模式下，Electron App 会把已登录的网盘账号 token 导出到：

```bash
~/.clouddrive-cli/tokens.json
```

因此安装 App 并登录账号后，终端可以直接运行：

```bash
clouddrive-cli auth list --json
clouddrive-cli files list --provider aliyun --account default --path root --json
```

### 模式 2：独立安装 clouddrive-cli

独立模式不依赖 Electron App，适合服务器、CI、自动化环境，或者只想让 AI 使用 CLI 的用户。

从源码构建独立 CLI 包：

```bash
pnpm run build:clouddrive-cli
```

构建产物位于：

```bash
dist/clouddrive-cli-package
```

本机安装：

```bash
npm install -g ./dist/clouddrive-cli-package
clouddrive-cli --help
```

开发时也可以直接 link：

```bash
cd dist/clouddrive-cli-package
npm link
clouddrive-cli --help
```

独立安装后，CLI 同样使用：

```bash
~/.clouddrive-cli
```

它不会自动拥有 Electron App 里的账号，需要通过 `auth login` 或 `auth import-token` 添加账号。

开发环境也可以直接使用脚本入口：

```bash
node scripts/clouddrive-cli.mjs --help
node scripts/clouddrive-mcp.mjs
```

## 配置与账号

CLI 使用独立配置目录：

```bash
~/.clouddrive-cli
```

主要文件：

```text
~/.clouddrive-cli/tokens.json
~/.clouddrive-cli/config.json
~/.clouddrive-cli/operations/
```

Electron App 会把已登录账号导出到 CLI 配置目录。CLI 本身不做交互式网页登录，自动化流程应先查看已可用账号：

```bash
clouddrive-cli auth list --json
```

支持的 provider：

```text
aliyun
pikpak
dropbox
onedrive
box
baidu
115
```

## 通用约定

推荐给 AI Agent 使用 `--json`，这样输出稳定、可解析。

写操作必须采用三步走：

1. 生成或读取计划。
2. 先 `--dry-run` 校验。
3. 用户确认后再执行非 dry-run 操作。

执行成功的写操作会生成 operation id。后续可以用 `ops show` 查看，也可以用 `ops undo --dry-run` 预览撤销计划。

常见退出码：

| 退出码 | 含义 |
| --- | --- |
| `0` | 成功 |
| `1` | 参数或校验错误 |
| `2` | 账号缺失或认证错误 |
| `3` | Provider API 错误 |
| `4` | 部分成功 |
| `5` | 不支持的 provider 或能力 |

## 命令总览

```bash
clouddrive-cli --help
clouddrive-cli help
```

当前命令组：

```text
auth    账号发现与默认账号设置
providers provider 能力矩阵
files   网盘文件读取、递归遍历、重命名执行
media   媒体文件命名计划生成
docs    本地文档读取，给 AI 作为上下文
upload  本地到网盘的上传计划与 dry-run
organize 网盘目录分析、整理计划与 dry-run
ops     操作日志查看与撤销
```

## auth

### auth list

列出所有已经导出到 CLI 的账号。

```bash
clouddrive-cli auth list
clouddrive-cli auth list --json
```

JSON 输出示例：

```json
[
  {
    "provider": "aliyun",
    "accountId": "aliyun_demo",
    "displayName": "Demo",
    "isDefault": true
  }
]
```

注意：输出不会包含 token、refresh token 等敏感字段。

### auth default

设置某个 provider 的默认账号。

```bash
clouddrive-cli auth default <provider> <account-id>
clouddrive-cli auth default aliyun aliyun_demo --json
```

设置默认账号后，后续命令可以用 `--account default` 或省略 `--account`。

### auth import-token

从本地 JSON 文件导入 token。适合服务端部署、迁移、或用户已经从其他安全渠道拿到 token 的场景。

```bash
clouddrive-cli auth import-token \
  --provider aliyun \
  --account aliyun_main \
  --name "Aliyun Main" \
  --token ./aliyun-token.json \
  --default \
  --json
```

`token.json` 会被写入 `~/.clouddrive-cli/tokens.json`。CLI 保存文件时使用私有权限 `0600`。

### auth login

独立 CLI 可以调起浏览器完成 OAuth 登录，并把 token 保存到本地 auth store。

```bash
clouddrive-cli auth
clouddrive-cli auth login aliyun --browser chrome --json
clouddrive-cli auth login dropbox --browser chrome --json
clouddrive-cli auth login box --browser chrome --json
clouddrive-cli auth login 123 --browser chrome --json
clouddrive-cli auth login 115 --json
```

当前支持 `auth login` 的 provider：

```text
aliyun
dropbox
box
123
115
onedrive
```

说明：

- `aliyun` 使用阿里云盘 OpenAPI 扫码登录。CLI 会打开二维码页面，扫码确认后保存账号。
- `115` 使用 115 网盘 device-code 扫码登录。二维码直接渲染在终端里，不会打开浏览器。
- `dropbox`、`box`、`123` 使用浏览器 OAuth + 本地 loopback callback。
- `onedrive` 仍然保留支持，方便需要 Microsoft Graph 的独立 CLI 用户。

#### 终端里的 CLI 能被正确回调吗？

可以，但前提是 provider 允许你的 redirect URI。实现方式不是让 Chrome 直接唤醒 `clouddrive-cli` 这个命令，而是：

1. `clouddrive-cli auth login <provider>` 启动一个临时本地 HTTP server。
2. CLI 生成 `http://127.0.0.1:<port>/callback` 作为 OAuth redirect URI。
3. CLI 打开 Chrome 或系统默认浏览器。
4. 浏览器登录完成后跳转到本地 callback URL。
5. CLI 从 callback 请求里读取 `code`，再向 provider token endpoint 换取 token。
6. CLI 保存账号到 `~/.clouddrive-cli/tokens.json`，并设置为默认账号。

也就是说，回调命中的是 CLI 当前进程里的本地 loopback server。只要终端进程没有退出、provider 允许该 loopback redirect URI，这条链路就能工作。

如果 provider 后台必须登记固定回调地址，可以固定端口：

```bash
clouddrive-cli auth login dropbox \
  --browser chrome \
  --redirect-uri http://127.0.0.1:53682/callback \
  --json

clouddrive-cli auth login box \
  --browser chrome \
  --redirect-uri http://127.0.0.1:53683/callback \
  --json

clouddrive-cli auth login 123 \
  --browser chrome \
  --redirect-uri http://127.0.0.1:53684/callback \
  --json
```

然后把同一个 redirect URI 填到对应 provider 的开发者后台。不要给独立 CLI 配置 `xbyboxplayer-oauth://callback` 这类自定义 scheme；它适合 Electron App，不适合纯终端进程接收回调。独立 CLI 只直接处理 `http://127.0.0.1:<port>/callback` 或 `http://localhost:<port>/callback`。

注意：

- OneDrive 公共客户端通常支持 loopback redirect。
- Dropbox、Box 和 123 云盘可能要求在开发者后台登记 redirect URI；如果使用项目内置 client id 失败，可以用环境变量指定自己的应用：

```bash
export CLOUDDRIVE_DROPBOX_CLIENT_ID=...
export CLOUDDRIVE_DROPBOX_CLIENT_SECRET=...
export CLOUDDRIVE_BOX_CLIENT_ID=...
export CLOUDDRIVE_BOX_CLIENT_SECRET=...
export CLOUDDRIVE_CLOUD123_CLIENT_ID=...
export CLOUDDRIVE_CLOUD123_CLIENT_SECRET=...
export CLOUDDRIVE_ONEDRIVE_CLIENT_ID=...
export CLOUDDRIVE_ALIYUN_CLIENT_ID=...
export CLOUDDRIVE_ALIYUN_CLIENT_SECRET=...
```

## providers

### providers capabilities

列出每个 provider 明确支持的能力。AI Agent 应先读取能力矩阵，再决定是否可以执行上传、移动、建目录等操作。

```bash
clouddrive-cli providers capabilities --json
```

输出示例：

```json
[
  {
    "id": "aliyun",
    "displayName": "Aliyun Drive",
    "capabilities": {
      "batchRename": true,
      "recursiveWalk": true,
      "mkdir": false,
      "move": false,
      "uploadFile": false
    }
  }
]
```

`uploadFile: false` 表示当前 CLI 已支持上传计划与 dry-run，但该 provider 的真实字节上传适配器尚未开启。

## files

### files list

列出网盘目录中的文件。

```bash
clouddrive-cli files list \
  --provider aliyun \
  --account default \
  --path root \
  --json
```

参数：

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--provider <p>` | 否 | `aliyun` | provider id |
| `--account <id>` | 否 | `default` | 账号 id 或 `default` |
| `--path <p>` | 否 | `root` | 父目录 file id |
| `--drive-id <d>` | 否 | 账号默认 drive | drive id |
| `--json` | 否 | 关闭 | 输出 JSON |

### files walk

递归遍历网盘目录树。

```bash
clouddrive-cli files walk \
  --provider aliyun \
  --account default \
  --path <folder-file-id> \
  --json
```

`files walk` 适合给 AI 做全目录分析，但输出可能很大。处理大型目录时，建议先从较小目录开始。

省略 `--path` 时，CLI 会按 provider 自动选择根目录：`aliyun=root`、`cloud123=0`、`115=0`、`baidu=/`、`pikpak=*`、`dropbox=` 空字符串、`onedrive=onedrive_root`、`box=box_root`。

### files rename-apply

校验或执行重命名计划。

```bash
clouddrive-cli files rename-apply rename-plan.json \
  --current current-files.json \
  --dry-run \
  --json
```

执行真实重命名：

```bash
clouddrive-cli files rename-apply rename-plan.json \
  --current current-files.json \
  --json
```

参数：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `<plan.json>` | 是 | 重命名计划文件 |
| `--current <file>` | 否 | 当前文件列表，用于 dry-run 校验旧文件名 |
| `--dry-run` | 否 | 只校验，不写入云盘 |
| `--json` | 否 | 输出 JSON |

AI Agent 默认必须先运行 dry-run。只有用户明确批准后，才执行不带 `--dry-run` 的命令。

## media

### media rename-plan

根据文件列表生成媒体重命名计划。

```bash
clouddrive-cli media rename-plan \
  --input files.json \
  --provider aliyun \
  --account default \
  --style jellyfin \
  --output rename-plan.json
```

直接输出 JSON：

```bash
clouddrive-cli media rename-plan \
  --input files.json \
  --provider aliyun \
  --account default \
  --style jellyfin \
  --json
```

参数：

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--input <files.json>` | 是 | 无 | 文件列表 JSON，通常来自 `files list` 或 `files walk` |
| `--provider <p>` | 否 | `aliyun` | 写入计划中的 provider |
| `--account <id>` | 否 | `default` | 写入计划中的账号 |
| `--style <style>` | 否 | `jellyfin` | 命名风格，当前主要面向 Jellyfin 兼容格式 |
| `--output <plan.json>` | 否 | 无 | 保存计划到文件 |
| `--json` | 否 | 关闭 | 输出 JSON |

典型流程：

```bash
clouddrive-cli files walk --provider aliyun --account default --path <folder-id> --json > files.json
clouddrive-cli media rename-plan --input files.json --provider aliyun --account default --output rename-plan.json
clouddrive-cli files rename-apply rename-plan.json --current files.json --dry-run --json
```

## docs

### docs read

读取本地文档，作为 AI 上下文。

```bash
clouddrive-cli docs read ./rename-rules.md --json
clouddrive-cli docs read ./rename-rules.md --max-chars 50000 --json
clouddrive-cli docs read ./rename-rules.md --max-chars 2000
```

参数：

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `<path>` | 是 | 无 | 本地文档路径 |
| `--max-chars <n>` | 否 | `20000` | 最多返回字符数 |
| `--json` | 否 | 关闭 | 输出包含元数据的 JSON |

JSON 输出示例：

```json
{
  "path": "/Users/me/project/rename-rules.md",
  "format": "markdown",
  "chars": 1200,
  "truncated": false,
  "content": "# 命名规则\n..."
}
```

格式识别基于扩展名：

| 扩展名 | format |
| --- | --- |
| `.md`, `.markdown` | `markdown` |
| `.txt`, `.text` | `text` |
| `.json` | `json` |
| `.csv` | `csv` |
| `.log` | `log` |
| 其他扩展名 | 去掉点号后的扩展名 |
| 无扩展名 | `text` |

当前能力面向 UTF-8 文本文档。PDF、Word、Excel 等二进制文档应先转换为文本或 Markdown。

## upload

### upload plan

递归扫描本地路径，生成上传计划。计划会保留目录结构，并把文件夹放在文件之前，方便后续先建目录再上传文件。

```bash
clouddrive-cli upload plan \
  --local ./Media \
  --provider aliyun \
  --account default \
  --remote-parent root \
  --conflict skip \
  --output upload-plan.json \
  --json
```

参数：

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--local <path>` | 是 | 无 | 本地文件或文件夹路径 |
| `--provider <p>` | 否 | `aliyun` | 目标 provider |
| `--account <id>` | 否 | `default` | 目标账号 |
| `--remote-parent <id>` | 否 | `root` | 目标网盘父目录 file id |
| `--conflict <mode>` | 否 | `skip` | 冲突策略，当前写入计划供后续 adapter 使用 |
| `--output <plan.json>` | 否 | 无 | 保存上传计划 |
| `--json` | 否 | 关闭 | 输出 JSON |

### upload apply

校验上传计划。第一版已支持完整 dry-run 汇总；真实上传会在 provider `uploadFile` 能力开启后执行。

```bash
clouddrive-cli upload apply upload-plan.json --dry-run --json
```

dry-run 输出包含：

```json
{
  "ok": true,
  "fileCount": 12,
  "folderCount": 3,
  "totalBytes": 987654321,
  "errors": []
}
```

非 dry-run：

```bash
clouddrive-cli upload apply upload-plan.json --json
```

如果 provider 尚未支持 CLI 上传，会返回退出码 `5`，不会写入云盘。

## organize

### organize analyze

分析网盘文件导出，生成适合 AI 理解的目录摘要。

从已有 `files walk` 结果分析：

```bash
clouddrive-cli organize analyze \
  --input files.json \
  --provider aliyun \
  --account default \
  --path root \
  --output analysis.json \
  --json
```

也可以直接让 CLI 遍历网盘：

```bash
clouddrive-cli organize analyze \
  --provider aliyun \
  --account default \
  --path <folder-id> \
  --depth 5 \
  --output analysis.json \
  --summary \
  --json
```

`--summary` 会把完整分析写入 `--output`，终端只输出适合 AI 快速判断的统计摘要。

### organize plan

根据分析结果和可选规则文档生成整理计划。

```bash
clouddrive-cli organize plan \
  --analysis analysis.json \
  --rules ./organize-rules.md \
  --output organize-plan.json \
  --summary \
  --json
```

当前内置保守规则：

- 视频文件按文件名判断电影或剧集。
- 剧集类文件建议移动到 `TV Shows`。
- 电影类文件建议移动到 `Movies`。
- 缺少 `Movies` 或 `TV Shows` 时生成 `mkdir` 动作。
- 不生成删除动作。

### organize apply

校验整理计划。

```bash
clouddrive-cli organize apply organize-plan.json --dry-run --summary --json
```

dry-run 输出会统计动作数量：

```json
{
  "ok": true,
  "actionCount": 3,
  "counts": {
    "mkdir": 1,
    "move": 2,
    "rename": 0,
    "copy": 0,
    "trash": 0
  }
}
```

不带 `--summary` 时会输出完整动作列表，适合小计划或需要人工逐项审查的场景。全盘整理时建议始终先用 `--summary`，再抽样检查完整计划文件。

非 dry-run 只有在 provider 明确支持计划中的所有动作时才会继续。当前 provider 的 `mkdir` / `move` 能力尚未开启，因此默认只适合生成计划和 dry-run。

## ops

### ops list

列出历史操作日志。

```bash
clouddrive-cli ops list
clouddrive-cli ops list --json
```

### ops show

查看某次操作详情。

```bash
clouddrive-cli ops show <operation-id>
clouddrive-cli ops show <operation-id> --json
```

### ops undo

生成或执行某次重命名操作的反向计划。

先 dry-run：

```bash
clouddrive-cli ops undo <operation-id> --dry-run --json
```

用户确认后执行撤销：

```bash
clouddrive-cli ops undo <operation-id> --json
```

撤销本身也会生成新的操作日志。

## AI Agent 推荐工作流

### 读取规则并整理媒体目录

```bash
clouddrive-cli docs read ./rename-rules.md --json
clouddrive-cli auth list --json
clouddrive-cli files walk --provider aliyun --account default --path <folder-id> --json > files.json
clouddrive-cli media rename-plan --input files.json --provider aliyun --account default --style jellyfin --output rename-plan.json
clouddrive-cli files rename-apply rename-plan.json --current files.json --dry-run --json
```

在 dry-run 结果中确认：

- `ok` 是否为 `true`。
- 是否有重名冲突。
- 是否有非法文件名。
- `old_name` 到 `new_name` 是否符合用户要求。

确认无误后：

```bash
clouddrive-cli files rename-apply rename-plan.json --current files.json --json
```

保存返回的 `operationId`。

### 上传本地目录到网盘

```bash
clouddrive-cli providers capabilities --json
clouddrive-cli upload plan --local ./Media --provider aliyun --account default --remote-parent <folder-id> --output upload-plan.json --json
clouddrive-cli upload apply upload-plan.json --dry-run --json
```

确认 provider 支持 `uploadFile` 且 dry-run 无误后，再执行：

```bash
clouddrive-cli upload apply upload-plan.json --json
```

### AI 分析并整理网盘目录

```bash
clouddrive-cli files walk --provider aliyun --account default --path <folder-id> --json > files.json
clouddrive-cli organize analyze --input files.json --provider aliyun --account default --path <folder-id> --output analysis.json --json
clouddrive-cli organize plan --analysis analysis.json --rules ./organize-rules.md --output organize-plan.json --json
clouddrive-cli organize apply organize-plan.json --dry-run --json
```

整理计划默认不会删除文件。非 dry-run 执行前，必须确认 provider 能力矩阵支持计划中的所有动作。

### 回滚一次重命名

```bash
clouddrive-cli ops show <operation-id> --json
clouddrive-cli ops undo <operation-id> --dry-run --json
clouddrive-cli ops undo <operation-id> --json
```

## MCP

`clouddrive-mcp` 是可选的 MCP Server，它把部分 CLI 能力包装成结构化工具，方便 Claude Desktop、Cursor、Windsurf 等支持 MCP 的客户端调用。

启动：

```bash
clouddrive-mcp
```

当前工具：

| MCP tool | 对应能力 |
| --- | --- |
| `auth_list` | `clouddrive-cli auth list --json` |
| `files_list` | `clouddrive-cli files list ... --json` |
| `files_walk` | `clouddrive-cli files walk ... --json` |
| `media_rename_plan` | 生成媒体重命名计划 |
| `files_rename_apply` | dry-run 或执行重命名计划 |
| `ops_list` | `clouddrive-cli ops list --json` |
| `ops_show` | `clouddrive-cli ops show ... --json` |
| `ops_undo` | dry-run 或执行撤销 |

CLI 是主入口，MCP 是集成层。实现和安全模型应保持一致：先计划、先 dry-run、再执行、可撤销。

当前 `upload` 和 `organize` 新命令已先进入 CLI；MCP 工具应在命令稳定后再按同一安全模型补齐。

## Skills

`skills/clouddrive-cli/SKILL.md` 是给 AI Agent 的使用说明。它不执行任何代码，而是告诉 Agent 应该怎样安全地调用 CLI 或 MCP。

推荐组合：

```text
clouddrive-cli   稳定命令行边界
clouddrive-mcp   可选结构化工具接口
skills          AI 使用手册和安全规则
```

## 故障排查

### 命令不存在

确认安装目录在 `PATH` 中：

```bash
echo "$PATH"
which clouddrive-cli
```

macOS / Linux 可以临时执行：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### 没有账号

先打开 BoxPlayer Electron App 登录网盘账号，再导出或刷新 CLI 账号配置，然后运行：

```bash
clouddrive-cli auth list --json
```

### Provider 不支持某能力

不同 provider 的能力可能不同。先运行：

```bash
clouddrive-cli providers capabilities --json
```

遇到 `does not support batch rename`、`does not support CLI upload yet` 或退出码 `5`，说明当前 provider 暂不支持该写操作。

### 输出过大

`files walk` 可能返回大量文件。建议缩小 `--path` 范围，或让 AI 分批处理目录。

`docs read` 可用 `--max-chars` 控制上下文长度。



---

<a id="english"></a>

# clouddrive-cli

Multi-cloud storage CLI with AI-driven media organization.  
Supports Aliyun Drive, OneDrive, Dropbox, Box, Baidu Netdisk, 115 Drive, PikPak.

[中文](#readme) | English


---

## Install CLI

```bash
npm install -g clouddrive-cli
```

Or install from the BoxPlayer desktop app: **Account Settings → Install CLI**

### Verify

```bash
clouddrive-cli auth list
clouddrive-cli --help
```

---

## Install Claude Code Skill

The skill lets Claude run `clouddrive-cli` commands on your behalf directly in the terminal.

### Method A — npx (recommended)

```bash
npx skills add boxplayer/clouddrive-cli -g
```

This installs the skill to `~/.claude/skills/clouddrive-cli/`.

### Method B — paste to your AI agent

Copy this prompt and paste it to Claude:

> Install the clouddrive-cli Claude Code skill. Read the file at `$(npm root -g)/clouddrive-cli/skill/SKILL.md` and copy it to `~/.claude/skills/clouddrive-cli/SKILL.md`.

---

## Overview

`clouddrive-cli` is the secure automation interface BoxPlayer exposes for terminals and AI Agents. It reads cloud drive accounts exported by the Electron App, lists or recursively walks drive files, generates media rename plans, validates them with dry-run, and then executes trackable, reversible batch rename operations.

Typical use cases:

- Let an AI batch-organize movies, series, and anime filenames on cloud drives.
- Normalize file names into formats that Jellyfin, Emby, and Plex can scrape more easily.
- Generate a plan, review the diff, and keep an operation log before any write operation.
- Read local documents and provide naming rules, organization requirements, and media library conventions to the AI as context.
- Expose the same capabilities to MCP-compatible AI clients via `clouddrive-mcp`.

## Installation Modes

`clouddrive-cli` supports two installation modes.

### Mode 1: Installed with the Electron App

After installing the BoxPlayer Electron App, the application registers:

- `clouddrive-cli`
- `clouddrive-mcp`

macOS / Linux default paths:

```bash
~/.local/bin/clouddrive-cli
~/.local/bin/clouddrive-mcp
```

Windows default paths:

```text
%LOCALAPPDATA%\BoxPlayer\bin\clouddrive-cli.cmd
%LOCALAPPDATA%\BoxPlayer\bin\clouddrive-mcp.cmd
```

If the terminal reports a command not found, restart the terminal or confirm that the directory above is in your `PATH`.

In this mode, the Electron App exports logged-in account tokens to:

```bash
~/.clouddrive-cli/tokens.json
```

After installing the App and logging in, you can run directly in the terminal:

```bash
clouddrive-cli auth list --json
clouddrive-cli files list --provider aliyun --account default --path root --json
```

### Mode 2: Standalone Installation

Standalone mode does not depend on the Electron App. It is suitable for servers, CI, automation environments, or users who only want the AI to use the CLI.

Build the standalone CLI package from source:

```bash
pnpm run build:clouddrive-cli
```

The build output is at:

```bash
dist/clouddrive-cli-package
```

Install locally:

```bash
npm install -g ./dist/clouddrive-cli-package
clouddrive-cli --help
```

Or link during development:

```bash
cd dist/clouddrive-cli-package
npm link
clouddrive-cli --help
```

After a standalone installation, the CLI still uses:

```bash
~/.clouddrive-cli
```

It will not automatically have the accounts from the Electron App. Use `auth login` or `auth import-token` to add accounts.

In development you can also use the script entry point directly:

```bash
node scripts/clouddrive-cli.mjs --help
node scripts/clouddrive-mcp.mjs
```

## Configuration and Accounts

The CLI uses an independent configuration directory:

```bash
~/.clouddrive-cli
```

Key files:

```text
~/.clouddrive-cli/tokens.json
~/.clouddrive-cli/config.json
~/.clouddrive-cli/operations/
```

The Electron App exports logged-in accounts to the CLI config directory. The CLI itself does not perform interactive web login. Automation flows should first check available accounts:

```bash
clouddrive-cli auth list --json
```

Supported providers:

```text
aliyun
pikpak
dropbox
onedrive
box
baidu
115
```

## General Conventions

Use `--json` for AI Agent output — it is stable and parseable.

Write operations must follow three steps:

1. Generate or read the plan.
2. Validate with `--dry-run` first.
3. Execute the non-dry-run operation only after user confirmation.

Successful write operations generate an operation ID. Use `ops show` to view it later, and `ops undo --dry-run` to preview the undo plan.

Common exit codes:

| Exit code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Argument or validation error |
| `2` | Missing account or authentication error |
| `3` | Provider API error |
| `4` | Partial success |
| `5` | Unsupported provider or capability |

## Command Overview

```bash
clouddrive-cli --help
clouddrive-cli help
```

Current command groups:

```text
auth        Account discovery and default account settings
providers   Provider capability matrix
files       Cloud drive file reading, recursive walking, rename execution
media       Media file rename plan generation
docs        Read local documents for AI context
upload      Upload plan from local to cloud and dry-run
organize    Cloud drive directory analysis, organization plan, and dry-run
ops         Operation log viewing and undo
```

## auth

### auth list

List all accounts exported to the CLI.

```bash
clouddrive-cli auth list
clouddrive-cli auth list --json
```

JSON output example:

```json
[
  {
    "provider": "aliyun",
    "accountId": "aliyun_demo",
    "displayName": "Demo",
    "isDefault": true
  }
]
```

Note: output does not include tokens, refresh tokens, or other sensitive fields.

### auth default

Set the default account for a provider.

```bash
clouddrive-cli auth default <provider> <account-id>
clouddrive-cli auth default aliyun aliyun_demo --json
```

After setting a default account, subsequent commands can use `--account default` or omit `--account`.

### auth import-token

Import a token from a local JSON file. Suitable for server deployments, migrations, or users who already have a token from another secure source.

```bash
clouddrive-cli auth import-token \
  --provider aliyun \
  --account aliyun_main \
  --name "Aliyun Main" \
  --token ./aliyun-token.json \
  --default \
  --json
```

`token.json` is written to `~/.clouddrive-cli/tokens.json`. The CLI saves the file with private permissions `0600`.

### auth login

The standalone CLI can launch a browser to complete OAuth login and save the token locally.

```bash
clouddrive-cli auth login aliyun --browser chrome --json
clouddrive-cli auth login dropbox --browser chrome --json
clouddrive-cli auth login box --browser chrome --json
clouddrive-cli auth login 123 --browser chrome --json
clouddrive-cli auth login 115 --json
```

Providers supporting `auth login`:

```text
aliyun
dropbox
box
123
115
onedrive
```

Notes:

- `aliyun` uses Aliyun Drive OpenAPI QR code login. The CLI opens a QR code page; scan to confirm and the account is saved.
- `115` uses a device-code QR login. The QR code is rendered directly in the terminal — no browser is opened.
- `dropbox`, `box`, and `123` use browser OAuth with a local loopback callback.
- `onedrive` is supported for standalone CLI users who need Microsoft Graph.

The callback works by starting a temporary local HTTP server. The CLI generates `http://127.0.0.1:<port>/callback` as the OAuth redirect URI, opens the browser, reads the `code` from the callback, exchanges it for a token, and saves the account to `~/.clouddrive-cli/tokens.json`.

If the provider requires a fixed redirect URI, use a fixed port:

```bash
clouddrive-cli auth login dropbox \
  --browser chrome \
  --redirect-uri http://127.0.0.1:53682/callback \
  --json
```

You can override the built-in client credentials with environment variables:

```bash
export CLOUDDRIVE_DROPBOX_CLIENT_ID=...
export CLOUDDRIVE_DROPBOX_CLIENT_SECRET=...
export CLOUDDRIVE_BOX_CLIENT_ID=...
export CLOUDDRIVE_BOX_CLIENT_SECRET=...
export CLOUDDRIVE_CLOUD123_CLIENT_ID=...
export CLOUDDRIVE_CLOUD123_CLIENT_SECRET=...
export CLOUDDRIVE_ONEDRIVE_CLIENT_ID=...
export CLOUDDRIVE_ALIYUN_CLIENT_ID=...
export CLOUDDRIVE_ALIYUN_CLIENT_SECRET=...
```

## providers

### providers capabilities

List the capabilities explicitly supported by each provider. AI Agents should read the capability matrix before deciding whether to execute upload, move, or mkdir operations.

```bash
clouddrive-cli providers capabilities --json
```

Output example:

```json
[
  {
    "id": "aliyun",
    "displayName": "Aliyun Drive",
    "capabilities": {
      "batchRename": true,
      "recursiveWalk": true,
      "mkdir": false,
      "move": false,
      "uploadFile": false
    }
  }
]
```

`uploadFile: false` means the CLI supports upload planning and dry-run, but the real byte-upload adapter for this provider is not yet enabled.

## files

### files list

List files in a cloud drive directory.

```bash
clouddrive-cli files list \
  --provider aliyun \
  --account default \
  --path root \
  --json
```

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `--provider <p>` | No | `aliyun` | Provider ID |
| `--account <id>` | No | `default` | Account ID or `default` |
| `--path <p>` | No | `root` | Parent directory file ID |
| `--drive-id <d>` | No | account default drive | Drive ID |
| `--json` | No | off | JSON output |

### files walk

Recursively walk the cloud drive directory tree.

```bash
clouddrive-cli files walk \
  --provider aliyun \
  --account default \
  --path <folder-file-id> \
  --json
```

`files walk` is suitable for AI full-directory analysis, but output can be large. For large directories, start with a smaller subdirectory.

When `--path` is omitted, the CLI chooses provider-specific roots automatically: `aliyun=root`, `cloud123=0`, `115=0`, `baidu=/`, `pikpak=*`, `dropbox=` empty string, `onedrive=onedrive_root`, and `box=box_root`.

### files rename-apply

Validate or execute a rename plan.

Dry-run:

```bash
clouddrive-cli files rename-apply rename-plan.json \
  --current current-files.json \
  --dry-run \
  --json
```

Execute real rename:

```bash
clouddrive-cli files rename-apply rename-plan.json \
  --current current-files.json \
  --json
```

| Parameter | Required | Description |
| --- | --- | --- |
| `<plan.json>` | Yes | Rename plan file |
| `--current <file>` | No | Current file list for dry-run old name validation |
| `--dry-run` | No | Validate only, do not write to cloud drive |
| `--json` | No | JSON output |

AI Agents must run dry-run first by default. Only execute without `--dry-run` after explicit user approval.

## media

### media rename-plan

Generate a media rename plan from a file list.

```bash
clouddrive-cli media rename-plan \
  --input files.json \
  --provider aliyun \
  --account default \
  --style jellyfin \
  --output rename-plan.json
```

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `--input <files.json>` | Yes | — | File list JSON, typically from `files list` or `files walk` |
| `--provider <p>` | No | `aliyun` | Provider written into the plan |
| `--account <id>` | No | `default` | Account written into the plan |
| `--style <style>` | No | `jellyfin` | Naming style, primarily Jellyfin-compatible format |
| `--output <plan.json>` | No | — | Save plan to file |
| `--json` | No | off | JSON output |

Typical workflow:

```bash
clouddrive-cli files walk --provider aliyun --account default --path <folder-id> --json > files.json
clouddrive-cli media rename-plan --input files.json --provider aliyun --account default --output rename-plan.json
clouddrive-cli files rename-apply rename-plan.json --current files.json --dry-run --json
```

## docs

### docs read

Read a local document as AI context.

```bash
clouddrive-cli docs read ./rename-rules.md --json
clouddrive-cli docs read ./rename-rules.md --max-chars 50000 --json
```

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `<path>` | Yes | — | Local document path |
| `--max-chars <n>` | No | `20000` | Maximum characters to return |
| `--json` | No | off | Output JSON with metadata |

## upload

### upload plan

Recursively scan a local path and generate an upload plan.

```bash
clouddrive-cli upload plan \
  --local ./Media \
  --provider aliyun \
  --account default \
  --remote-parent root \
  --conflict skip \
  --output upload-plan.json \
  --json
```

### upload apply

Validate or execute an upload plan.

```bash
clouddrive-cli upload apply upload-plan.json --dry-run --json
```

Dry-run output:

```json
{
  "ok": true,
  "fileCount": 12,
  "folderCount": 3,
  "totalBytes": 987654321,
  "errors": []
}
```

If the provider does not yet support CLI upload, exit code `5` is returned and nothing is written.

## organize

### organize analyze

Analyze a cloud drive file export and generate a directory summary suitable for AI understanding.

```bash
clouddrive-cli organize analyze \
  --input files.json \
  --provider aliyun \
  --account default \
  --path root \
  --output analysis.json \
  --summary \
  --json
```

### organize plan

Generate an organization plan from analysis results and an optional rules document.

```bash
clouddrive-cli organize plan \
  --analysis analysis.json \
  --rules ./organize-rules.md \
  --output organize-plan.json \
  --summary \
  --json
```

Built-in conservative rules: classify video files as movies or episodes by filename; suggest moving episodes to `TV Shows` and movies to `Movies`; generate `mkdir` actions when those folders are missing; never generate delete actions.

### organize apply

Validate an organization plan.

```bash
clouddrive-cli organize apply organize-plan.json --dry-run --summary --json
```

Use `--summary` for large plans so stdout contains counts and destination distribution rather than the full action list. Inspect the saved plan file before applying broad root-level organization.

## ops

### ops list

List operation history.

```bash
clouddrive-cli ops list --json
```

### ops show

View details of an operation.

```bash
clouddrive-cli ops show <operation-id> --json
```

### ops undo

Generate or execute the reverse plan for a rename operation.

Dry-run first:

```bash
clouddrive-cli ops undo <operation-id> --dry-run --json
```

Execute after user confirmation:

```bash
clouddrive-cli ops undo <operation-id> --json
```

## AI Agent Recommended Workflows

### Read rules and organize a media directory

```bash
clouddrive-cli docs read ./rename-rules.md --json
clouddrive-cli auth list --json
clouddrive-cli files walk --provider aliyun --account default --path <folder-id> --json > files.json
clouddrive-cli media rename-plan --input files.json --provider aliyun --account default --style jellyfin --output rename-plan.json
clouddrive-cli files rename-apply rename-plan.json --current files.json --dry-run --json
```

Verify the dry-run: `ok` is `true`, no name conflicts, no illegal filenames, `old_name` → `new_name` matches user intent. Then execute:

```bash
clouddrive-cli files rename-apply rename-plan.json --current files.json --json
```

Save the returned `operationId`.

### Upload a local directory to the cloud

```bash
clouddrive-cli providers capabilities --json
clouddrive-cli upload plan --local ./Media --provider aliyun --account default --remote-parent <folder-id> --output upload-plan.json --json
clouddrive-cli upload apply upload-plan.json --dry-run --json
```

Confirm the provider supports `uploadFile` and the dry-run is clean, then execute:

```bash
clouddrive-cli upload apply upload-plan.json --json
```

### AI analyze and organize a cloud drive directory

```bash
clouddrive-cli files walk --provider aliyun --account default --path <folder-id> --json > files.json
clouddrive-cli organize analyze --input files.json --provider aliyun --account default --path <folder-id> --output analysis.json --summary --json
clouddrive-cli organize plan --analysis analysis.json --rules ./organize-rules.md --output organize-plan.json --summary --json
clouddrive-cli organize apply organize-plan.json --dry-run --summary --json
```

Organization plans never delete files. Before non-dry-run execution, confirm the provider capability matrix supports all actions in the plan and inspect sampled moves from the saved plan file.

### Roll back a rename operation

```bash
clouddrive-cli ops show <operation-id> --json
clouddrive-cli ops undo <operation-id> --dry-run --json
clouddrive-cli ops undo <operation-id> --json
```

## MCP

`clouddrive-mcp` is an optional MCP Server that wraps some CLI capabilities as structured tools for MCP-compatible clients such as Claude Desktop, Cursor, and Windsurf.

Start:

```bash
clouddrive-mcp
```

Current tools:

| MCP tool | Corresponding capability |
| --- | --- |
| `auth_list` | `clouddrive-cli auth list --json` |
| `files_list` | `clouddrive-cli files list ... --json` |
| `files_walk` | `clouddrive-cli files walk ... --json` |
| `media_rename_plan` | Generate media rename plan |
| `files_rename_apply` | Dry-run or execute rename plan |
| `ops_list` | `clouddrive-cli ops list --json` |
| `ops_show` | `clouddrive-cli ops show ... --json` |
| `ops_undo` | Dry-run or execute undo |

The CLI is the primary interface; MCP is the integration layer. The implementation and safety model should remain consistent: plan first, dry-run first, execute, undo-able.

## Skills

`skills/clouddrive-cli/SKILL.md` is the usage guide for AI Agents. It does not execute any code; it tells the Agent how to safely call the CLI or MCP.

Recommended combination:

```text
clouddrive-cli   stable CLI boundary
clouddrive-mcp   optional structured tool interface
skills          AI usage guide and safety rules
```

## Troubleshooting

### Command not found

Confirm the install directory is in `PATH`:

```bash
echo "$PATH"
which clouddrive-cli
```

Temporarily add it on macOS / Linux:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### No accounts

Open the BoxPlayer Electron App, log in to a cloud drive account, then export or refresh the CLI account config and run:

```bash
clouddrive-cli auth list --json
```

### Provider does not support a capability

Run first:

```bash
clouddrive-cli providers capabilities --json
```

If you see `does not support batch rename`, `does not support CLI upload yet`, or exit code `5`, the current provider does not support that write operation yet.

### Output too large

`files walk` may return a large number of files. Narrow the `--path` scope or have the AI process directories in batches.

`docs read` supports `--max-chars` to control context length.
