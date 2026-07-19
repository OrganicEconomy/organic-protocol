/**
 * Federated identity: in a decentralized network, a public key alone is not
 * enough to reach someone — you also need to know which server hosts them.
 * An identity is therefore always the pair { pk, url }.
 */

import type { PublicKeyHex } from './wire.js'

/** A reachable actor of the network: a key and its referent server. */
export interface Identity {
  pk: PublicKeyHex
  /** Root URL of the referent server, normalized (no trailing slash, no /api). */
  url: string
}

export type ContactType = 'citizen' | 'ecosystem'

/** A saved contact, as stored by the app. */
export interface Contact extends Identity {
  name: string
  type: ContactType
}

export class InvalidServerUrlError extends Error {
  constructor(raw: string) {
    super(`Invalid server URL: "${raw}"`)
    this.name = 'InvalidServerUrlError'
  }
}

/**
 * Normalize a user-supplied server URL to its canonical form:
 * - adds `https://` when no scheme is given (plain `http:` is kept if explicit,
 *   for local networks and development)
 * - lowercases the host
 * - strips trailing slashes and a trailing `/api` (identities carry the ROOT url)
 * @throws InvalidServerUrlError when the input cannot be parsed as an URL.
 */
export function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '') throw new InvalidServerUrlError(raw)
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    throw new InvalidServerUrlError(raw)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new InvalidServerUrlError(raw)
  let path = url.pathname.replace(/\/+$/, '')
  if (path.toLowerCase().endsWith('/api')) path = path.slice(0, -4)
  return `${url.protocol}//${url.host}${path}`
}
