import { drive115RefreshToken, drive115ListDir, drive115Walk, drive115RenameBatch, drive115Search, drive115GetFile, drive115MoveBatch, drive115Mkdir, drive115Trash } from './drive115.mjs'

export function createDrive115Provider() {
  return {
    id: '115',
    displayName: '115网盘',
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
      async refresh(token) { return drive115RefreshToken(token) },
      async listAccounts() { return [] },
    },
    files: {
      async list({ token, parentFileId = '0' }) { return drive115ListDir(token, parentFileId) },
      async *walk({ token, parentFileId = '0', maxDepth = 10 }) { yield* drive115Walk(token, parentFileId, maxDepth) },
      async get({ token, fileId }) { return drive115GetFile(token, fileId) },
      async rename({ token, fileId, newName }) { return (await drive115RenameBatch(token, [{ fileId, newName }]))[0] },
      async renameBatch({ token, renames }) { return drive115RenameBatch(token, renames) },
      async search({ token, name, limit }) { return drive115Search(token, name, { limit }) },
      async moveBatch({ token, moves }) { return drive115MoveBatch(token, moves) },
      async mkdir({ token, parentId = '0', name }) { return drive115Mkdir(token, parentId, name) },
      async trash({ token, items }) { return drive115Trash(token, items.map((i) => i.fileId)) },
    },
  }
}
