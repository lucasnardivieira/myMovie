import { describe, expect, it } from 'vitest'
import { decodeInvite, encodeInvite, inviteUrl, readInviteFromHash } from './share'

describe('invite links', () => {
  const invite = { name: 'Lucas 🎬 Ação', deck: [550, 278, 1234567], likes: [550] }

  it('round-trips, including unicode names', () => {
    expect(decodeInvite(encodeInvite(invite))).toEqual(invite)
  })

  it('produces URL-safe tokens', () => {
    expect(encodeInvite(invite)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('builds a URL whose hash can be read back', () => {
    const url = new URL(inviteUrl(invite, 'https://example.github.io/myMovie/'))
    expect(url.pathname).toBe('/myMovie/')
    expect(readInviteFromHash(url.hash)).toEqual(invite)
  })

  it('handles empty likes', () => {
    expect(decodeInvite(encodeInvite({ ...invite, likes: [] }))?.likes).toEqual([])
  })

  it('rejects garbage', () => {
    expect(decodeInvite('not-a-token')).toBeNull()
    expect(readInviteFromHash('#x=1')).toBeNull()
  })
})
