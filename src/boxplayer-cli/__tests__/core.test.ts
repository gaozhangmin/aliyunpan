import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { createAuthStore } from '../core/authStore.mjs'
import { createProviderRegistry } from '../core/providerRegistry.mjs'
import { dryRunRenamePlan, validateRenamePlan } from '../core/renamePlan.mjs'
import { createAliyunProvider } from '../providers/aliyun.mjs'

const tempDirs: string[] = []

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'boxplayer-cli-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  while (tempDirs.length) {
    const dir = tempDirs.pop()
    if (dir) await rm(dir, { recursive: true, force: true })
  }
})

describe('CLI auth store', () => {
  it('saves accounts, lists them without secrets, and stores defaults', async () => {
    const configDir = await makeTempDir()
    const store = createAuthStore({ configDir })

    await store.saveAccount({
      provider: 'aliyun',
      accountId: 'aliyun_demo',
      displayName: 'Demo Account',
      token: {
        accessToken: 'secret-access',
        refreshToken: 'secret-refresh',
      },
    })
    await store.setDefaultAccount('aliyun', 'aliyun_demo')

    expect(await store.listAccounts()).toEqual([
      {
        provider: 'aliyun',
        accountId: 'aliyun_demo',
        displayName: 'Demo Account',
        isDefault: true,
      },
    ])
    expect(await store.getDefaultAccount('aliyun')).toMatchObject({
      provider: 'aliyun',
      accountId: 'aliyun_demo',
      token: {
        accessToken: 'secret-access',
        refreshToken: 'secret-refresh',
      },
    })
  })
})

describe('provider registry', () => {
  it('looks up providers by id and exposes explicit capabilities', () => {
    const registry = createProviderRegistry([createAliyunProvider()])
    const provider = registry.get('aliyun')

    expect(provider.id).toBe('aliyun')
    expect(provider.displayName).toBe('Aliyun Drive')
    expect(provider.capabilities).toMatchObject({
      batchRename: true,
      recursiveWalk: true,
      serverSideSearch: true,
      trash: true,
      permanentDelete: false,
      share: true,
      pathAddressable: false,
      fileIdAddressable: true,
    })
    expect(registry.list().map((item) => item.id)).toEqual(['aliyun'])
    expect(() => registry.get('missing')).toThrow('Unknown provider: missing')
  })
})

describe('rename plan validation', () => {
  const validPlan = {
    version: 1,
    operation: 'rename',
    provider: 'aliyun',
    account_id: 'aliyun_demo',
    created_at: '2026-05-14T00:00:00.000Z',
    items: [
      {
        drive_id: 'drive',
        file_id: 'file-1',
        parent_file_id: 'parent',
        old_name: 'Old.Name.S01E01.mkv',
        new_name: 'Old Name - S01E01.mkv',
        reason: 'Normalize separators',
      },
    ],
  }

  it('accepts a valid rename plan', () => {
    expect(validateRenamePlan(validPlan)).toEqual({
      ok: true,
      errors: [],
      itemCount: 1,
    })
  })

  it('rejects malformed plans and empty target names', () => {
    expect(validateRenamePlan({ ...validPlan, operation: 'delete' })).toMatchObject({
      ok: false,
      errors: ['operation must be rename'],
    })
    expect(validateRenamePlan({
      ...validPlan,
      items: [{ ...validPlan.items[0], new_name: '   ' }],
    })).toMatchObject({
      ok: false,
      errors: ['items[0].new_name is required'],
    })
  })

  it('detects duplicate target names in one parent folder during dry-run', () => {
    const plan = {
      ...validPlan,
      items: [
        { ...validPlan.items[0], file_id: 'file-1', old_name: 'A.mkv', new_name: 'Same.mkv' },
        { ...validPlan.items[0], file_id: 'file-2', old_name: 'B.mkv', new_name: 'same.mkv' },
      ],
    }

    expect(dryRunRenamePlan(plan, [
      { fileId: 'file-1', name: 'A.mkv' },
      { fileId: 'file-2', name: 'B.mkv' },
    ])).toMatchObject({
      ok: false,
      changes: [],
      errors: [
        {
          code: 'duplicate_target_name',
          file_id: 'file-2',
          message: 'Duplicate target name in parent parent: same.mkv',
        },
      ],
    })
  })

  it('reports safe changes and stale remote names during dry-run', () => {
    const result = dryRunRenamePlan(validPlan, [
      { fileId: 'file-1', name: 'Different.mkv' },
    ])

    expect(result).toMatchObject({
      ok: false,
      changes: [],
      errors: [
        {
          code: 'remote_name_mismatch',
          file_id: 'file-1',
          message: 'Remote name mismatch for file-1: expected Old.Name.S01E01.mkv, found Different.mkv',
        },
      ],
    })

    expect(dryRunRenamePlan(validPlan, [
      { fileId: 'file-1', name: 'Old.Name.S01E01.mkv' },
    ])).toMatchObject({
      ok: true,
      changes: [
        {
          file_id: 'file-1',
          before_name: 'Old.Name.S01E01.mkv',
          after_name: 'Old Name - S01E01.mkv',
        },
      ],
      errors: [],
    })
  })
})
