import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { createAuthStore } from '../core/authStore.mjs'
import { buildOAuthAuthorization, loginWithAliyunQrCode, loginWithBrowserOAuth, loginWithDrive115QrCode, supportedBrowserLoginProviders } from '../core/browserAuth.mjs'
import { createOperationLogStore, createUndoRenamePlan } from '../core/operationLog.mjs'
import { analyzeDriveItems, createOrganizePlan, dryRunOrganizePlan } from '../core/organizePlan.mjs'
import { createProviderRegistry } from '../core/providerRegistry.mjs'
import { dryRunRenamePlan, validateRenamePlan } from '../core/renamePlan.mjs'
import { createUploadPlanFromLocalPath, dryRunUploadPlan } from '../core/uploadPlan.mjs'
import { createAliyunProvider } from '../providers/aliyun.mjs'

const tempDirs: string[] = []

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'clouddrive-cli-'))
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

describe('standalone browser auth', () => {
  it('advertises the standalone login providers expected by the CLI', () => {
    expect(supportedBrowserLoginProviders()).toEqual(expect.arrayContaining(['aliyun', 'dropbox', 'box', '123', '115']))
  })

  it('builds a loopback OAuth URL with PKCE', async () => {
    const auth = await buildOAuthAuthorization({
      provider: 'onedrive',
      redirectUri: 'http://127.0.0.1:3456/callback',
      state: 'state-1',
      verifier: 'verifier-1',
    })

    const url = new URL(auth.url)
    expect(url.origin).toBe('https://login.microsoftonline.com')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:3456/callback')
    expect(url.searchParams.get('state')).toBe('state-1')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(auth.verifier).toBe('verifier-1')
  })

  it('builds a 123 cloud OAuth URL with the requested redirect URI', async () => {
    const auth = await buildOAuthAuthorization({
      provider: '123',
      redirectUri: 'http://127.0.0.1:53682/callback',
      state: 'state-123',
      verifier: 'verifier-123',
    })

    const url = new URL(auth.url)
    expect(url.origin).toBe('https://www.123pan.com')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:53682/callback')
    expect(url.searchParams.get('state')).toBe('state-123')
    expect(url.searchParams.get('scope')).toContain('file:all:read')
  })

  it('saves a browser OAuth token into the CLI auth store', async () => {
    const configDir = await makeTempDir()

    const result = await loginWithBrowserOAuth({
      provider: 'onedrive',
      configDir,
      openBrowser: async () => {},
      waitForCallback: async () => ({ code: 'auth-code', state: 'state-1' }),
      exchangeCode: async ({ code, provider, redirectUri }) => ({
        provider,
        accountId: 'onedrive_user',
        displayName: `OneDrive ${code}`,
        token: {
          access_token: 'access',
          refresh_token: 'refresh',
          redirect_uri: redirectUri,
        },
      }),
      state: 'state-1',
      verifier: 'verifier-1',
      redirectUri: 'http://127.0.0.1:3456/callback',
    })

    expect(result).toMatchObject({
      provider: 'onedrive',
      accountId: 'onedrive_user',
      displayName: 'OneDrive auth-code',
      isDefault: true,
    })
    expect(await createAuthStore({ configDir }).getDefaultAccount('onedrive')).toMatchObject({
      provider: 'onedrive',
      accountId: 'onedrive_user',
      token: {
        refresh_token: 'refresh',
      },
    })
  })

  it('saves an Aliyun QR login token into the CLI auth store', async () => {
    const configDir = await makeTempDir()

    const result = await loginWithAliyunQrCode({
      configDir,
      createQrCode: async () => 'https://openapi.alipan.com/qr/demo',
      pollQrCode: async () => ({ authCode: 'aliyun-auth-code' }),
      exchangeAuthCode: async ({ authCode }) => ({
        provider: 'aliyun',
        accountId: 'aliyun_openapi_demo',
        displayName: `Aliyun ${authCode}`,
        token: {
          tokenfrom: 'aliyun',
          user_id: 'aliyun_openapi_demo',
          open_api_access_token: 'open-access',
          open_api_refresh_token: 'open-refresh',
        },
      }),
    })

    expect(result).toMatchObject({
      provider: 'aliyun',
      accountId: 'aliyun_openapi_demo',
      displayName: 'Aliyun aliyun-auth-code',
      isDefault: true,
    })
    expect(await createAuthStore({ configDir }).getDefaultAccount('aliyun')).toMatchObject({
      provider: 'aliyun',
      accountId: 'aliyun_openapi_demo',
      token: {
        open_api_refresh_token: 'open-refresh',
      },
    })
  })

  it('saves a 115 QR login token after rendering the QR code in the terminal', async () => {
    const configDir = await makeTempDir()
    const rendered: string[] = []

    const result = await loginWithDrive115QrCode({
      configDir,
      createDeviceCode: async () => ({
        uid: 'uid-115',
        time: 'time-115',
        sign: 'sign-115',
        qrcode: 'https://qrcodeapi.115.com/login/demo',
      }),
      renderQrCode: async (content) => {
        rendered.push(content)
      },
      pollDeviceStatus: async () => ({ status: 2, state: 1, msg: 'ok' }),
      exchangeDeviceCode: async ({ uid }) => ({
        provider: '115',
        accountId: '115_demo',
        displayName: `115 ${uid}`,
        token: {
          tokenfrom: '115',
          user_id: '115_demo',
          access_token: 'access-115',
          refresh_token: 'refresh-115',
        },
      }),
      intervalMs: 1,
    })

    expect(rendered).toEqual(['https://qrcodeapi.115.com/login/demo'])
    expect(result).toMatchObject({
      provider: '115',
      accountId: '115_demo',
      displayName: '115 uid-115',
      isDefault: true,
    })
    expect(await createAuthStore({ configDir }).getDefaultAccount('115')).toMatchObject({
      provider: '115',
      accountId: '115_demo',
      token: {
        refresh_token: 'refresh-115',
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
    expect(registry.list().map((item: { id: string }) => item.id)).toEqual(['aliyun'])
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

describe('operation logs', () => {
  it('saves, lists, and shows operation logs', async () => {
    const configDir = await makeTempDir()
    const store = createOperationLogStore({ configDir })

    await store.save({
      id: 'op_test',
      type: 'rename',
      provider: 'aliyun',
      account_id: 'aliyun_demo',
      started_at: '2026-05-14T00:00:00.000Z',
      finished_at: '2026-05-14T00:00:01.000Z',
      items: [
        {
          drive_id: 'drive',
          file_id: 'file-1',
          parent_file_id: 'parent',
          before_name: 'A.mkv',
          after_name: 'B.mkv',
          status: 'success',
        },
      ],
    })

    expect(await store.list()).toEqual([
      {
        id: 'op_test',
        type: 'rename',
        provider: 'aliyun',
        account_id: 'aliyun_demo',
        started_at: '2026-05-14T00:00:00.000Z',
        finished_at: '2026-05-14T00:00:01.000Z',
        successCount: 1,
        failureCount: 0,
      },
    ])
    expect(await store.get('op_test')).toMatchObject({
      id: 'op_test',
      items: [{ file_id: 'file-1', status: 'success' }],
    })
  })

  it('creates an inverse rename plan from successful log items', () => {
    expect(createUndoRenamePlan({
      id: 'op_test',
      type: 'rename',
      provider: 'aliyun',
      account_id: 'aliyun_demo',
      items: [
        {
          drive_id: 'drive',
          file_id: 'file-1',
          parent_file_id: 'parent',
          before_name: 'A.mkv',
          after_name: 'B.mkv',
          status: 'success',
        },
        {
          drive_id: 'drive',
          file_id: 'file-2',
          parent_file_id: 'parent',
          before_name: 'C.mkv',
          after_name: 'D.mkv',
          status: 'failed',
        },
      ],
    })).toMatchObject({
      version: 1,
      operation: 'rename',
      provider: 'aliyun',
      account_id: 'aliyun_demo',
      source_operation_id: 'op_test',
      items: [
        {
          drive_id: 'drive',
          file_id: 'file-1',
          parent_file_id: 'parent',
          old_name: 'B.mkv',
          new_name: 'A.mkv',
          reason: 'Undo rename from operation op_test',
        },
      ],
    })
  })
})

describe('upload plans', () => {
  it('scans a local directory into a deterministic upload plan', async () => {
    const dir = await makeTempDir()
    await mkdir(join(dir, 'Season 01'))
    await writeFile(join(dir, 'Season 01', 'Episode 01.mkv'), 'video', 'utf8')
    await writeFile(join(dir, 'poster.jpg'), 'img', 'utf8')

    const plan = await createUploadPlanFromLocalPath({
      localPath: dir,
      provider: 'aliyun',
      accountId: 'default',
      remoteParentFileId: 'root',
      conflict: 'skip',
    })

    expect(plan).toMatchObject({
      version: 1,
      operation: 'upload',
      provider: 'aliyun',
      account_id: 'default',
      remote_parent_file_id: 'root',
      conflict: 'skip',
    })
    expect(plan.items.map((item: { type: string; relative_path: string }) => `${item.type}:${item.relative_path}`)).toEqual([
      'folder:Season 01',
      'file:Season 01/Episode 01.mkv',
      'file:poster.jpg',
    ])
    expect(dryRunUploadPlan(plan)).toMatchObject({
      ok: true,
      fileCount: 2,
      folderCount: 1,
      totalBytes: 8,
      errors: [],
    })
  })
})

describe('organize plans', () => {
  const items = [
    { provider: 'aliyun', accountId: 'acc', driveId: 'drive', fileId: 'movies', parentFileId: 'root', name: 'Movies', type: 'folder' },
    { provider: 'aliyun', accountId: 'acc', driveId: 'drive', fileId: 'f1', parentFileId: 'root', name: 'Example.Movie.2024.mkv', type: 'file', size: 10 },
    { provider: 'aliyun', accountId: 'acc', driveId: 'drive', fileId: 'f2', parentFileId: 'root', name: 'Show.S01E01.mkv', type: 'file', size: 20 },
  ]

  it('summarizes cloud drive items for AI analysis', () => {
    expect(analyzeDriveItems({ provider: 'aliyun', accountId: 'acc', rootFileId: 'root', items })).toMatchObject({
      provider: 'aliyun',
      account_id: 'acc',
      root_file_id: 'root',
      stats: {
        totalItems: 3,
        fileCount: 2,
        folderCount: 1,
        videoCount: 2,
        totalBytes: 30,
      },
    })
  })

  it('creates a conservative organize plan and dry-runs action counts', () => {
    const analysis = analyzeDriveItems({ provider: 'aliyun', accountId: 'acc', rootFileId: 'root', items })
    const plan = createOrganizePlan({ analysis, rulesText: 'Move episodes to TV Shows and movies to Movies.' })

    expect(plan).toMatchObject({
      version: 1,
      operation: 'organize',
      provider: 'aliyun',
      account_id: 'acc',
      root_file_id: 'root',
    })
    expect(plan.actions).toEqual([
      { type: 'mkdir', parent_file_id: 'root', name: 'TV Shows', ref: 'folder:TV Shows', reason: 'Required media category folder is missing' },
      { type: 'move', file_id: 'f1', from_parent_file_id: 'root', to_parent_file_id: 'movies', to_parent_ref: 'folder:Movies', name: 'Example.Movie.2024.mkv', reason: 'Movie-like video belongs in Movies' },
      { type: 'move', file_id: 'f2', from_parent_file_id: 'root', to_parent_file_id: '', to_parent_ref: 'folder:TV Shows', name: 'Show.S01E01.mkv', reason: 'Episode-like video belongs in TV Shows' },
    ])
    expect(dryRunOrganizePlan(plan)).toMatchObject({
      ok: true,
      actionCount: 3,
      counts: { mkdir: 1, move: 2, rename: 0, copy: 0, trash: 0 },
      errors: [],
    })
  })
})
