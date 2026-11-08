/** Invite links: the whole round travels in the URL hash — no server needed. */

export interface Invite {
  /** name of whoever swiped first */
  name: string
  /** the exact deck (TMDB ids), so the partner swipes the same movies */
  deck: number[]
  /** ids the first person liked */
  likes: number[]
}

const VERSION = 1
const HASH_KEY = 'c'

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromBase64Url = (text: string): Uint8Array => {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

const ids = (list: number[]) => list.map((id) => id.toString(36)).join('.')
const parseIds = (text: string) => (text ? text.split('.').map((s) => parseInt(s, 36)) : [])

export function encodeInvite(invite: Invite): string {
  const payload = [VERSION, invite.name, ids(invite.deck), ids(invite.likes)]
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

export function decodeInvite(token: string): Invite | null {
  try {
    const [version, name, deck, likes] = JSON.parse(new TextDecoder().decode(fromBase64Url(token)))
    if (version !== VERSION || typeof name !== 'string') return null
    const invite = { name, deck: parseIds(deck), likes: parseIds(likes) }
    if ([...invite.deck, ...invite.likes].some((n) => !Number.isInteger(n))) return null
    return invite
  } catch {
    return null
  }
}

export function inviteUrl(invite: Invite, base: string = location.href): string {
  const url = new URL(base)
  url.hash = `${HASH_KEY}=${encodeInvite(invite)}`
  return url.toString()
}

export function readInviteFromHash(hash: string = location.hash): Invite | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const token = params.get(HASH_KEY)
  return token ? decodeInvite(token) : null
}
