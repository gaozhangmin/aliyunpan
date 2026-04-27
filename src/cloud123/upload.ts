import UserDAL from '../user/userdal'

const CLOUD123_OPEN_API = 'https://open-api.123pan.com'

export type Cloud123CreateFileResp = {
  reuse: boolean
  fileID: number
  preuploadID: string
  sliceSize: number
  servers: string[]
}

export const cloud123CreateFile = async (
  user_id: string,
  parentFileID: number,
  filename: string,
  etag: string,
  size: number,
  duplicate: number = 1,
  containDir: boolean = false
): Promise<Cloud123CreateFileResp | null> => {
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) return null
  const url = `${CLOUD123_OPEN_API}/upload/v2/file/create`
  const body = {
    parentFileID,
    filename,
    etag,
    size,
    duplicate,
    containDir
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Platform: 'open_platform',
      Authorization: `Bearer ${token.access_token}`
    },
    body: JSON.stringify(body)
  })
  if (!resp.ok) return null
  const data = await resp.json()
  if (data?.code !== 0) return null
  return {
    reuse: !!data?.data?.reuse,
    fileID: Number(data?.data?.fileID || 0),
    preuploadID: data?.data?.preuploadID || '',
    sliceSize: Number(data?.data?.sliceSize || 0),
    servers: Array.isArray(data?.data?.servers) ? data.data.servers : []
  }
}

export const cloud123UploadComplete = async (
  accessToken: string,
  preuploadID: string
): Promise<{ completed: boolean; fileID: number; requestOk: boolean; code: number }> => {
  const url = `${CLOUD123_OPEN_API}/upload/v2/file/upload_complete`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Platform: 'open_platform',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ preuploadID })
  }).catch(() => undefined)
  if (!resp?.ok) return { completed: false, fileID: 0, requestOk: false, code: resp?.status || -1 }
  const data = await resp.json().catch(() => undefined)
  if (data?.code !== 0) {
    return {
      completed: false,
      fileID: 0,
      requestOk: false,
      code: Number(data?.code || 0)
    }
  }
  return {
    completed: !!data?.data?.completed,
    fileID: Number(data?.data?.fileID || 0),
    requestOk: true,
    code: 0
  }
}

export const normalizeServer = (server: string): string => {
  if (!server) return ''
  if (server.startsWith('http://') || server.startsWith('https://')) return server
  return `https://${server}`
}
