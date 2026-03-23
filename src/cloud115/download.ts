import UserDAL from '../user/userdal'
import message from '../utils/message'
import Config from '../config'

export const apiDrive115DownUrl = async (
  user_id: string,
  pick_code: string
): Promise<{ url: string; size: number } | string> => {
  let token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    const dbToken = await UserDAL.GetUserTokenFromDB(user_id)

    if (dbToken) {

      token = dbToken

    }
  }
  if (!token?.access_token) return '未登录 115 网盘'
  if (!pick_code) return '文件提取码缺失'
  const body = new URLSearchParams()
  body.set('pick_code', pick_code)
  try {
    const resp = await fetch('https://proapi.115.com/open/ufile/downurl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': Config.downAgent || '',
        Authorization: `Bearer ${token.access_token}`
      },
      body
    })
    if (!resp.ok) return '获取下载地址失败'
    const data = await resp.json()
    if (data?.code !== 0 || !data?.data) return data?.message || '获取下载地址失败'
    const firstKey = Object.keys(data.data)[0]
    const info = firstKey ? data.data[firstKey] : null
    const url = info?.url?.url || ''
    if (!url) return '获取下载地址失败'
    return { url, size: Number(info?.file_size || 0) }
  } catch (err: any) {
    message.error('获取下载地址失败 ' + (err?.message || ''))
    return '获取下载地址失败'
  }
}
