import { pikpakRefreshToken, pikpakListDir, pikpakWalk, pikpakRenameBatch, pikpakSearch, pikpakGetFile, pikpakMoveBatch, pikpakMkdir, pikpakTrash } from './pikpak.mjs'

export function createPikpakProvider() {
  return {
    id: 'pikpak',
    displayName: 'PikPak',
    capabilities: {
      batchRename: true,
      recursiveWalk: true,
      serverSideSearch: true,
      trash: true,
      permanentDelete: true,
      share: false,
      pathAddressable: false,
      fileIdAddressable: true,
      mkdir: true,
      move: true,
      uploadFile: false,
    },
    auth: {
      async login() {
        const err = new Error('Interactive login not supported. Set token in ~/.clouddrive-cli/tokens.json.')
        err.code = 'ERR_PROVIDER_OPERATION_UNIMPLEMENTED'
        throw err
      },
      async refresh(token) { return pikpakRefreshToken(token) },
      async listAccounts() { return [] },
    },
    files: {
      async list({ token, parentFileId = '' }) { return pikpakListDir(token, parentFileId) },
      async *walk({ token, parentFileId = '', maxDepth = 10 }) { yield* pikpakWalk(token, parentFileId, maxDepth) },
      async get({ token, fileId }) { return pikpakGetFile(token, fileId) },
      async rename({ token, fileId, newName }) { return (await pikpakRenameBatch(token, [{ fileId, newName }]))[0] },
      async renameBatch({ token, renames }) { return pikpakRenameBatch(token, renames) },
      async search({ token, name, limit }) { return pikpakSearch(token, name, { limit }) },
      async moveBatch({ token, moves }) { return pikpakMoveBatch(token, moves) },
      async mkdir({ token, parentId = '', name }) { return pikpakMkdir(token, parentId, name) },
      async trash({ token, items }) { return pikpakTrash(token, items.map((i) => i.fileId)) },
    },
  }
}
