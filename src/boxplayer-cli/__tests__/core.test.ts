import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { createAuthStore } from '../core/authStore.mjs'
import { createProviderRegistry } from '../core/providerRegistry.mjs'
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
