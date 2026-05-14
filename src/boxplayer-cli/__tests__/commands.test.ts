import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { createAuthStore } from '../core/authStore.mjs'
import { runBoxPlayerCli } from '../core/commands.mjs'
import { createOperationLogStore } from '../core/operationLog.mjs'

const tempDirs: string[] = []

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'boxplayer-cli-command-'))
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
      stderr: 'Unknown command: wat\n',
    })
  })
})
