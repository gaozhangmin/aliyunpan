function notImplemented(operation) {
  const error = new Error(`Aliyun ${operation} is not implemented in BoxPlayer CLI phase 1`)
  error.code = 'ERR_PROVIDER_OPERATION_UNIMPLEMENTED'
  throw error
}

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
    },
    auth: {
      async login() {
        notImplemented('login')
      },
      async refresh() {
        notImplemented('token refresh')
      },
      async listAccounts() {
        return []
      },
    },
    files: {
      async list() {
        notImplemented('file list')
      },
      async *walk() {
        notImplemented('file walk')
      },
      async get() {
        notImplemented('file get')
      },
      async rename() {
        notImplemented('file rename')
      },
      async renameBatch() {
        notImplemented('batch rename')
      },
    },
  }
}
