export function createProviderRegistry(providers) {
  const providerMap = new Map()
  for (const provider of providers || []) {
    if (!provider?.id) throw new Error('Provider id is required')
    providerMap.set(provider.id, provider)
  }

  return {
    get(id) {
      const provider = providerMap.get(id)
      if (!provider) throw new Error(`Unknown provider: ${id}`)
      return provider
    },

    list() {
      return [...providerMap.values()].map((provider) => ({
        id: provider.id,
        displayName: provider.displayName,
        capabilities: provider.capabilities,
      }))
    },
  }
}
