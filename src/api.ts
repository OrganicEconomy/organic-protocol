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
  /** the signer proved their identity but isn't currently a core admin */
  | 'NOT_CORE_ADMIN'
  /** approve attempted on an account that is already active */
  | 'ALREADY_VALIDATED'

/** A citizen or ecosystem account's standing (Phase 2). */
export type MembershipStatus = 'pending-validation' | 'active' | 'rejected'

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
  /** 'active' only for the server's very first account (open genesis); 'pending-validation' otherwise */
  status: MembershipStatus
  /** the birth-only chain if pending, or the validated chain if this was the open-genesis account */
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
  status: MembershipStatus
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

// ── POST /api/v1/ecosystems  (timestamp-auth as the founding citizen) ────────

/**
 * Creation is free and instant (§0.3 of Phase-2.md): the server generates the
 * ecosystem's own key, self-signs its birth block, and self-validates with
 * that same key — no separate approval step. founderPk is only the
 * authenticated requester, recorded as validatorpk for attribution; it is
 * not the signer of the resulting chain.
 */
export interface EcosystemCreateBody {
  founderPk: PublicKeyHex
  timestamp: number
  name: string
  description?: string
  lat?: number
  lng?: number
}

export interface EcosystemCreateResponse {
  publickey: PublicKeyHex
  blocks: BlockWire[]
  /** true only for the very first ecosystem ever created on this server */
  iscore: boolean
}

// ── GET /api/v1/ecosystems?lat&lng&radiusKm  (public) ─────────────────────────

/** Directory entry — metadata lives server-side, not on-chain. */
export interface EcosystemListEntry {
  publickey: PublicKeyHex
  name: string
  description: string | null
  lat: number | null
  lng: number | null
  iscore: boolean
  /** present only when the request carried lat/lng */
  distanceKm?: number
}

export type EcosystemListResponse = EcosystemListEntry[]

// ── GET /api/v1/ecosystems/mine?publickey=…  (public) ─────────────────────────

/**
 * Roles are re-carried onto every new block (see organic-money's
 * EcosystemBlockchain), so the server only ever needs to look at each
 * ecosystem's current last block to answer this — no full-chain replay.
 * Public: ecosystem membership is already derivable by anyone from each
 * ecosystem's own (public) chain — this just saves the client from having
 * to query every ecosystem on the server one by one to find out.
 */
export interface MyEcosystemEntry {
  publickey: PublicKeyHex
  name: string
  role: 'admin' | 'actor' | 'payer'
}

export type MyEcosystemsResponse = MyEcosystemEntry[]

// ── GET /api/v1/ecosystems/:pk  (public) ──────────────────────────────────────

export interface EcosystemInfoResponse {
  publickey: PublicKeyHex
  name: string
  description: string | null
  lat: number | null
  lng: number | null
  iscore: boolean
  blocks: BlockWire[]
}

// ── PUT /api/v1/ecosystems/:pk/meta  (timestamp-auth, admin only) ─────────────

export interface EcosystemMetaUpdateBody {
  publickey: PublicKeyHex
  timestamp: number
  name?: string
  description?: string
  lat?: number
  lng?: number
}

// ── POST /api/v1/ecosystems/:pk/tx ────────────────────────────────────────────

/**
 * Generic ingress for any citizen-signed transaction targeting this
 * ecosystem: PAY, ENGAGE, the role transactions (SETADMIN/SETACTOR/
 * SETPAYER/UNSET*), and PAYERORDER. Same cross-verification duty as
 * POST /tx/send (PROTOCOL.md §5.3), against the *signer's* own chain.
 * A PAYERORDER is executed immediately: the resulting payment is routed
 * exactly like a normal payment (queued for a citizen target, applied
 * directly for an ecosystem target on this same server) — there is no
 * separate "claim" step.
 */
export interface EcosystemTxBody {
  tx: TxWire
}

// ── POST /api/v1/ecosystems/:pk/distribute  (timestamp-auth, admin/payer) ────

/** Manual only (Phase 2) — no scheduled/automatic distribution. */
export interface EcosystemDistributeBody {
  publickey: PublicKeyHex
  timestamp: number
}

// ── Validations — citizens only (an ecosystem validates itself, §0.3) ────────

// ── GET /api/v1/validations  (timestamp-auth, core admin only) ───────────────

export interface ValidationListEntry {
  pk: PublicKeyHex
  name: string
  requestedAt: string
}

export type ValidationListResponse = ValidationListEntry[]

// ── GET /api/v1/validations/:pk  (timestamp-auth, core admin only) ───────────

/** The candidate's not-yet-validated chain, for the admin's device to locally call validateAccount(). */
export interface ValidationDetailResponse {
  name: string
  blocks: BlockWire[]
}

// ── GET /api/v1/validations/status/:pk  (public) ──────────────────────────────

export interface ValidationStatusResponse {
  status: MembershipStatus
}

// ── POST /api/v1/validations/:pk/approve  (block-auth) ────────────────────────

/**
 * block is the InitializationBlock the admin already signed locally with
 * their own key (requireBlockAuth already proves that signature). The
 * server's own job is the part signature-proof alone can't give it: check
 * the signer is *currently* one of the core ecosystem's admins.
 */
export interface ValidationApproveBody {
  publickey: PublicKeyHex
  block: BlockWire
}

// ── POST /api/v1/validations/:pk/reject  (timestamp-auth, core admin only) ───

export interface ValidationRejectBody {
  publickey: PublicKeyHex
  timestamp: number
  reason?: string
}
