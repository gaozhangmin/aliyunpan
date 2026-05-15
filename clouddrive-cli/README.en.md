# clouddrive-cli

Multi-cloud storage CLI with AI-driven media organization.  
Supports Aliyun Drive, OneDrive, Dropbox, Box, Baidu Netdisk, 115 Drive, PikPak.

[中文](./README.md) | English

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
clouddrive-cli organize analyze --input files.json --provider aliyun --account default --path <folder-id> --output analysis.json --json
clouddrive-cli organize plan --analysis analysis.json --rules ./organize-rules.md --output organize-plan.json --json
clouddrive-cli organize apply organize-plan.json --dry-run --json
```

Organization plans never delete files. Before non-dry-run execution, confirm the provider capability matrix supports all actions in the plan.

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
