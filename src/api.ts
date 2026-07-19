/**
 * DTOs of the `/api/v1` REST contract — the exact request and response bodies
 * every compatible server must speak. See PROTOCOL.md §5 for semantics
 * (authentication, error cases, verification duties).
 */

import type { BlockWire, PublicKeyHex, TxWire } from './wire.js'

/** Machine-readable error codes carried alongside HTTP status codes. */
export type ApiErrorCode =
  | 'INVALID_TX'
  | 'INVALID_CHAIN'
  | 'TX_NOT_IN_CHAIN'
  | 'UNKNOWN_SENDER'
  | 'UNKNOWN_USER'
  | 'INVALID_SIGNATURE'
  | 'DEVICE_REVOKED'
  | 'ALREADY_CASHED'

/** Error body returned with any non-2xx response. */
export interface ApiError {
  error: string
  code?: ApiErrorCode
}

// ── GET /api/v1/info ──────────────────────────────────────────────────────────

export interface InfoResponse {
  protocolVersion: number
  apiVersion: string
  /** human-readable server name, shown on the server-selection screen */
  name: string
  serverPk: PublicKeyHex
  /** public key of the core ecosystem of this server (null until Phase 2) */
  corePk: PublicKeyHex | null
  stats: { users: number }
}

// ── GET /api/v1/servers ───────────────────────────────────────────────────────

/** One entry of the known-servers directory. */
export interface ServerListEntry {
  name: string
  url: string
}

export type ServersResponse = ServerListEntry[]

// ── POST /api/v1/users/register ───────────────────────────────────────────────

export interface RegisterBody {
  publickey: PublicKeyHex
  name: string
  mail: string
  /** LOGIN password (bcrypted server-side). Never the encryption password. */
  password: string
  /** ISO date of birth, e.g. "1990-03-15" */
  birthdate: string
  /** the secret key AES-encrypted client-side — opaque to the server */
  secretkey: string
  /** the chain holding exactly one BirthBlock awaiting validation */
  blocks: BlockWire[]
}

export interface RegisterResponse {
  publickey: PublicKeyHex
  /** the validated chain (server-signed in genesis mode) */
  blocks: BlockWire[]
  devicetoken: string
}

// ── POST /api/v1/users/login ──────────────────────────────────────────────────

export interface LoginBody {
  mail: string
  password: string
}

/** A successful login rotates the devicetoken: the previous device is revoked. */
export interface LoginResponse {
  publickey: PublicKeyHex
  name: string
  mail: string
  /** the AES-encrypted secret key, exactly as uploaded */
  secretkey: string
  blocks: BlockWire[]
  devicetoken: string
}

// ── PUT /api/v1/users/save  (block-auth) ──────────────────────────────────────

export interface SaveBlockBody {
  publickey: PublicKeyHex
  block: BlockWire
  devicetoken: string
}

// ── PUT /api/v1/users/sign  (block-auth) ──────────────────────────────────────

export interface SignBlockBody {
  publickey: PublicKeyHex
  block: BlockWire
}

// ── POST /api/v1/users/password  (timestamp-auth) ─────────────────────────────

export interface PasswordChangeBody {
  publickey: PublicKeyHex
  /** Unix timestamp (seconds) also used by the timestamp-auth signature */
  timestamp: number
  newpassword: string
  /** the secret key re-encrypted client-side with the new password */
  secretkey: string
}

// ── POST /api/v1/tx/send ──────────────────────────────────────────────────────

/**
 * The server MUST cross-verify before queueing: load the sender's saved chain,
 * assert it is valid, and check the transaction exists in its history.
 */
export interface TxSendBody {
  tx: TxWire
}

// ── GET /api/v1/tx/list  (timestamp-auth) ─────────────────────────────────────

export type TxListResponse = TxWire[]

// ── POST /api/v1/tx/verify ────────────────────────────────────────────────────

export interface TxVerifyBody {
  tx: TxWire
}

export type TxVerifyStatus = 'confirmed' | 'pending' | 'invalid' | 'unknown-sender'

export interface TxVerifyResponse {
  status: TxVerifyStatus
}

// ── POST /api/v1/papers/cash ──────────────────────────────────────────────────

/** The full PAPER transaction is required — the server verifies it before registering the hash. */
export interface PapersCashBody {
  tx: TxWire
}

// ── GET /api/v1/papers/isCashed?hash=… ────────────────────────────────────────

export interface IsCashedResponse {
  id: number | string
}
