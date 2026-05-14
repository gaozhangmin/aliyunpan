# BoxPlayer CLI Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first usable `boxplayer-cli` foundation with multi-provider abstractions, local auth/config storage, safe rename plans, dry-run validation, operation logging, undo planning, and a stubbed Aliyun provider boundary.

**Architecture:** Implement a provider-neutral CLI core under `src/boxplayer-cli/` using small Node-compatible ES modules, plus an executable `scripts/boxplayer-cli.mjs` entrypoint. The first phase proves the command/data contracts and safety model without wiring live Aliyun network calls yet; the Aliyun adapter exposes capabilities and returns explicit unsupported/auth errors for operations that require live API credentials.

**Tech Stack:** Node.js ES modules, Vitest, existing `pnpm` scripts, JSON files with owner-only token permissions where supported.

---

## File Structure

- Create `src/boxplayer-cli/core/models.mjs`: shared provider-neutral type documentation and constructors.
- Create `src/boxplayer-cli/core/authStore.mjs`: CLI config directory and JSON auth store.
- Create `src/boxplayer-cli/core/providerRegistry.mjs`: provider registration and lookup.
- Create `src/boxplayer-cli/providers/aliyun.mjs`: Aliyun provider capabilities and explicit MVP errors for unimplemented live calls.
- Create `src/boxplayer-cli/core/renamePlan.mjs`: rename plan validation and dry-run conflict checks.
- Create `src/boxplayer-cli/core/operationLog.mjs`: operation log persistence and undo plan generation.
- Create `src/boxplayer-cli/core/commands.mjs`: command handlers usable from tests and the CLI entrypoint.
- Create `scripts/boxplayer-cli.mjs`: executable CLI wrapper.
- Create `src/boxplayer-cli/__tests__/core.test.ts`: auth store, provider registry, rename plan, operation log tests.
- Create `src/boxplayer-cli/__tests__/commands.test.ts`: command behavior tests.
- Modify `vitest.config.ts`: include BoxPlayer CLI tests.
- Modify `package.json`: add `boxplayer-cli` bin and focused test script.

## Task 1: Auth Store And Provider Registry

**Files:**
- Create: `src/boxplayer-cli/core/authStore.mjs`
- Create: `src/boxplayer-cli/core/providerRegistry.mjs`
- Create: `src/boxplayer-cli/providers/aliyun.mjs`
- Test: `src/boxplayer-cli/__tests__/core.test.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Write failing tests for auth store and provider registry**

Add tests that create a temporary auth store, save an account, list it, mark it default, and look up the Aliyun provider by id.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/boxplayer-cli/__tests__/core.test.ts`

Expected: FAIL because the modules do not exist yet.

- [ ] **Step 3: Implement minimal auth store, registry, and Aliyun provider**

Implement JSON read/write helpers, `createAuthStore({ configDir })`, `createProviderRegistry(providers)`, and `createAliyunProvider()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/boxplayer-cli/__tests__/core.test.ts`

Expected: PASS for auth store and registry tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add -f src/boxplayer-cli/core/authStore.mjs src/boxplayer-cli/core/providerRegistry.mjs src/boxplayer-cli/providers/aliyun.mjs src/boxplayer-cli/__tests__/core.test.ts vitest.config.ts
git commit -m "feat: add BoxPlayer CLI auth store"
```

## Task 2: Rename Plan Validation And Dry Run

**Files:**
- Create: `src/boxplayer-cli/core/renamePlan.mjs`
- Modify: `src/boxplayer-cli/__tests__/core.test.ts`

- [ ] **Step 1: Write failing tests for rename plan validation**

Add tests for rejecting malformed plans, detecting duplicate target names in one parent folder, detecting empty names, and reporting safe dry-run changes.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/boxplayer-cli/__tests__/core.test.ts`

Expected: FAIL because `renamePlan.mjs` does not exist or exports are missing.

- [ ] **Step 3: Implement rename plan validation and dry-run conflict detection**

Implement `validateRenamePlan(plan)` and `dryRunRenamePlan(plan, currentItems)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/boxplayer-cli/__tests__/core.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add -f src/boxplayer-cli/core/renamePlan.mjs src/boxplayer-cli/__tests__/core.test.ts
git commit -m "feat: validate BoxPlayer CLI rename plans"
```

## Task 3: Operation Log And Undo Planning

**Files:**
- Create: `src/boxplayer-cli/core/operationLog.mjs`
- Modify: `src/boxplayer-cli/__tests__/core.test.ts`

- [ ] **Step 1: Write failing tests for operation logging and undo plans**

Add tests that save an operation log, list/show it, and generate an inverse rename plan from successful rename items.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/boxplayer-cli/__tests__/core.test.ts`

Expected: FAIL because operation log exports are missing.

- [ ] **Step 3: Implement operation log persistence and undo generation**

Implement `createOperationLogStore({ configDir })` and `createUndoRenamePlan(operation)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/boxplayer-cli/__tests__/core.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add -f src/boxplayer-cli/core/operationLog.mjs src/boxplayer-cli/__tests__/core.test.ts
git commit -m "feat: add BoxPlayer CLI operation logs"
```

## Task 4: Command Handlers And CLI Entrypoint

**Files:**
- Create: `src/boxplayer-cli/core/commands.mjs`
- Create: `scripts/boxplayer-cli.mjs`
- Create: `src/boxplayer-cli/__tests__/commands.test.ts`
- Modify: `package.json`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Write failing tests for command handlers**

Add tests for `auth list --json`, `auth default`, `files rename-apply --dry-run`, `ops list`, and unknown command errors.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/boxplayer-cli/__tests__/commands.test.ts`

Expected: FAIL because command modules do not exist.

- [ ] **Step 3: Implement command handlers and executable wrapper**

Implement `runBoxPlayerCli(argv, env)` returning `{ exitCode, stdout, stderr }`, and a Node executable that calls it.

- [ ] **Step 4: Run command tests**

Run: `pnpm exec vitest run src/boxplayer-cli/__tests__/commands.test.ts`

Expected: PASS.

- [ ] **Step 5: Run manual CLI smoke commands**

Run:

```bash
node scripts/boxplayer-cli.mjs auth list --json
node scripts/boxplayer-cli.mjs ops list --json
```

Expected: both commands exit 0 and print JSON.

- [ ] **Step 6: Commit**

Run:

```bash
git add -f src/boxplayer-cli/core/commands.mjs scripts/boxplayer-cli.mjs src/boxplayer-cli/__tests__/commands.test.ts package.json vitest.config.ts
git commit -m "feat: add BoxPlayer CLI commands"
```

## Task 5: Final Verification

**Files:**
- Modify only if verification finds a defect in files created by earlier tasks.

- [ ] **Step 1: Run focused CLI tests**

Run: `pnpm exec vitest run src/boxplayer-cli/__tests__`

Expected: all BoxPlayer CLI tests pass.

- [ ] **Step 2: Run repository test script**

Run: `pnpm test`

Expected: existing tests pass. A sandbox-only Vite WebSocket permission warning is acceptable if the process exits 0.

- [ ] **Step 3: Run type/build verification**

Run: `pnpm run build`

Expected: build exits 0.

- [ ] **Step 4: Commit verification fixes if any**

If fixes were needed, commit only those fixes with `git commit -m "fix: stabilize BoxPlayer CLI phase 1"`.

## Self-Review

- Spec coverage: Phase 1 covers provider abstraction, CLI auth store, Aliyun provider boundary, rename plan validation, dry-run, operation log, undo plan generation, and CLI commands. Live Aliyun network operations and media rename planning remain later phases as specified.
- Marker scan: The plan contains no unresolved filler markers.
- Type consistency: Command, auth, provider, rename, and operation names match across tasks.
