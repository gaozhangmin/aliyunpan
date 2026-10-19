/** Unknown directory errors must not invent an enabled Home category. */
export function showServerHomeError(serverId: string, hasCatalog: boolean, visibleIds: string[], hiddenIds: string[]) {
  const prefix = `${serverId}:`
  return hasCatalog ? visibleIds.some(id => id.startsWith(prefix)) : !hiddenIds.some(id => id.startsWith(prefix))
}
