/**
 * QR code formats — the inter-instance standard for camera-to-screen exchange.
 *
 * Every Organic Money QR is the string `OM<version>:<TYPE>:<JSON payload>`.
 * The prefix lives OUTSIDE the JSON so any reader can dispatch (or reject an
 * unknown version) without parsing. Current version: 1.
 *
 * Types:
 *   CT — contact card         {pk, url, n, e?}
 *   TX — offline payment      {tx, url}
 *   BR — validation request   {pk, url, n}
 *   PP — paper money          {tx}
 */

import { isTxWire, TxType, type PublicKeyHex, type TxWire } from './wire.js'

/** Current QR format version (independent of PROTOCOL_VERSION on purpose). */
export const QR_VERSION = 1

export type QrType = 'CT' | 'TX' | 'BR' | 'PP'

/** Contact card: shown by `account-details`, scanned by `add-contact`. */
export interface ContactQrPayload {
  pk: PublicKeyHex
  url: string
  /** display name */
  n: string
  /** true when the contact is an ecosystem */
  e?: boolean
}

/** Offline payment: a signed PAY transaction handed camera-to-screen. */
export interface OfflineTxQrPayload {
  tx: TxWire
  /** root URL of the PAYER's server, for deferred verification (tx/verify) */
  url: string
}

/** Validation request: shown by a candidate citizen, scanned by a core-ecosystem admin. */
export interface ValidationQrPayload {
  pk: PublicKeyHex
  url: string
  n: string
}

/** Paper money: a signed PAPER transaction printed on a bill. */
export interface PaperQrPayload {
  tx: TxWire
}

export type DecodedQr =
  | { type: 'CT'; payload: ContactQrPayload }
  | { type: 'TX'; payload: OfflineTxQrPayload }
  | { type: 'BR'; payload: ValidationQrPayload }
  | { type: 'PP'; payload: PaperQrPayload }

export class QrError extends Error {}

/** The scanned QR is an Organic Money QR of a version this build doesn't speak. */
export class UnsupportedQrVersionError extends QrError {
  constructor(public readonly version: number) {
    super(`Unsupported Organic Money QR version ${version} (this app speaks version ${QR_VERSION}). Please update the app.`)
    this.name = 'UnsupportedQrVersionError'
  }
}

/** The scanned text is not a valid Organic Money QR. */
export class InvalidQrError extends QrError {
  constructor(reason: string) {
    super(`Invalid Organic Money QR: ${reason}`)
    this.name = 'InvalidQrError'
  }
}

const PREFIX_RE = /^OM(\d+):([A-Z]{2}):([\s\S]*)$/

const encode = (type: QrType, payload: unknown): string =>
  `OM${QR_VERSION}:${type}:${JSON.stringify(payload)}`

export const encodeContactQr = (payload: ContactQrPayload): string => encode('CT', payload)
export const encodeOfflineTxQr = (payload: OfflineTxQrPayload): string => encode('TX', payload)
export const encodeValidationQr = (payload: ValidationQrPayload): string => encode('BR', payload)
export const encodePaperQr = (payload: PaperQrPayload): string => encode('PP', payload)

const isNonEmptyString = (s: unknown): s is string => typeof s === 'string' && s.length > 0

function assertContact(p: Record<string, unknown>): asserts p is Record<string, unknown> & ContactQrPayload {
  if (!isNonEmptyString(p.pk) || !isNonEmptyString(p.url) || !isNonEmptyString(p.n))
    throw new InvalidQrError('contact payload requires pk, url and n')
  if (p.e !== undefined && typeof p.e !== 'boolean')
    throw new InvalidQrError('contact field e must be a boolean')
}

function assertValidation(p: Record<string, unknown>): asserts p is Record<string, unknown> & ValidationQrPayload {
  if (!isNonEmptyString(p.pk) || !isNonEmptyString(p.url) || !isNonEmptyString(p.n))
    throw new InvalidQrError('validation payload requires pk, url and n')
}

function assertTx(p: Record<string, unknown>, requireUrl: boolean, expectedType?: TxType): void {
  if (!isTxWire(p.tx)) throw new InvalidQrError('payload requires a well-formed tx')
  if (requireUrl && !isNonEmptyString(p.url)) throw new InvalidQrError('payload requires the payer server url')
  if (expectedType !== undefined && (p.tx as TxWire).t !== expectedType)
    throw new InvalidQrError(`tx must be of type ${TxType[expectedType]}`)
}

/**
 * Decode any Organic Money QR.
 * @throws UnsupportedQrVersionError for a QR of a newer/unknown version —
 *         the app must tell the user to update, never guess.
 * @throws InvalidQrError for anything that is not a well-formed OM QR.
 */
export function decodeQr(text: string): DecodedQr {
  const match = PREFIX_RE.exec(text.trim())
  if (!match) throw new InvalidQrError('not an OM<v>:<TYPE>:<payload> string')
  const version = Number(match[1])
  if (version !== QR_VERSION) throw new UnsupportedQrVersionError(version)
  const type = match[2] as string
  let payload: unknown
  try {
    payload = JSON.parse(match[3] as string)
  } catch {
    throw new InvalidQrError('payload is not valid JSON')
  }
  if (typeof payload !== 'object' || payload === null)
    throw new InvalidQrError('payload must be a JSON object')
  const p = payload as Record<string, unknown>

  switch (type) {
    case 'CT':
      assertContact(p)
      return { type: 'CT', payload: { pk: p.pk, url: p.url, n: p.n, ...(p.e !== undefined ? { e: p.e } : {}) } }
    case 'TX':
      assertTx(p, true, TxType.PAY)
      return { type: 'TX', payload: { tx: p.tx as TxWire, url: p.url as string } }
    case 'BR':
      assertValidation(p)
      return { type: 'BR', payload: { pk: p.pk, url: p.url, n: p.n } }
    case 'PP':
      assertTx(p, false, TxType.PAPER)
      return { type: 'PP', payload: { tx: p.tx as TxWire } }
    default:
      throw new InvalidQrError(`unknown QR type "${type}"`)
  }
}
