import { onedriveRefreshToken, onedriveListDir, onedriveWalk, onedriveRenameBatch, onedriveSearch, onedriveGetFile, onedriveMove, onedriveMkdir, onedriveTrash } from './onedrive.mjs'

export function createOnedriveProvider() {
  return {
    id: 'onedrive',
    displayName: 'OneDrive',
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
      async refresh(token) { return onedriveRefreshToken(token) },
      async listAccounts() { return [] },
    },
    files: {
      async list({ token, parentFileId = 'onedrive_root' }) { return onedriveListDir(token, parentFileId) },
      async *walk({ token, parentFileId = 'onedrive_root', maxDepth = 10 }) { yield* onedriveWalk(token, parentFileId, maxDepth) },
      async get({ token, fileId }) { return onedriveGetFile(token, fileId) },
      async rename({ token, fileId, newName }) { return (await onedriveRenameBatch(token, [{ fileId, newName }]))[0] },
      async renameBatch({ token, renames }) { return onedriveRenameBatch(token, renames) },
      async search({ token, name, limit }) { return onedriveSearch(token, name, { limit }) },
      async moveBatch({ token, moves }) { return onedriveMove(token, moves) },
      async mkdir({ token, parentId, name }) { return onedriveMkdir(token, parentId, name) },
      async trash({ token, items }) { return onedriveTrash(token, items.map((i) => i.fileId)) },
    },
  }
}
