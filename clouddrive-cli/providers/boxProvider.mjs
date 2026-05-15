import { boxRefreshToken, boxListDir, boxWalk, boxRenameBatch, boxSearch, boxGetFile, boxMove, boxMkdir, boxTrash } from './box.mjs'

export function createBoxProvider() {
  return {
    id: 'box',
    displayName: 'Box',
    capabilities: {
      batchRename: true,
      recursiveWalk: true,
      serverSideSearch: true,
      trash: true,
      permanentDelete: true,
      share: true,
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
      async refresh(token) { return boxRefreshToken(token) },
      async listAccounts() { return [] },
    },
    files: {
      async list({ token, parentFileId = 'box_root' }) { return boxListDir(token, parentFileId) },
      async *walk({ token, parentFileId = 'box_root', maxDepth = 10 }) { yield* boxWalk(token, parentFileId, maxDepth) },
      async get({ token, fileId, itemType }) { return boxGetFile(token, fileId, itemType) },
      async rename({ token, fileId, newName }) { return (await boxRenameBatch(token, [{ fileId, newName }]))[0] },
      async renameBatch({ token, renames }) { return boxRenameBatch(token, renames) },
      async search({ token, name, limit }) { return boxSearch(token, name, { limit }) },
      async moveBatch({ token, moves }) { return boxMove(token, moves) },
      async mkdir({ token, parentId, name }) { return boxMkdir(token, parentId, name) },
      async trash({ token, items }) { return boxTrash(token, items) },
    },
  }
}
