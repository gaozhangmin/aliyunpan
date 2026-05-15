---
name: clouddrive-cli
description: Use when the user asks an AI agent to operate cloud-drive accounts, inspect files, search/list/walk cloud directories, plan or apply media renames, upload planning, directory organization, operation rollback, MCP exposure, or any clouddrive-cli/clouddrive-mcp command.
allowed-tools:
  - Bash
  - Read
---

# clouddrive-cli

Use `clouddrive-cli` as the stable command boundary for AI-driven cloud-drive automation. It supports 阿里云盘, OneDrive, Dropbox, Box, 123网盘, 115网盘, 百度网盘, and PikPak.

## Locate CLI

```bash
which clouddrive-cli 2>/dev/null || echo ~/.local/bin/clouddrive-cli
clouddrive-cli --help
```

If missing, tell the user to install it from the Electron app account settings or with `npm install -g clouddrive-cli`.

## Safety Rules

- Prefer `--json` for agent workflows. Parse and summarize JSON unless the user asks for raw output.
- Before any write operation, run the dry-run form first and show the planned changes.
- Check `clouddrive-cli providers capabilities --json` before mkdir, move, rename, trash, upload, or organize apply.
- Never invent file IDs. Get them from `files list`, `files walk`, `files search`, `files tree`, or `files info`.
- Keep large outputs bounded: use `files tree`, `files stats`, `files search`, narrower `--path`, or `docs read --max-chars`.

## Auth

```bash
clouddrive-cli auth
clouddrive-cli auth list --json
clouddrive-cli auth default <provider> <account-id>
clouddrive-cli auth import-token --provider <p> --account <id> --token <token.json> --default --json
clouddrive-cli auth login aliyun --json
clouddrive-cli auth login 115 --json
clouddrive-cli auth login dropbox --browser chrome --json
clouddrive-cli auth login box --browser chrome --json
clouddrive-cli auth login 123 --browser chrome --json
clouddrive-cli auth check --json
clouddrive-cli auth check --provider aliyun --json
```

Login behavior:
- `aliyun` and `115` show QR codes in the terminal.
- `dropbox`, `box`, `123`, and `onedrive` use browser OAuth loopback; if callback URIs are restricted, pass `--redirect-uri http://127.0.0.1:<port>/callback`.

Account IDs normally look like `aliyun_<id>`, `onedrive_<id>`, `dropbox_<id>`, `box_<id>`, `cloud123_<uid>`, `115_<hash>`, `baidu_<uk>`, or `pikpak_<id>`.

## Settings And Capabilities

```bash
clouddrive-cli settings show --json
clouddrive-cli providers capabilities --json
```

`settings show` summarizes config directory, accounts by provider, defaults, and supported providers. `providers capabilities` is the source of truth for whether a provider supports search, mkdir, move, rename, trash/delete, upload, recursive walk, path addressing, or file-id addressing.

## File Read Operations

```bash
clouddrive-cli files list --provider aliyun --account default --path root --json
clouddrive-cli files walk --provider aliyun --account default --path <folder-id> --json
clouddrive-cli files tree --provider aliyun --path root --depth 3 --json
clouddrive-cli files stats --provider aliyun --path root --depth 10 --json
clouddrive-cli files info --provider aliyun --file-id <id> --json
clouddrive-cli files search --provider aliyun --name "movie.mkv" --limit 50 --json
clouddrive-cli files search --provider aliyun --query 'name match "movie"' --drive-id <drive-id> --json
```

Use `tree` or `stats` before `walk` when the directory may be large. Use `search` for known names. Aliyun accepts raw `--query`; other providers generally use `--name`.

## File Write Operations

Create folders:

```bash
clouddrive-cli files mkdir --provider aliyun --parent <parent-id> --name "Movies" --json
```

Apply rename plans:

```bash
clouddrive-cli files rename-apply rename-plan.json --current files.json --dry-run --json
clouddrive-cli files rename-apply rename-plan.json --current files.json --json
```

Apply move plans:

```bash
clouddrive-cli files move-apply move-plan.json --dry-run --json
clouddrive-cli files move-apply move-plan.json --json
```

Apply trash plans:

```bash
clouddrive-cli files trash-apply trash-plan.json --json
clouddrive-cli files trash-apply trash-plan.json --apply --json
```

Notes:
- `trash-apply` defaults to dry-run; execution requires `--apply`.
- `ops undo` supports rename and move operations. Trash operations do not have CLI undo.
- Dropbox/Baidu move/trash plans may require path fields in addition to file IDs.

## Media Workflows

```bash
clouddrive-cli media scan --input files.json --json
clouddrive-cli media match --input files.json --json
clouddrive-cli media rename-plan --input files.json --provider aliyun --account default --style jellyfin --output rename-plan.json
clouddrive-cli media organize-plan --input files.json --root <root-folder-id> --provider aliyun --style jellyfin --output media-organize-plan.json --json
```

Recommended rename sequence:

```bash
clouddrive-cli files walk --provider aliyun --account default --path <folder-id> --json > files.json
clouddrive-cli media rename-plan --input files.json --provider aliyun --account default --output rename-plan.json
clouddrive-cli files rename-apply rename-plan.json --current files.json --dry-run --json
clouddrive-cli files rename-apply rename-plan.json --current files.json --json
```

`media organize-plan` returns mkdir, rename, and move actions. Apply it in stages: create folders, apply rename plan, resolve destination IDs, then apply move plan.

## Docs, Upload, And Directory Organization

Read local context documents:

```bash
clouddrive-cli docs read ./rules.md --max-chars 50000 --json
```

Upload planning:

```bash
clouddrive-cli upload plan --local ./Media --provider aliyun --account default --remote-parent <folder-id> --output upload-plan.json --json
clouddrive-cli upload apply upload-plan.json --dry-run --json
clouddrive-cli upload apply upload-plan.json --json
```

Only run non-dry-run upload if `providers capabilities` reports `uploadFile: true`; otherwise expect exit code `5`.

Cloud directory organization:

```bash
clouddrive-cli organize analyze --provider aliyun --account default --path <folder-id> --depth 5 --output analysis.json --json
clouddrive-cli organize analyze --input files.json --provider aliyun --account default --path <folder-id> --output analysis.json --json
clouddrive-cli organize plan --analysis analysis.json --rules ./organize-rules.md --output organize-plan.json --json
clouddrive-cli organize apply organize-plan.json --dry-run --json
clouddrive-cli organize apply organize-plan.json --json
```

Organization plans are conservative and should not delete files. Before non-dry-run apply, confirm every action is supported by the provider.

## Operation History And Rollback

```bash
clouddrive-cli ops list --json
clouddrive-cli ops show <operation-id> --json
clouddrive-cli ops undo <operation-id> --dry-run --json
clouddrive-cli ops undo <operation-id> --json
```

Use `ops undo --dry-run` before rollback. Operation logs are stored under the CLI config directory.

## MCP

`clouddrive-mcp` exposes a subset of CLI actions as MCP tools:

```bash
clouddrive-mcp
```

Available MCP tools include: `auth_list`, `files_list`, `files_walk`, `files_search`, `files_tree`, `files_stats`, `files_info`, `files_mkdir`, `files_rename_apply`, `files_move_apply`, `files_trash_apply`, `media_rename_plan`, `media_scan`, `media_match`, `media_organize_plan`, `ops_list`, `ops_show`, and `ops_undo`.

Use CLI commands directly when the user asks for upload or organize flows not exposed by MCP.

## Error Handling

- Command not found: verify install path with `which clouddrive-cli`.
- No account found: run `auth list`, `auth login`, `auth import-token`, or `auth default`.
- Exit code `2`: missing/invalid account or auth failure.
- Exit code `5`: provider does not support the requested capability.
- Large output: narrow `--path`, lower `--depth`, use `tree`/`stats`, or request JSON and summarize.
