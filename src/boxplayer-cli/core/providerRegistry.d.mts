export interface ProviderInfo {
  id: string
  displayName: string
  capabilities: Record<string, boolean>
}

export interface ProviderRegistry {
  get(id: string): ProviderInfo
  list(): ProviderInfo[]
}

export function createProviderRegistry(providers: ProviderInfo[]): ProviderRegistry
