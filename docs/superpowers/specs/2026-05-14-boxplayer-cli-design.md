# BoxPlayer CLI Design

## Summary

BoxPlayer should expose its cloud-drive capabilities through an independent `clouddrive-cli` that AI agents and humans can call from a shell. The CLI will not depend on a running Electron process. It will own its own configuration and auth store, call cloud provider APIs directly, and share a headless core with future non-UI integrations.

The architecture should be multi-provider from the beginning, while the first production-ready implementation should focus on Aliyun Drive. Other providers can be added behind the same interfaces after the command model and safety rules are stable.

## Goals

- Provide a stable command surface that AI tools such as Codex and Claude Code can call.
- Support multi-provider cloud drives through a common provider interface.
- Start with high-value media organization workflows, especially listing files, generating rename plans, applying batch renames, and undoing recent operations.
- Make write operations safe through dry-run validation, explicit operation logs, and reversible execution where provider APIs allow it.
- Avoid tying the CLI to Electron, Chromium IndexedDB, Pinia stores, browser-only APIs, or renderer UI state.

## Non-Goals

- The first version will not expose every BoxPlayer feature.
- The first version will not implement every provider fully.
- The first version will not require an MCP server. MCP can wrap the CLI or core after the CLI contract stabilizes.
- The CLI will not scrape or automate the Electron UI.
- The CLI will not perform irreversible destructive actions without a separate capability gate.

## Existing Context

The current app already has provider-specific API modules under `src/`, including Aliyun, 115, Baidu, PikPak, Dropbox, OneDrive, and Box integrations. File operations are centralized in places such as `src/aliapi/filecmd.ts`, where `ApiRenameBatch` already delegates to provider-specific rename implementations.

The current app stores user tokens in Dexie/IndexedDB through `src/utils/db.ts` in the `XBY3Database.itoken` table. That is suitable for the Electron renderer, but it is not a good direct dependency for a Node CLI. Some existing API code also depends on UI-facing modules such as Pinia stores, browser APIs, `message`, and debug UI behavior. The CLI therefore needs a headless core rather than direct reuse of renderer-oriented modules.

## Recommended Architecture

```text
packages/boxplayer-core
  auth/
    AuthStore
    TokenRefresher
  providers/
    Provider
    aliyun/
    cloud115/
    baidu/
    pikpak/
    dropbox/
    onedrive/
    box/
  operations/
    list
    walk
    rename
    operation-log
  media/
    rename-plan

packages/clouddrive-cli
  commands/
    auth
    files
    media
    ops
```

`boxplayer-core` owns provider-neutral models, auth abstractions, validation, operation logging, and safety rules. `clouddrive-cli` owns command parsing, terminal output, JSON output, exit codes, and user-facing help.

The existing Electron app may later consume the same core, but that should be a follow-up refactor. The first implementation should avoid destabilizing the current UI app.

## Provider Interface

Each provider adapter should implement a common interface:

```ts
interface DriveProvider {
  id: string
  displayName: string
  capabilities: ProviderCapabilities

  auth: {
    login(input: LoginInput): Promise<Account>
    refresh(accountId: string): Promise<Account>
    listAccounts(): Promise<Account[]>
  }

  files: {
    list(input: ListInput): Promise<FileItem[]>
    walk(input: WalkInput): AsyncIterable<FileItem>
    get(input: GetInput): Promise<FileItem>
    rename(input: RenameInput): Promise<RenameResult>
    renameBatch?(input: RenameBatchInput): Promise<RenameResult[]>
  }
}
```

Provider capabilities must be explicit:

```ts
interface ProviderCapabilities {
  batchRename: boolean
  recursiveWalk: boolean
  serverSideSearch: boolean
  trash: boolean
  permanentDelete: boolean
  share: boolean
  pathAddressable: boolean
  fileIdAddressable: boolean
}
```

The CLI should use capabilities to validate commands before execution and to produce clear errors when a provider does not support a requested operation.

## Provider-Neutral File Model

All provider adapters should map native file models into a common shape:

```ts
interface FileItem {
  provider: string
  accountId: string
  driveId: string
  fileId: string
  parentFileId: string
  path?: string
  name: string
  type: 'file' | 'folder'
  size?: number
  contentHash?: string
  mimeType?: string
  category?: string
  updatedAt?: string
  createdAt?: string
  raw?: unknown
}
```

The common model should preserve enough provider-native data to perform follow-up operations safely, but command outputs should default to stable fields. `raw` should be available only behind an explicit debug or verbose flag.

## Auth And Configuration

The CLI should use its own config directory:

```text
~/.clouddrive-cli/config.json
~/.clouddrive-cli/tokens.json
~/.clouddrive-cli/operations/*.json
```

Token files should be created with owner-only permissions where the platform supports it. A later hardening pass can add OS keychain support.

The CLI should support:

```bash
clouddrive-cli auth login aliyun
clouddrive-cli auth list
clouddrive-cli auth default aliyun <account-id>
clouddrive-cli auth import-electron
```

`auth import-electron` is optional for the MVP. If implemented, it should import or export token data through a deliberate compatibility path instead of relying on fragile Chromium IndexedDB internals. A later Electron UI action could export selected accounts to the CLI auth store.

## CLI Commands

The first command surface should be small and composable:

```bash
clouddrive-cli auth login <provider>
clouddrive-cli auth list

clouddrive-cli files list --provider aliyun --account default --path "/影视" --json
clouddrive-cli files walk --provider aliyun --account default --path "/影视" --json

clouddrive-cli media rename-plan \
  --input files.json \
  --style jellyfin \
  --output rename-plan.json

clouddrive-cli files rename-apply rename-plan.json --dry-run
clouddrive-cli files rename-apply rename-plan.json

clouddrive-cli ops list
clouddrive-cli ops show <operation-id>
clouddrive-cli ops undo <operation-id>
```

JSON output must be stable by default so AI agents can parse it reliably. Human-readable output can be the default for interactive commands, but every automation-relevant command should support `--json`.

## Rename Plan Format

AI agents should generate and edit rename plans, not directly perform cloud mutations. A rename plan should be a durable JSON file:

```json
{
  "version": 1,
  "operation": "rename",
  "provider": "aliyun",
  "account_id": "aliyun_xxx",
  "created_at": "2026-05-14T00:00:00.000Z",
  "items": [
    {
      "drive_id": "xxx",
      "file_id": "xxx",
      "parent_file_id": "xxx",
      "old_name": "The.Last.of.Us.S01E01.mkv",
      "new_name": "The Last of Us (2023) - S01E01.mkv",
      "reason": "Normalized title, year, season, and episode for media scraping."
    }
  ]
}
```

The apply command must validate that each item still matches the expected `old_name` before renaming. If the remote file has changed, that item should fail safely unless an explicit override flag is provided.

## Safety Model

Commands should be grouped into capability levels:

- Level 1: read-only operations such as auth list, file list, file walk, search, and file info.
- Level 2: reversible write operations such as rename, move, mkdir, and favorite/tag operations where providers support them.
- Level 3: dangerous write operations such as permanent delete, public share creation, large batch transfers, and trash clearing.

The MVP should implement Level 1 and the rename part of Level 2. Level 3 should be out of scope until the operation log, confirmation, and permission story is proven.

All write operations must support `--dry-run`. Dry-run should report:

- Items that would change.
- Items that would be skipped.
- Name conflicts in the same parent folder.
- Illegal names or provider-specific restrictions.
- Missing permissions or unsupported provider capabilities.
- Remote files whose current name no longer matches the plan.

## Operation Log And Undo

Every successful write operation should create an operation log:

```json
{
  "id": "op_20260514_001",
  "type": "rename",
  "provider": "aliyun",
  "account_id": "aliyun_xxx",
  "started_at": "2026-05-14T00:00:00.000Z",
  "finished_at": "2026-05-14T00:00:05.000Z",
  "items": [
    {
      "drive_id": "xxx",
      "file_id": "xxx",
      "parent_file_id": "xxx",
      "before_name": "The.Last.of.Us.S01E01.mkv",
      "after_name": "The Last of Us (2023) - S01E01.mkv",
      "status": "success"
    }
  ]
}
```

Undo for rename should generate and apply the inverse rename plan after validating that each file still has the expected `after_name`. Partial undo must be reported item by item.

## Media Rename Planning

The first media workflow should target Jellyfin, Emby, and Plex friendly names:

- Movies: `Movie Title (Year).ext`
- TV episodes: `Series Title (Year) - S01E02 - Episode Title.ext`
- Folders: `Series Title (Year)/Season 01`

The planner should initially be conservative. It should normalize obvious separators, years, seasons, and episode numbers, but mark uncertain items instead of guessing silently. Later versions can integrate metadata providers such as TMDB, but the CLI should not require that for the first useful release.

## Error Handling

CLI commands should use predictable exit codes:

- `0`: success
- `1`: validation failed or user-correctable input error
- `2`: provider authentication error
- `3`: provider API error
- `4`: partial success
- `5`: unsupported capability

JSON error output should include `code`, `message`, and optional `details`.

## Testing Strategy

The core should have unit tests for:

- Provider capability validation.
- Auth store read/write behavior.
- File model mapping.
- Rename plan validation.
- Dry-run conflict detection.
- Operation log creation.
- Rename undo plan generation.

Provider adapters should have tests around request construction, response mapping, token refresh behavior, and provider-specific filename restrictions. Aliyun should be the first complete test target.

## Phased Delivery

### Phase 1: Headless Core And Aliyun Rename MVP

- Create package structure for `boxplayer-core` and `clouddrive-cli`.
- Define provider-neutral models and `DriveProvider`.
- Add CLI auth store.
- Implement Aliyun auth, list, walk, and rename.
- Implement rename plan validation, dry-run, apply, operation log, and undo.
- Add tests for the core and Aliyun adapter.

### Phase 2: Media Rename Planning

- Add `media rename-plan`.
- Support conservative Jellyfin/Emby/Plex naming.
- Add uncertainty reporting for ambiguous names.
- Keep metadata-provider lookup optional.

### Phase 3: Additional Providers

- Add providers behind the existing interface in priority order.
- Reuse the provider checklist in `AGENT.md`.
- Implement only capabilities that each provider supports.
- Keep unsupported operations explicit instead of falling back to Aliyun behavior.

### Phase 4: Agent-Friendly Integrations

- Add an MCP wrapper if the CLI contract proves stable.
- Add richer JSON schemas for tool discovery.
- Add optional Electron export/import flows for accounts.

## Open Decisions

- Whether the first auth flow should implement full Aliyun login or support token import first.
- Whether package structure should use `packages/` workspaces immediately or start under `src/cli` and migrate later.
- Whether operation logs should default to the CLI config directory or allow per-project logs for agent workspaces.
- Whether media rename planning should include online metadata lookup in the first version or stay purely local.

## Recommended Next Step

Write an implementation plan for Phase 1 only. The first implementation should prove the contract with Aliyun list, walk, rename dry-run, rename apply, operation log, and undo before exposing broader write capabilities or adding more providers.
