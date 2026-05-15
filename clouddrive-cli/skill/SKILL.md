---
name: clouddrive-cli
description: |
  Run clouddrive-cli commands to manage cloud storage accounts and files.
  Use when the user asks to list accounts, login to a cloud drive, list files,
  rename media files, or run any clouddrive-cli subcommand.
  Triggered by: "run clouddrive-cli", "list accounts", "cli auth list",
  "login aliyun", "list files", "/clouddrive-cli", "/bpcli".
allowed-tools:
  - Bash
  - Read
---

# Skill: clouddrive-cli

A CLI tool for managing multiple cloud storage accounts (阿里云盘, OneDrive, Dropbox, Box, 123网盘, 115网盘, 百度网盘, PikPak).

## CLI Location

```bash
which clouddrive-cli 2>/dev/null || echo ~/.local/bin/clouddrive-cli
```

If not found, remind the user to install via the app's "账户设置 → 安装命令行工具".

## Common Workflows

### 1. List all accounts
```bash
clouddrive-cli auth list
```

### 2. Login to a cloud drive
```bash
clouddrive-cli auth login aliyun
clouddrive-cli auth login onedrive
clouddrive-cli auth login dropbox
clouddrive-cli auth login box
```
- `aliyun` and `115` use QR code in terminal
- Others open browser OAuth flow

### 3. List files
```bash
clouddrive-cli files list --provider aliyun --json
clouddrive-cli files walk --provider aliyun --path root --json
```

### 4. Generate media rename plan
```bash
clouddrive-cli media rename-plan --input files.json --output plan.json
```

### 5. Apply rename plan
```bash
clouddrive-cli files rename-apply plan.json --dry-run
clouddrive-cli files rename-apply plan.json
```

### 6. Show operation history
```bash
clouddrive-cli ops list
clouddrive-cli ops show <op-id>
clouddrive-cli ops undo <op-id> --dry-run
```

### 7. Search files by name
```bash
# Search across any provider by filename keyword
clouddrive-cli files search --name "高章敏 1.pdf" --provider aliyun --json
clouddrive-cli files search --name "movie.mkv" --provider onedrive --json
clouddrive-cli files search --name "report" --provider baidu --limit 50 --json

# Aliyun: use raw query syntax (exact match vs partial match)
clouddrive-cli files search --query 'name = "高章敏1.pdf"' --provider aliyun --json
clouddrive-cli files search --query 'name match "高章敏"' --provider aliyun --json

# Aliyun: search a specific drive (default_drive_id or backup_drive_id)
clouddrive-cli files search --name "foo.pdf" --provider aliyun --drive-id 1822729720 --json
```

All 7 providers support server-side search:
- `aliyun` — `adrive/v3/file/search` with query syntax; supports `--drive-id`
- `onedrive` — Microsoft Graph `/me/drive/root/search`
- `dropbox` — `/files/search_v2`
- `box` — `/2.0/search?content_types=name`
- `baidu` — `/xpan/file?method=search` recursive
- `115` — `/open/ufile/search`
- `pikpak` — files list API with `name contains` filter

### 8. Capabilities
```bash
clouddrive-cli providers capabilities --json
```

### 9. Directory tree (token-efficient alternative to walk)
```bash
# ASCII tree with folder/file counts
clouddrive-cli files tree --provider aliyun --path root --depth 3
clouddrive-cli files tree --provider aliyun --path <folder-id> --depth 5 --json
```
Returns hierarchical node with `totalFiles`, `totalFolders`, `totalSize`, `children`.

### 10. Directory statistics
```bash
clouddrive-cli files stats --provider aliyun --path root --json
clouddrive-cli files stats --provider onedrive --depth 5 --json
```
Returns: total_files, total_dirs, total_size, by_category (video/subtitle/image/audio/archive/other), top_extensions.

### 11. File metadata
```bash
clouddrive-cli files info --file-id <id> --provider aliyun --json
clouddrive-cli files info --file-id <id> --provider aliyun --drive-id <d> --json
```
Returns full FileItem metadata for a single file or folder.

### 12. Create folder
```bash
clouddrive-cli files mkdir --name "Movies" --provider aliyun --json
clouddrive-cli files mkdir --name "Archive" --parent <parent-id> --provider aliyun --json
```

### 13. Move files (plan + apply)
```bash
# Create a move plan JSON (version:1, operation:"move", provider, account_id, items:[...])
# Each item needs: file_id, name, from_parent_file_id, to_parent_file_id
# Dropbox/Baidu also need: from_path, to_folder_path

# Dry-run first
clouddrive-cli files move-apply plan.json --dry-run --json

# Apply
clouddrive-cli files move-apply plan.json --json

# Undo a move operation
clouddrive-cli ops undo <op-id> --dry-run
clouddrive-cli ops undo <op-id>
```

### 14. Trash files (plan + apply)
```bash
# Trash plan JSON (version:1, operation:"trash", provider, account_id, items:[...])
# Each item needs: file_id, name (and path for baidu/dropbox)

# Dry-run (default — safe to run without --apply)
clouddrive-cli files trash-apply plan.json --json

# Actually trash (requires --apply)
clouddrive-cli files trash-apply plan.json --apply --json
```
Note: No undo available for trash operations from CLI.

### 15. Auth check (token validity)
```bash
clouddrive-cli auth check --json
clouddrive-cli auth check --provider aliyun --json
```
Checks token expiry, auto-refreshes if possible. Returns status per account: `valid`, `expired_refreshed`, `expired_unrefreshable`, or `error`.

### 17. Media scan (media recognition report)
```bash
clouddrive-cli media scan --input files.json --json
```
Returns: movies, series (grouped by title), episodes per series, subtitles, season folders, suspected duplicates (same title+season+episode), unrecognized items.

### 18. Media match (per-item TMDB/Jellyfin naming)
```bash
clouddrive-cli media match --input files.json --json
```
For each item: type (movie/episode/subtitle/folder), title, year, season, episode, confidence (high/medium/low/none), jellyfin_name (target filename).

### 19. Media organize plan (rename + move + mkdir in one step)
```bash
clouddrive-cli media organize-plan --input files.json --style jellyfin --output organize-plan.json
clouddrive-cli media organize-plan --input files.json --root <root-folder-id> --provider aliyun --json
```
Returns a combined plan:
- `mkdirs`: ordered list of directories to create (step 1=top-level, step 2=series, step 3=season)
- `renames`: normalized filename changes
- `moves`: files to move with `to_path` (path relative to root)

**AI workflow for apply:**
1. Create each mkdir in step order → collect file_ids
2. Apply renames via `files rename-apply`
3. Apply moves via `files move-apply` (resolve to_path → to_parent_file_id after step 1)

## Execution

When the user asks to run a clouddrive-cli command, execute it with Bash and present the output clearly.

For `auth list`, format the table output for readability.

For JSON output (`--json`), parse and summarize the key information rather than dumping raw JSON — unless the user explicitly wants the raw JSON.

For login commands:
- Inform the user that a QR code will appear in the terminal (aliyun/115)
- Or that a browser will open (other providers)
- Show the command output as-is since it's interactive

## AccountId Format

Provider accountId format (consistent across app and CLI):
- `aliyun_<user_id>` — e.g., `aliyun_25fd55383d5a4bb5a7319ad66c4c7e75`
- `onedrive_<id>`
- `dropbox_<account_id>`
- `box_<id>`
- `cloud123_<uid>`
- `115_<hash>`
- `baidu_<uk>`
- `pikpak_<id>`

## Error Handling

- **"Command not found"**: CLI not installed → `~/.local/bin/clouddrive-cli` path issue or not installed
- **"No account found"**: Need to login or export from app first
- **"Permission denied"**: Check `~/.local/bin/clouddrive-cli` has execute permission
