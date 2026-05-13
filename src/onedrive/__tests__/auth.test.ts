import { describe, expect, it, vi } from 'vitest'
import { buildOneDriveAuthUrl, exchangeOneDriveCodeForToken, ONEDRIVE_SCOPE, refreshOneDriveAccessToken } from '../auth'

describe('OneDrive auth helpers', () => {
  it('builds Microsoft identity v2 authorize URL with PKCE and Graph scopes', async () => {
    const url = await buildOneDriveAuthUrl('client-id', 'verifier', 'state-1')
    const parsed = new URL(url)

    expect(parsed.origin + parsed.pathname).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('client-id')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('redirect_uri')).toBe('boxplayer-onedriveoauth://callback')
    expect(parsed.searchParams.get('response_mode')).toBe('query')
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('code_challenge')).toBeTruthy()
    expect(parsed.searchParams.get('state')).toBe('state-1')
    expect(parsed.searchParams.get('scope')).toBe(ONEDRIVE_SCOPE)
  })

  it('does not send client_secret for public-client PKCE token requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    })
    vi.stubGlobal('fetch', fetchMock)

    await exchangeOneDriveCodeForToken('auth-code', 'client-id', 'verifier')
    await refreshOneDriveAccessToken({
      device_id: 'client-id',
      refresh_token: 'refresh-token'
    } as any)

    const bodies = fetchMock.mock.calls.map(([, init]) => init?.body as URLSearchParams)
    expect(bodies).toHaveLength(2)
    expect(bodies[0].get('grant_type')).toBe('authorization_code')
    expect(bodies[0].has('client_secret')).toBe(false)
    expect(bodies[1].get('grant_type')).toBe('refresh_token')
    expect(bodies[1].has('client_secret')).toBe(false)
  })
})
