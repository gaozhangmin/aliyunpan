import { describe, expect, it } from 'vitest'
import { buildOneDriveAuthUrl, ONEDRIVE_SCOPE } from '../auth'

describe('OneDrive auth helpers', () => {
  it('builds Microsoft identity v2 authorize URL with PKCE and Graph scopes', async () => {
    const url = await buildOneDriveAuthUrl('client-id', 'verifier', 'state-1')
    const parsed = new URL(url)

    expect(parsed.origin + parsed.pathname).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('client-id')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('redirect_uri')).toBe('xbyboxplayer-oauth://callback')
    expect(parsed.searchParams.get('response_mode')).toBe('query')
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('code_challenge')).toBeTruthy()
    expect(parsed.searchParams.get('state')).toBe('state-1')
    expect(parsed.searchParams.get('scope')).toBe(ONEDRIVE_SCOPE)
  })
})
