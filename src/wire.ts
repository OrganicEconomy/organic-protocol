/**
 * Wire formats of the Organic Money protocol — the exact shapes that travel
 * between instances (app ↔ server, QR codes, blockchain exports).
 * Mirrors the serialization implemented by organic-money.js.
 */

/** Current protocol version. Bump only on breaking wire-format changes. */
export const PROTOCOL_VERSION = 1

/** Transaction types (see PROTOCOL.md §3). */
export enum TxType {
  INIT = 1,
  CREATE = 2,
  PAY = 3,
  ENGAGE = 4,
  PAPER = 5,
  SETADMIN = 6,
  SETACTOR = 7,
  SETPAYER = 8,
  UNSETADMIN = 9,
  UNSETACTOR = 10,
  UNSETPAYER = 11,
  PAYERORDER = 12,
  EARN = 13,
}

/** Date as a YYYYMMDD integer, e.g. 20260719. */
export type IntDate = number

/**
 * Money unit id (`YYYYMMDDXXX`, e.g. 20260719003) or invest unit id
 * (`YYYYMMDD9XXX`, e.g. 202607199003 — the `9` separator marks invests).
 * The creation date is embedded in the id.
 */
export type UnitId = number

/** Compressed SECP256K1 public key, hex-encoded (33 bytes → 66 chars). */
export type PublicKeyHex = string

/** DER-encoded SECP256K1 signature, hex-encoded. */
export type SignatureHex = string

/**
 * A transaction in wire format (short field names for compactness).
 * Field meanings: v=version, d=date, t=type, p=target, s=signer,
 * m=money ids, i=invest ids, h=signature.
 */
export interface TxWire {
  v: number
  d: IntDate
  t: TxType
  p: PublicKeyHex
  s: PublicKeyHex
  m: UnitId[]
  i: UnitId[]
  h: SignatureHex
}

/**
 * A sealed (or open) block in wire format.
 * Field meanings: v=version, d=closedate, p=previous block signature,
 * s=signer, m=available money at seal time, i=available invests,
 * t=total (economic experience), r=merkle root, h=block signature,
 * x=transactions.
 */
export interface BlockWire {
  v: number
  d: IntDate
  p: string
  s: PublicKeyHex
  m: UnitId[]
  i: UnitId[]
  t: number
  r: string
  h: SignatureHex
  x: TxWire[]
}

const isHex = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-fA-F]*$/.test(s)

const isUnitIdArray = (a: unknown): a is UnitId[] =>
  Array.isArray(a) && a.every((n) => typeof n === 'number' && Number.isInteger(n))

/** Structural check that an unknown value is a well-formed TxWire. */
export function isTxWire(o: unknown): o is TxWire {
  if (typeof o !== 'object' || o === null) return false
  const t = o as Record<string, unknown>
  return (
    typeof t.v === 'number' &&
    typeof t.d === 'number' &&
    Number.isInteger(t.d) &&
    typeof t.t === 'number' &&
    t.t >= TxType.INIT &&
    t.t <= TxType.EARN &&
    isHex(t.p) &&
    isHex(t.s) &&
    isUnitIdArray(t.m) &&
    isUnitIdArray(t.i) &&
    isHex(t.h)
  )
}

/** Structural check that an unknown value is a well-formed BlockWire. */
export function isBlockWire(o: unknown): o is BlockWire {
  if (typeof o !== 'object' || o === null) return false
  const b = o as Record<string, unknown>
  return (
    typeof b.v === 'number' &&
    typeof b.d === 'number' &&
    isHex(b.p) &&
    isHex(b.s) &&
    isUnitIdArray(b.m) &&
    isUnitIdArray(b.i) &&
    typeof b.t === 'number' &&
    isHex(b.r) &&
    isHex(b.h) &&
    Array.isArray(b.x) &&
    b.x.every(isTxWire)
  )
}
