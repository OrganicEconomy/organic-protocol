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

/**
 * Block types (see PROTOCOL.md §2.2). Mirrors organic-money's BLOCKTYPE —
 * this is the block's own `t` field, not to be confused with TxType above.
 * CITIZEN/CITIZENBIRTH/CITIZENINIT carry economic experience (`e` on
 * BlockWire); the ECOSYSTEM* kinds don't.
 */
export enum BlockType {
  CITIZEN = 1,
  ECOSYSTEM = 2,
  CITIZENBIRTH = 3,
  CITIZENINIT = 4,
  ECOSYSTEMBIRTH = 5,
  ECOSYSTEMINIT = 6,
}

/** Date as a YYYYMMDD integer, e.g. 20260719. */
export type IntDate = number

/**
 * Money unit id (`YYYYMMDDXXX`, e.g. 20260719003) or invest unit id
 * (`YYYYMMDD9XXX`, e.g. 202607199003 — the `9` separator marks invests).
 * The creation date is embedded in the id.
 */
export type UnitId = number

/**
 * Wire representation of a `UnitId[]`: each id packed into 5 big-endian
 * bytes (comfortably covers every possible money/invest id), concatenated,
 * then base64-encoded. An empty array is the empty string. A plain JSON
 * number array costs 12 bytes per id (11-12 decimal digits + a separator)
 * for ~5 bytes of actual information — this roughly halves the size of a
 * transaction or block on the wire, which matters most for QR-encoded
 * paper bills. Mirrors `packUnitIds`/`unpackUnitIds` in organic-money.
 */
export type PackedUnitIds = string

/** Compressed SECP256K1 public key, hex-encoded (33 bytes → 66 chars). */
export type PublicKeyHex = string

/** DER-encoded SECP256K1 signature, hex-encoded. */
export type SignatureHex = string

/**
 * A transaction in wire format (short field names for compactness).
 * Field meanings: v=version, d=date, t=type, p=target, s=signer,
 * m=money ids, i=invest ids, h=signature.
 *
 * Ecosystem-related types (see PROTOCOL.md §3) carry extra fields, all part
 * of the signed preimage (not cosmetic metadata):
 *   q — ratio (SETACTOR) or spending cap, -1 = unlimited (SETPAYER)
 *   e — target ecosystem's public key (SETADMIN/SETACTOR/SETPAYER/
 *       UNSETADMIN/UNSETACTOR/UNSETPAYER/PAYERORDER)
 *   x — EARN only: signature of the PayerOrder it fulfills, present only
 *       when produced by order() (absent for distributeSalary()/earn())
 */
export interface TxWire {
  v: number
  d: IntDate
  t: TxType
  p: PublicKeyHex
  s: PublicKeyHex
  m: PackedUnitIds
  i: PackedUnitIds
  h: SignatureHex
  q?: number
  e?: PublicKeyHex
  x?: SignatureHex
}

/**
 * A sealed (or open) block in wire format.
 * Field meanings: v=version, d=closedate, p=previous block signature,
 * s=signer, m=available money at seal time, i=available invests,
 * t=block type (see BlockType — NOT a total, despite the letter), r=merkle
 * root, h=block signature, x=transactions.
 *
 * e = cumulative economic experience, present only when `t` is a citizen
 * block type (CITIZEN/CITIZENBIRTH/CITIZENINIT) — ecosystem blocks have no
 * experience at all.
 */
export interface BlockWire {
  v: number
  d: IntDate
  p: string
  s: PublicKeyHex
  m: PackedUnitIds
  i: PackedUnitIds
  t: BlockType
  r: string
  h: SignatureHex
  x: TxWire[]
  e?: number
}

const isHex = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-fA-F]*$/.test(s)

const isPackedUnitIds = (s: unknown): s is PackedUnitIds =>
  typeof s === 'string' && /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s)

/** Types requiring both q (ratio/cap) and e (target ecosystem). */
const TX_TYPES_WITH_Q_AND_E: TxType[] = [TxType.SETACTOR, TxType.SETPAYER]
/** Types requiring e (target ecosystem) alone. */
const TX_TYPES_WITH_E_ONLY: TxType[] = [
  TxType.SETADMIN, TxType.UNSETADMIN, TxType.UNSETACTOR, TxType.UNSETPAYER, TxType.PAYERORDER,
]

/** Structural check that an unknown value is a well-formed TxWire, including its type-specific fields. */
export function isTxWire(o: unknown): o is TxWire {
  if (typeof o !== 'object' || o === null) return false
  const t = o as Record<string, unknown>
  if (!(
    typeof t.v === 'number' &&
    typeof t.d === 'number' &&
    Number.isInteger(t.d) &&
    typeof t.t === 'number' &&
    t.t >= TxType.INIT &&
    t.t <= TxType.EARN &&
    isHex(t.p) &&
    isHex(t.s) &&
    isPackedUnitIds(t.m) &&
    isPackedUnitIds(t.i) &&
    isHex(t.h)
  )) return false

  const type = t.t as TxType
  if (TX_TYPES_WITH_Q_AND_E.includes(type)) {
    return typeof t.q === 'number' && isHex(t.e) && t.x === undefined
  }
  if (TX_TYPES_WITH_E_ONLY.includes(type)) {
    return t.q === undefined && isHex(t.e) && t.x === undefined
  }
  if (type === TxType.EARN) {
    return t.q === undefined && t.e === undefined && (t.x === undefined || isHex(t.x))
  }
  // INIT/CREATE/PAY/ENGAGE/PAPER: none of q/e/x apply.
  return t.q === undefined && t.e === undefined && t.x === undefined
}

/** Block types carrying economic experience (`e`) — citizen blocks only. */
const BLOCK_TYPES_WITH_EXPERIENCE: BlockType[] = [BlockType.CITIZEN, BlockType.CITIZENBIRTH, BlockType.CITIZENINIT]

/** Structural check that an unknown value is a well-formed BlockWire. */
export function isBlockWire(o: unknown): o is BlockWire {
  if (typeof o !== 'object' || o === null) return false
  const b = o as Record<string, unknown>
  if (!(
    typeof b.v === 'number' &&
    typeof b.d === 'number' &&
    isHex(b.p) &&
    isHex(b.s) &&
    isPackedUnitIds(b.m) &&
    isPackedUnitIds(b.i) &&
    typeof b.t === 'number' &&
    b.t >= BlockType.CITIZEN &&
    b.t <= BlockType.ECOSYSTEMINIT &&
    isHex(b.r) &&
    isHex(b.h) &&
    Array.isArray(b.x) &&
    b.x.every(isTxWire)
  )) return false

  const hasExperience = BLOCK_TYPES_WITH_EXPERIENCE.includes(b.t as BlockType)
  return hasExperience ? typeof b.e === 'number' : b.e === undefined
}
