import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const TOKENS_FILE = 'tokens.json'
const CONFIG_FILE = 'config.json'

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error && error.code === 'ENOENT') return fallback
    throw error
  }
}

async function writePrivateJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  try {
    await chmod(path, 0o600)
  } catch {
    // Some filesystems do not support chmod. The write mode still covers common platforms.
  }
}

function publicAccount(account, defaults) {
  return {
    provider: account.provider,
    accountId: account.accountId,
    displayName: account.displayName || account.accountId,
    isDefault: defaults[account.provider] === account.accountId,
  }
}

export function createAuthStore({ configDir }) {
  if (!configDir) throw new Error('configDir is required')
  const tokensPath = join(configDir, TOKENS_FILE)
  const configPath = join(configDir, CONFIG_FILE)

  async function ensureDir() {
    await mkdir(configDir, { recursive: true, mode: 0o700 })
  }

  async function readTokens() {
    await ensureDir()
    const data = await readJson(tokensPath, { accounts: [] })
    return { accounts: Array.isArray(data.accounts) ? data.accounts : [] }
  }

  async function readConfig() {
    await ensureDir()
    const data = await readJson(configPath, { defaults: {} })
    return { defaults: data.defaults && typeof data.defaults === 'object' ? data.defaults : {} }
  }

  return {
    async saveAccount(account) {
      if (!account?.provider) throw new Error('account.provider is required')
      if (!account?.accountId) throw new Error('account.accountId is required')
      const data = await readTokens()
      const nextAccounts = data.accounts.filter((item) => !(item.provider === account.provider && item.accountId === account.accountId))
      nextAccounts.push(account)
      await writePrivateJson(tokensPath, { accounts: nextAccounts })
      return account
    },

    async listAccounts() {
      const [{ accounts }, { defaults }] = await Promise.all([readTokens(), readConfig()])
      return accounts.map((account) => publicAccount(account, defaults))
    },

    async getAccount(provider, accountId) {
      const { accounts } = await readTokens()
      return accounts.find((account) => account.provider === provider && account.accountId === accountId) || null
    },

    async setDefaultAccount(provider, accountId) {
      const account = await this.getAccount(provider, accountId)
      if (!account) throw new Error(`Unknown account: ${provider}/${accountId}`)
      const config = await readConfig()
      config.defaults[provider] = accountId
      await writePrivateJson(configPath, config)
      return account
    },

    async getDefaultAccount(provider) {
      const { defaults } = await readConfig()
      const accountId = defaults[provider]
      if (!accountId) return null
      return this.getAccount(provider, accountId)
    },
  }
}
