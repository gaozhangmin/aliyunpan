import { describe, expect, it } from 'vitest'
import { BOX_DEFAULT_REDIRECT_URL, BOX_SCOPE, buildBoxAuthUrl } from '../auth'

describe('Box auth helpers', () => {
  it('builds Box authorize URL with PKCE and app protocol redirect', async () => {
    const url = await buildBoxAuthUrl('client-id', 'verifier', 'state-1')
    const parsed = new URL(url)

    expect(parsed.origin + parsed.pathname).toBe('https://account.box.com/api/oauth2/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('client-id')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('redirect_uri')).toBe(BOX_DEFAULT_REDIRECT_URL)
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('code_challenge')).toBeTruthy()
    expect(parsed.searchParams.get('state')).toBe('state-1')
    expect(parsed.searchParams.get('scope')).toBe(BOX_SCOPE)
  })
})
