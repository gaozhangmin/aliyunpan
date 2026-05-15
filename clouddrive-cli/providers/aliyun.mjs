import { aliRefreshToken } from './aliyunHttp.mjs'
import { aliListAll, aliWalk, aliRenameBatch, aliSearch, aliGetFile, aliMove, aliMkdir, aliTrash } from './aliyunFiles.mjs'

export function createAliyunProvider() {
  return {
    id: 'aliyun',
    displayName: 'Aliyun Drive',
    capabilities: {
      batchRename: true,
      recursiveWalk: true,
      serverSideSearch: true,
      trash: true,
      permanentDelete: false,
      share: true,
      pathAddressable: false,
      fileIdAddressable: true,
      mkdir: true,
      move: true,
      uploadFile: false,
    },

    auth: {
      async login() {
        const err = new Error(
          'Interactive login is not supported in clouddrive-cli. ' +
          'Import a token via auth import-electron or set the token directly in ~/.clouddrive-cli/tokens.json.'
        )
        err.code = 'ERR_PROVIDER_OPERATION_UNIMPLEMENTED'
        throw err
      },

      async refresh(token) {
        return aliRefreshToken(token)
      },

      async listAccounts() {
        return []
      },
    },

    files: {
      async list({ token, driveId, parentFileId = 'root' }) {
        return aliListAll(token, driveId, parentFileId)
      },

      async *walk({ token, driveId, parentFileId = 'root', maxDepth = 10 }) {
        yield* aliWalk(token, driveId, parentFileId, maxDepth)
      },

      async get({ token, driveId, fileId }) {
        return aliGetFile(token, driveId, fileId)
      },

      async rename({ token, driveId, fileId, newName }) {
        const results = await aliRenameBatch(token, driveId, [{ fileId, newName }])
        return results[0]
      },

      async renameBatch({ token, driveId, renames }) {
        return aliRenameBatch(token, driveId, renames)
      },

      async search({ token, driveId, query, limit }) {
        return aliSearch(token, driveId, query, { limit })
      },

      async moveBatch({ token, driveId, moves }) {
        return aliMove(token, driveId, moves)
      },

      async mkdir({ token, driveId, parentId, name }) {
        return aliMkdir(token, driveId, parentId, name)
      },

      async trash({ token, driveId, items }) {
        return aliTrash(token, driveId, items.map((i) => i.fileId))
      },
    },
  }
}
