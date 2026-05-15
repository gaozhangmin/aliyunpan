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
- Keep large outputs bounded: use `files stats`, `files search`, narrower `--path`, or `docs read --max-chars`.
- Avoid raw `--json` output for large `files tree`, `organize analyze`, `organize plan`, and `organize apply --dry-run` results. Use `--summary` for organize commands when possible, or save to `--output` and summarize the file with a local parser.

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
clouddrive-cli files tree --provider aliyun --path root --depth 1
clouddrive-cli files stats --provider aliyun --path root --depth 10 --json
clouddrive-cli files info --provider aliyun --file-id <id> --drive-id <drive-id> --json
clouddrive-cli files search --provider aliyun --name "movie" --limit 50 --json
clouddrive-cli files search --provider aliyun --query 'name match "movie"' --drive-id <drive-id> --json
```

**JSON field names**: `files list`, `files walk`, `files search`, and `files info` return objects with camelCase fields: `fileId`, `parentFileId`, `driveId`, `accountId`, `name`, `type`, `updatedAt`, `createdAt`.

**`files tree` verbosity warning**: even in text mode, `files tree --depth 2` on a large root will list all files inside every depth-2 subfolder, producing hundreds of lines. Use `--depth 1` for root overview, and only increase depth for known small subtrees. Never use `files tree --json` on large directories.

**`files info` requires `--drive-id`** on aliyun: always pass `--drive-id <drive-id>` (get it from `settings show` or from the `driveId` field of any `files list` result).

**`files search --name` on aliyun** uses `name match` (partial fuzzy match) — pass a keyword, not the full filename. On other providers it uses exact full-filename match. To use aliyun's full query syntax directly, use `--query 'name match "..."'` or `--query 'name = "..."'`.

Use `stats` before `walk` when the directory may be large. Use `tree` only with a small depth for a quick visual overview. Use `search` for known name keywords.

Default root paths are provider-specific when `--path` is omitted: `aliyun=root`, `cloud123=0`, `115=0`, `baidu=/`, `pikpak=*`, `dropbox=` (empty string), `onedrive=onedrive_root`, and `box=box_root`. Prefer omitting `--path` for root operations unless you intentionally target a known folder id/path.

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

**`media match` output structure**: each item is `{ fileId, name, match: { type, title, year, season, episode, confidence, jellyfin_name } }`. The media fields are nested under `match`, not at the top level.

**`media scan` output structure**: `{ summary: {...}, movies: [...], series: { "<key>": { title, year, folderFileId, seasons, episode_count, episodes: [{ fileId, name, season, episode }] } }, season_folders, subtitles, suspected_duplicates, unrecognized }`.

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
clouddrive-cli organize analyze --provider aliyun --account default --path <folder-id> --depth 5 --output analysis.json --summary --json
clouddrive-cli organize analyze --input files.json --provider aliyun --account default --path <folder-id> --output analysis.json --json
clouddrive-cli organize plan --analysis analysis.json --rules ./organize-rules.md --output organize-plan.json --summary --json
clouddrive-cli organize apply organize-plan.json --dry-run --summary --json
clouddrive-cli organize apply organize-plan.json --json
```

For full-drive or root-level organization, do not apply the generated plan just because the dry-run succeeds. First summarize action counts by type and destination, sample suspicious moves, and check whether existing folders would be flattened into broad categories such as `Movies` or `TV Shows`. If many episode-like names (`S01E02`, `第7季`, `第12集`, `Ep03`, children's series names, etc.) are planned for `Movies`, treat the plan as unsafe and narrow the scope or add stricter rules.

Organization plans should not delete files, but broad root-level plans can still damage useful structure by moving thousands of files out of meaningful folders. Prefer applying organization in smaller batches: one existing folder, one media series, or one category at a time. Before non-dry-run apply, confirm every action is supported by the provider and that the sampled moves match the user's intent.

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
- Large output: narrow `--path`, lower `--depth`, use `stats`, save plans to files, and summarize locally instead of returning raw JSON.

## Known Provider Limitations

- OneDrive `files search` may intermittently fail with Microsoft Graph `generalException` / HTTP 500. Treat this as provider-side search instability and fall back to `files walk` plus local filtering.
- PikPak `files search --name` is not reliable: the API may ignore the name query and return root items. Use `files walk` plus local filtering for PikPak search tasks.
- Baidu `files info` now handles `filemetas` responses whose metadata appears under either `list` or `info`. If Baidu returns `errno=12`, treat it as an API/token limitation and fall back to `files walk` or `files search` for metadata.
- 115 Open API folder type fields may not map cleanly; some folders can appear as `type: file`, which makes recursive walk/stat counts under-report folders. Confirm folder-ness by trying `files list --path <fileId>` before planning folder operations.
