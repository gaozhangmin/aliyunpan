import { cloud123RefreshToken, cloud123ListDir, cloud123Walk, cloud123GetFile, cloud123Search, cloud123RenameBatch, cloud123MoveBatch, cloud123Mkdir, cloud123Trash } from './cloud123.mjs'

export function createCloud123Provider() {
  return {
    id: 'cloud123',
    displayName: '123网盘',
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
        const err = new Error('Interactive login not supported. Use: clouddrive-cli auth login 123')
        err.code = 'ERR_PROVIDER_OPERATION_UNIMPLEMENTED'
        throw err
      },
      async refresh(token) { return cloud123RefreshToken(token) },
      async listAccounts() { return [] },
    },
    files: {
      async list({ token, parentFileId = '0' }) { return cloud123ListDir(token, parentFileId) },
      async *walk({ token, parentFileId = '0', maxDepth = 10 }) { yield* cloud123Walk(token, parentFileId, maxDepth) },
      async get({ token, fileId }) { return cloud123GetFile(token, fileId) },
      async rename({ token, fileId, newName }) { return (await cloud123RenameBatch(token, [{ fileId, newName }]))[0] },
      async renameBatch({ token, renames }) { return cloud123RenameBatch(token, renames) },
      async search({ token, name, limit }) { return cloud123Search(token, name, { limit }) },
      async moveBatch({ token, moves }) { return cloud123MoveBatch(token, moves) },
      async mkdir({ token, parentId = '0', name }) { return cloud123Mkdir(token, parentId, name) },
      async trash({ token, items }) { return cloud123Trash(token, items.map((i) => i.fileId)) },
    },
  }
}
