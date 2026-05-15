export type OAuthProvider = 'aliyun' | 'onedrive' | 'dropbox' | 'box' | '123' | 'cloud123' | '115' | 'drive115'

export function createPkceVerifier(): string
export function createPkceChallenge(verifier: string): string

export function buildOAuthAuthorization(options: {
  provider: OAuthProvider | string
  redirectUri: string
  state?: string
  verifier?: string
}): Promise<{
  provider: string
  url: string
  redirectUri: string
  state: string
  verifier: string
  clientId: string
}>

export function createLoopbackCallbackListener(options?: {
  host?: string
  port?: number
  timeoutMs?: number
}): Promise<{
  redirectUri: string
  waitForCallback(): Promise<{ code: string; state: string }>
  close(): void
}>

export function openBrowser(url: string, browser?: string): Promise<void>

export function exchangeOAuthCodeForToken(options: {
  provider: OAuthProvider | string
  code: string
  redirectUri: string
  verifier: string
}): Promise<{
  provider: string
  accountId: string
  displayName: string
  token: Record<string, unknown>
}>

export function loginWithBrowserOAuth(options: {
  provider: OAuthProvider | string
  configDir: string
  browser?: string
  state?: string
  verifier?: string
  redirectUri?: string
  openBrowser?: (url: string, browser?: string) => Promise<void>
  waitForCallback?: () => Promise<{ code: string; state: string }>
  exchangeCode?: (options: { provider: string; code: string; redirectUri: string; verifier: string }) => Promise<{
    provider: string
    accountId: string
    displayName: string
    token: Record<string, unknown>
  }>
  timeoutMs?: number
  port?: number
}): Promise<{
  provider: string
  accountId: string
  displayName: string
  isDefault: boolean
}>

export function loginWithAliyunQrCode(options: {
  configDir: string
  createQrCode?: (options: { clientId: string; clientSecret: string }) => Promise<string>
  renderQrCode?: (content: string, opts?: { small?: boolean }) => Promise<void>
  pollQrCode?: (options: { qrCodeUrl: string; timeoutMs: number; intervalMs: number }) => Promise<{ authCode: string }>
  exchangeAuthCode?: (options: { authCode: string; clientId: string; clientSecret: string }) => Promise<{
    provider: string
    accountId: string
    displayName: string
    token: Record<string, unknown>
  }>
  timeoutMs?: number
  intervalMs?: number
  clientId?: string
  clientSecret?: string
}): Promise<{
  provider: string
  accountId: string
  displayName: string
  isDefault: boolean
}>

export function loginWithDrive115QrCode(options: {
  configDir: string
  verifier?: string
  createDeviceCode?: (options: { clientId: string; verifier: string }) => Promise<{
    uid: string
    time: string
    sign: string
    qrcode: string
  }>
  renderQrCode?: (content: string) => Promise<void>
  pollDeviceStatus?: (options: {
    uid: string
    time: string
    sign: string
    timeoutMs: number
    intervalMs: number
  }) => Promise<{ state?: number; status?: number; msg?: string }>
  exchangeDeviceCode?: (options: { uid: string; verifier: string }) => Promise<{
    provider: string
    accountId: string
    displayName: string
    token: Record<string, unknown>
  }>
  timeoutMs?: number
  intervalMs?: number
  clientId?: string
}): Promise<{
  provider: string
  accountId: string
  displayName: string
  isDefault: boolean
}>

export function supportedBrowserLoginProviders(): string[]
