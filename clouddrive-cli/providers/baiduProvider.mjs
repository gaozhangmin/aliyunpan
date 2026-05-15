import { baiduRefreshToken, baiduListDir, baiduWalk, baiduRenameBatch, baiduSearch, baiduGetFile, baiduMove, baiduMkdir, baiduTrash } from './baidu.mjs'

export function createBaiduProvider() {
  return {
    id: 'baidu',
    displayName: '百度网盘',
    capabilities: {
      batchRename: true,
      recursiveWalk: true,
      serverSideSearch: true,
      trash: true,
      permanentDelete: true,
      share: true,
      pathAddressable: true,
      fileIdAddressable: false,
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
      async refresh(token) { return baiduRefreshToken(token) },
      async listAccounts() { return [] },
    },
    files: {
      async list({ token, parentFileId = '/' }) { return baiduListDir(token, parentFileId) },
      async *walk({ token, parentFileId = '/', maxDepth = 10 }) { yield* baiduWalk(token, parentFileId, maxDepth) },
      async get({ token, fileId }) { return baiduGetFile(token, fileId) },
      async rename({ token, fileId, newName, filePath }) {
        return (await baiduRenameBatch(token, [{ fileId, newName, filePath: filePath || fileId }]))[0]
      },
      async renameBatch({ token, renames }) { return baiduRenameBatch(token, renames) },
      async search({ token, name, limit }) { return baiduSearch(token, name, { limit }) },
      async moveBatch({ token, moves }) { return baiduMove(token, moves) },
      async mkdir({ token, parentPath = '/', name }) { return baiduMkdir(token, parentPath, name) },
      async trash({ token, items }) { return baiduTrash(token, items) },
    },
  }
}
