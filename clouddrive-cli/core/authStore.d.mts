export interface StoredAccount {
  provider: string
  accountId: string
  displayName?: string
  token?: Record<string, unknown>
}

export interface PublicAccount {
  provider: string
  accountId: string
  displayName: string
  isDefault: boolean
}

export interface AuthStore {
  saveAccount(account: StoredAccount): Promise<StoredAccount>
  listAccounts(): Promise<PublicAccount[]>
  getAccount(provider: string, accountId: string): Promise<StoredAccount | null>
  setDefaultAccount(provider: string, accountId: string): Promise<StoredAccount>
  getDefaultAccount(provider: string): Promise<StoredAccount | null>
}

export function createAuthStore(input: { configDir: string }): AuthStore
