export interface AliyunToken {
  access_token: string
  refresh_token: string
  token_type?: string
  expires_in?: number
  expire_time?: string
  device_id?: string
  signature?: string
  user_id?: string
  user_name?: string
  nick_name?: string
  default_drive_id?: string
  backup_drive_id?: string
  resource_drive_id?: string
  open_api_access_token?: string
  open_api_refresh_token?: string
  open_api_token_type?: string
}

export function aliPost(path: string, body: unknown, token: AliyunToken): Promise<unknown>
export function aliRefreshToken(token: AliyunToken): Promise<AliyunToken>
