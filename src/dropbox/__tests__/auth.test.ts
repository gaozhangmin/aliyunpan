import { describe, expect, it } from 'vitest'
import { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, buildDropboxAuthUrl, createDropboxPkceVerifier } from '../auth'

describe('Dropbox auth helpers', () => {
  it('builds a PKCE authorization url using the app key and verifier challenge', async () => {
    const verifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'
    const url = await buildDropboxAuthUrl('app-key', verifier, 'state-1')
    const parsed = new URL(url)

    expect(parsed.origin + parsed.pathname).toBe('https://www.dropbox.com/oauth2/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('app-key')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('token_access_type')).toBe('offline')
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('code_challenge')).toBeTruthy()
    expect(parsed.searchParams.get('state')).toBe('state-1')
    expect(parsed.searchParams.get('redirect_uri')).toBe('xbyboxplayer-oauth://callback')
    expect(parsed.searchParams.get('scope')).toContain('sharing.read')
    expect(parsed.searchParams.get('scope')).toContain('sharing.write')
    expect(parsed.searchParams.get('scope')).toContain('files.content.write')
  })

  it('creates a verifier accepted by Dropbox PKCE', () => {
    const verifier = createDropboxPkceVerifier()

    expect(verifier).toMatch(/^[A-Za-z0-9._~-]{43,128}$/)
  })

  it('exports Dropbox app credentials as cleanable constants', () => {
    expect(typeof DROPBOX_APP_KEY).toBe('string')
    expect(typeof DROPBOX_APP_SECRET).toBe('string')
  })
})
