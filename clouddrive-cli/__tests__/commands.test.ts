import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { createAuthStore } from '../core/authStore.mjs'
import { runBoxPlayerCli } from '../core/commands.mjs'
import { createOperationLogStore } from '../core/operationLog.mjs'

const tempDirs: string[] = []

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'clouddrive-cli-command-'))
  tempDirs.push(dir)
  return dir
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

afterEach(async () => {
  while (tempDirs.length) {
    const dir = tempDirs.pop()
    if (dir) await rm(dir, { recursive: true, force: true })
  }
})

describe('BoxPlayer CLI commands', () => {
  it('prints auth help when no auth subcommand is provided', async () => {
    const configDir = await makeTempDir()
    const result = await runBoxPlayerCli(['auth'], { configDir })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('clouddrive-cli auth login <provider>')
    expect(result.stdout).toContain('aliyun')
    expect(result.stdout).toContain('dropbox')
    expect(result.stdout).toContain('box')
    expect(result.stdout).toContain('123')
    expect(result.stdout).toContain('115')
    expect(result.stderr).toBe('')
  })

  it('prints auth list as JSON without secrets', async () => {
    const configDir = await makeTempDir()
    const store = createAuthStore({ configDir })
    await store.saveAccount({
      provider: 'aliyun',
      accountId: 'aliyun_demo',
      displayName: 'Demo',
      token: { accessToken: 'secret' },
    })

    const result = await runBoxPlayerCli(['auth', 'list', '--json'], { configDir })

    expect(result).toEqual({
      exitCode: 0,
      stdout: `${JSON.stringify([{ provider: 'aliyun', accountId: 'aliyun_demo', displayName: 'Demo', isDefault: false }], null, 2)}\n`,
      stderr: '',
    })
  })

  it('sets a default account', async () => {
    const configDir = await makeTempDir()
    const store = createAuthStore({ configDir })
    await store.saveAccount({
      provider: 'aliyun',
      accountId: 'aliyun_demo',
      displayName: 'Demo',
      token: { accessToken: 'secret' },
    })

    const result = await runBoxPlayerCli(['auth', 'default', 'aliyun', 'aliyun_demo', '--json'], { configDir })

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      provider: 'aliyun',
      accountId: 'aliyun_demo',
      displayName: 'Demo',
      isDefault: true,
    })
  })

  it('imports an auth token for standalone CLI installs', async () => {
    const configDir = await makeTempDir()
    const tokenPath = join(configDir, 'token.json')
    await writeJson(tokenPath, {
      access_token: 'access',
      refresh_token: 'refresh',
      user_id: 'u1',
      user_name: 'Standalone User',
    })

    const result = await runBoxPlayerCli([
      'auth', 'import-token',
      '--provider', 'aliyun',
      '--account', 'aliyun_standalone',
      '--name', 'Standalone User',
      '--token', tokenPath,
      '--default',
      '--json',
    ], { configDir })

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      provider: 'aliyun',
      accountId: 'aliyun_standalone',
      displayName: 'Standalone User',
      isDefault: true,
    })
  })

  it('dry-runs a rename plan from files', async () => {
    const configDir = await makeTempDir()
    const planPath = join(configDir, 'plan.json')
    const currentPath = join(configDir, 'current.json')
    await writeJson(planPath, {
      version: 1,
      operation: 'rename',
      provider: 'aliyun',
      account_id: 'aliyun_demo',
      items: [
        {
          drive_id: 'drive',
          file_id: 'file-1',
          parent_file_id: 'parent',
          old_name: 'A.mkv',
          new_name: 'B.mkv',
        },
      ],
    })
    await writeJson(currentPath, [{ fileId: 'file-1', name: 'A.mkv' }])

    const result = await runBoxPlayerCli(['files', 'rename-apply', planPath, '--current', currentPath, '--dry-run', '--json'], { configDir })

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      changes: [{ file_id: 'file-1', before_name: 'A.mkv', after_name: 'B.mkv' }],
      errors: [],
    })
  })

  it('lists operations as JSON', async () => {
    const configDir = await makeTempDir()
    const store = createOperationLogStore({ configDir })
    await store.save({
      id: 'op_test',
      type: 'rename',
      provider: 'aliyun',
      account_id: 'aliyun_demo',
      started_at: '2026-05-14T00:00:00.000Z',
      finished_at: '2026-05-14T00:00:01.000Z',
      items: [],
    })

    const result = await runBoxPlayerCli(['ops', 'list', '--json'], { configDir })

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual([
      {
        id: 'op_test',
        type: 'rename',
        provider: 'aliyun',
        account_id: 'aliyun_demo',
        started_at: '2026-05-14T00:00:00.000Z',
        finished_at: '2026-05-14T00:00:01.000Z',
        successCount: 0,
        failureCount: 0,
      },
    ])
  })

  it('returns an error for unknown commands', async () => {
    const configDir = await makeTempDir()
    const result = await runBoxPlayerCli(['wat'], { configDir })

    expect(result).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: '未知命令: wat\n运行 clouddrive-cli --help 查看可用命令\n',
    })
  })

  it('ops undo --dry-run generates inverse plan without applying', async () => {
    const configDir = await makeTempDir()
    const store = createOperationLogStore({ configDir })
    await store.save({
      id: 'op_undo_test',
      type: 'rename',
      provider: 'aliyun',
      account_id: 'aliyun_demo',
      started_at: '2026-05-14T00:00:00.000Z',
      finished_at: '2026-05-14T00:00:01.000Z',
      items: [
        { drive_id: 'd1', file_id: 'f1', parent_file_id: 'p1', before_name: 'Old.mkv', after_name: 'New.mkv', status: 'success' },
      ],
    })

    const result = await runBoxPlayerCli(['ops', 'undo', 'op_undo_test', '--dry-run', '--json'], { configDir })

    expect(result.exitCode).toBe(0)
    const body = JSON.parse(result.stdout)
    expect(body.undoPlan.items[0].old_name).toBe('New.mkv')
    expect(body.undoPlan.items[0].new_name).toBe('Old.mkv')
    expect(body.undoPlan.source_operation_id).toBe('op_undo_test')
  })

  it('ops undo returns exitCode 1 for unknown operation', async () => {
    const configDir = await makeTempDir()
    const result = await runBoxPlayerCli(['ops', 'undo', 'nonexistent', '--json'], { configDir })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/Unknown operation/)
  })

  it('auth error returns exitCode 2', async () => {
    const configDir = await makeTempDir()
    const result = await runBoxPlayerCli(['files', 'list', '--provider', 'aliyun', '--json'], { configDir })
    expect(result.exitCode).toBe(2)
    expect(result.stderr).toMatch(/No account found/)
  })

  it('unknown provider returns exitCode 5', async () => {
    const configDir = await makeTempDir()
    const result = await runBoxPlayerCli(['files', 'list', '--provider', 'nonexistent', '--json'], { configDir })
    expect(result.exitCode).toBe(5)
  })

  it('docs read returns a local document as AI context JSON', async () => {
    const configDir = await makeTempDir()
    const docPath = join(configDir, 'context.md')
    await writeFile(docPath, '# Context\n\nUse this as background for the rename task.\n', 'utf8')

    const result = await runBoxPlayerCli(['docs', 'read', docPath, '--json'], { configDir })

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      path: docPath,
      format: 'markdown',
      chars: 55,
      truncated: false,
      content: '# Context\n\nUse this as background for the rename task.\n',
    })
  })

  it('docs read supports max character truncation and text output', async () => {
    const configDir = await makeTempDir()
    const docPath = join(configDir, 'notes.txt')
    await writeFile(docPath, 'abcdefg', 'utf8')

    const result = await runBoxPlayerCli(['docs', 'read', docPath, '--max-chars', '4'], { configDir })

    expect(result).toEqual({
      exitCode: 0,
      stdout: 'abcd\n',
      stderr: '',
    })
  })

  it('docs read rejects missing paths', async () => {
    const configDir = await makeTempDir()

    const result = await runBoxPlayerCli(['docs', 'read'], { configDir })

    expect(result).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'Usage: clouddrive-cli docs read <path> [--max-chars <n>] [--json]\n',
    })
  })

  it('prints provider capabilities as JSON', async () => {
    const configDir = await makeTempDir()

    const result = await runBoxPlayerCli(['providers', 'capabilities', '--json'], { configDir })

    expect(result.exitCode).toBe(0)
    const body = JSON.parse(result.stdout)
    expect(body.find((provider: { id: string }) => provider.id === 'aliyun')).toMatchObject({
      id: 'aliyun',
      displayName: 'Aliyun Drive',
      capabilities: {
        batchRename: true,
        recursiveWalk: true,
        uploadFile: false,
        mkdir: true,
        move: true,
      },
    })
    expect(body.find((provider: { id: string }) => provider.id === 'cloud123')).toMatchObject({
      id: 'cloud123',
      displayName: '123网盘',
      capabilities: {
        recursiveWalk: true,
        serverSideSearch: true,
        mkdir: true,
        move: true,
      },
    })
  })

  it('creates and dry-runs an upload plan from a local directory', async () => {
    const configDir = await makeTempDir()
    const localDir = await makeTempDir()
    const outputPath = join(configDir, 'upload-plan.json')
    await mkdir(join(localDir, 'Season 01'))
    await writeFile(join(localDir, 'Season 01', 'Episode 01.mkv'), 'video', 'utf8')

    const planned = await runBoxPlayerCli([
      'upload', 'plan',
      '--local', localDir,
      '--provider', 'aliyun',
      '--account', 'default',
      '--remote-parent', 'root',
      '--output', outputPath,
      '--json',
    ], { configDir })

    expect(planned.exitCode).toBe(0)
    expect(JSON.parse(planned.stdout)).toMatchObject({
      operation: 'upload',
      provider: 'aliyun',
      remote_parent_file_id: 'root',
    })
    expect(JSON.parse(await readFile(outputPath, 'utf8')).items).toHaveLength(2)

    const dryRun = await runBoxPlayerCli(['upload', 'apply', outputPath, '--dry-run', '--json'], { configDir })

    expect(dryRun.exitCode).toBe(0)
    expect(JSON.parse(dryRun.stdout)).toMatchObject({
      ok: true,
      fileCount: 1,
      folderCount: 1,
      totalBytes: 5,
      errors: [],
    })
  })

  it('creates and dry-runs an upload plan from a single local file', async () => {
    const configDir = await makeTempDir()
    const localDir = await makeTempDir()
    const filePath = join(localDir, 'README.md')
    const outputPath = join(configDir, 'upload-file-plan.json')
    await writeFile(filePath, 'hello', 'utf8')

    const planned = await runBoxPlayerCli([
      'upload', 'plan',
      '--local', filePath,
      '--provider', 'cloud123',
      '--account', 'default',
      '--remote-parent', '0',
      '--output', outputPath,
      '--json',
    ], { configDir })

    expect(planned.exitCode).toBe(0)
    expect(JSON.parse(planned.stdout).items[0]).toMatchObject({ type: 'file', relative_path: '', target_name: 'README.md' })

    const dryRun = await runBoxPlayerCli(['upload', 'apply', outputPath, '--dry-run', '--json'], { configDir })

    expect(dryRun.exitCode).toBe(0)
    expect(JSON.parse(dryRun.stdout)).toMatchObject({
      ok: true,
      fileCount: 1,
      folderCount: 0,
      totalBytes: 5,
      errors: [],
    })
  })

  it('analyzes file exports and dry-runs an organize plan', async () => {
    const configDir = await makeTempDir()
    const filesPath = join(configDir, 'files.json')
    const analysisPath = join(configDir, 'analysis.json')
    const planPath = join(configDir, 'organize-plan.json')
    await writeJson(filesPath, [
      { provider: 'aliyun', accountId: 'acc', driveId: 'drive', fileId: 'movies', parentFileId: 'root', name: 'Movies', type: 'folder' },
      { provider: 'aliyun', accountId: 'acc', driveId: 'drive', fileId: 'f1', parentFileId: 'root', name: 'Film.2024.mkv', type: 'file', size: 10 },
      { provider: 'aliyun', accountId: 'acc', driveId: 'drive', fileId: 'f2', parentFileId: 'root', name: 'Show.S01E01.mkv', type: 'file', size: 20 },
    ])

    const analyzed = await runBoxPlayerCli([
      'organize', 'analyze',
      '--input', filesPath,
      '--provider', 'aliyun',
      '--account', 'acc',
      '--path', 'root',
      '--output', analysisPath,
      '--json',
    ], { configDir })

    expect(analyzed.exitCode).toBe(0)
    expect(JSON.parse(analyzed.stdout).stats).toMatchObject({ totalItems: 3, videoCount: 2 })

    const planned = await runBoxPlayerCli([
      'organize', 'plan',
      '--analysis', analysisPath,
      '--output', planPath,
      '--json',
    ], { configDir })

    expect(planned.exitCode).toBe(0)
    expect(JSON.parse(planned.stdout).actions.map((a: { type: string }) => a.type)).toEqual(['mkdir', 'move', 'move'])

    const dryRun = await runBoxPlayerCli(['organize', 'apply', planPath, '--dry-run', '--json'], { configDir })

    expect(dryRun.exitCode).toBe(0)
    expect(JSON.parse(dryRun.stdout)).toMatchObject({
      ok: true,
      actionCount: 3,
      counts: { mkdir: 1, move: 2, rename: 0, copy: 0, trash: 0 },
    })

    const summarized = await runBoxPlayerCli(['organize', 'apply', planPath, '--dry-run', '--summary', '--json'], { configDir })

    expect(summarized.exitCode).toBe(0)
    expect(JSON.parse(summarized.stdout)).toMatchObject({
      ok: true,
      actionCount: 3,
      counts: { mkdir: 1, move: 2, rename: 0, copy: 0, trash: 0 },
      moveTargets: { 'folder:Movies': 1, 'folder:TV Shows': 1 },
    })
    expect(JSON.parse(summarized.stdout).actions).toBeUndefined()
  })

  it('prints help for positional plan commands without reading --help as a file', async () => {
    const configDir = await makeTempDir()
    const result = await runBoxPlayerCli(['files', 'move-apply', '--help'], { configDir })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Usage: clouddrive-cli files move-apply')
    expect(result.stderr).toBe('')
  })
})
