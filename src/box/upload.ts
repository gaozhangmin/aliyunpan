import { boxApiRequest, toBoxId } from './dirfilelist'

const BOX_UPLOAD_HOST = 'https://upload.box.com/api/2.0'

export const toBoxConflictBehavior = (mode: string) => {
  if (mode === 'overwrite') return 'overwrite'
  if (mode === 'refuse') return 'refuse'
  return 'rename'
}

export const buildBoxSmallUploadAttributes = (parentId: string, name: string) => ({
  name,
  parent: { id: toBoxId(parentId) }
})

export const buildBoxUploadSessionPath = () => '/files/upload_sessions'

export const buildBoxUploadSessionBody = (parentId: string, name: string, size: number) => ({
  folder_id: toBoxId(parentId),
  file_name: name,
  file_size: size
})

export const apiBoxUploadBuffer = async (
  user_id: string,
  parentId: string,
  name: string,
  buff: Buffer,
  mode: string
): Promise<{ file_id: string; error: string }> => {
  if (toBoxConflictBehavior(mode) === 'overwrite') return { file_id: '', error: 'Box 新建文件暂不支持覆盖同名文件' }
  const form = new FormData()
  form.set('attributes', JSON.stringify(buildBoxSmallUploadAttributes(parentId, name)))
  form.set('file', new Blob([new Uint8Array(buff)]), name)
  const data = await boxApiRequest<any>(user_id, `${BOX_UPLOAD_HOST}/files/content`, {
    method: 'POST',
    body: form
  }, '上传 Box 文件失败')
  const file = data?.entries?.[0]
  return { file_id: file?.id || '', error: file?.id ? '' : '上传 Box 文件失败' }
}
