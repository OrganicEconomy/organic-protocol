import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'

export const REQUEST_AUTH_HEADERS = {
  publickey: 'x-organic-publickey',
  timestamp: 'x-organic-timestamp',
  nonce: 'x-organic-nonce',
  signature: 'x-signature',
} as const

export const REQUEST_AUTH_TOLERANCE_SECONDS = 300

export interface RequestAuthFields {
  method: string
  path: string
  timestamp: number
  nonce: string
  body: string
  serverPk: string
  publickey: string
}

export function hashRequestAuth(fields: RequestAuthFields): Uint8Array {
  const signedFields = [
    fields.method.toUpperCase(),
    fields.path,
    String(fields.timestamp),
    fields.nonce,
    hashText(fields.body),
    fields.serverPk,
    fields.publickey,
  ]
  return sha256(utf8ToBytes(signedFields.join('\n')))
}

function hashText(text: string): string {
  return bytesToHex(sha256(utf8ToBytes(text)))
}
