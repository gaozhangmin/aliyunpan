import type { AliyunToken } from './aliyunHttp.mjs'
import type { ProviderInfo } from '../core/providerRegistry.mjs'

export interface AliyunAuth {
  login(): Promise<never>
  refresh(token: AliyunToken): Promise<AliyunToken>
  listAccounts(): Promise<AliyunToken[]>
}

export interface AliyunProvider extends ProviderInfo {
  auth: AliyunAuth
}

export function createAliyunProvider(): AliyunProvider
