# Organic Money — Inter-instance Protocol (v1)

This document is the **standard** every compatible implementation (app or server) must follow. The [`organic-protocol`](https://www.npmjs.com/package/organic-protocol) npm package is its exact TypeScript translation; JS/TS implementations should import it rather than reimplement. Cryptography (signatures, chains, encryption) is defined by [`organic-money`](https://www.npmjs.com/package/organic-money) and is not repeated here.

Protocol version: **1**. QR format version: **1** (independent, see §4).

---

## 1. Federated identity

A public key alone is not enough to reach someone in a decentralized network. An **identity** is always the pair:

```json
{ "pk": "<compressed SECP256K1 public key, hex>", "url": "<root URL of the referent server>" }
```

The `url` is the server's **root** URL (no `/api`, no trailing slash), normalized: `https` scheme by default (`http` tolerated when explicit — local networks, development), lowercase host. See `normalizeServerUrl`.

## 2. Wire formats

### 2.1 Transaction (`TxWire`)

```json
{ "v": 1, "d": 20260719, "t": 3, "p": "<target pk>", "s": "<signer pk>",
  "m": [20260719001], "i": [], "h": "<DER signature, hex>" }
```

| Field | Long name | Content |
|---|---|---|
| `v` | version | protocol version (1) |
| `d` | date | `YYYYMMDD` integer |
| `t` | type | transaction type (§3) |
| `p` | target | recipient's public key |
| `s` | signer | sender's public key |
| `m` | money | money unit ids (`YYYYMMDDXXX`) |
| `i` | invests | invest unit ids (`YYYYMMDD9XXX`) |
| `h` | signature | SECP256K1 DER signature, hex |

### 2.2 Block (`BlockWire`)

```json
{ "v": 1, "d": 20260719, "p": "<previous block signature>", "s": "<pk>",
  "m": [], "i": [], "t": 42, "r": "<merkle root>", "h": "<signature>", "x": [ …TxWire ] }
```

Here `t` is the **total** (cumulative economic experience); `p` is the previous block's signature (chain link); `x` is the transaction list.

## 3. Transaction types

| # | Type | # | Type |
|---|---|---|---|
| 1 | INIT | 8 | SETPAYER |
| 2 | CREATE | 9 | UNSETADMIN |
| 3 | PAY | 10 | UNSETACTOR |
| 4 | ENGAGE | 11 | UNSETPAYER |
| 5 | PAPER | 12 | PAYERORDER |
| 6 | SETADMIN | 13 | EARN |
| 7 | SETACTOR | | |

## 4. QR codes

Format: **`OM<version>:<TYPE>:<JSON payload>`** — the prefix lives outside the JSON so any reader can dispatch (or reject an unknown version) without parsing. Current version: `1`.

**Compatibility rule**: a reader encountering a version it does not speak MUST refuse cleanly ("please update the app") and MUST NEVER attempt a best-effort interpretation.

| Type | Shape | Usage |
|---|---|---|
| `CT` | `OM1:CT:{"pk","url","n","e"?}` | Contact card. `n` = display name; `e` = true for an ecosystem. |
| `TX` | `OM1:TX:{"tx":<PAY TxWire>,"url"}` | Offline payment, camera-to-screen. `url` = the PAYER's server, for deferred verification (§5, `tx/verify`). |
| `BR` | `OM1:BR:{"pk","url","n"}` | Validation request of a new citizen. Blocks are fetched via `GET {url}/api/v1/validations/{pk}` (Phase 2) — the QR is a pointer, not a container. |
| `PP` | `OM1:PP:{"tx":<PAPER TxWire>}` | Printed paper bill. |

Constraints: the `tx` of a `TX` is of type PAY; the one of a `PP` is of type PAPER.

## 5. REST API `/api/v1`

All routes live under `{url}/api/v1`. JSON bodies. Errors carry `{ "error": "<message>", "code": "<ApiErrorCode>"? }`.

### 5.1 Authentication schemes

**Block-auth** (`PUT /users/save`, `PUT /users/sign`) — `x-signature` header = signature of the submitted block's hash, by the account key:
`x-signature = signHash(block.hash(), sk)`.

**Timestamp-auth** (`GET /tx/list`, `POST /users/password`, …) — `x-signature` header = `signHash(sha256(publickey + ":" + timestamp), sk)` with `publickey` and `timestamp` (Unix seconds) passed as params/body. Tolerance: ±5 minutes, otherwise 401.

### 5.2 Endpoints (Phase 1)

| Method & route | Auth | Body → Response | Notes |
|---|---|---|---|
| `GET /info` | — | → `InfoResponse` | public identity card of the server |
| `GET /servers` | — | → `ServerListEntry[]` | directory of known servers |
| `POST /users/register` | — | `RegisterBody` → `RegisterResponse` | the `secretkey` arrives ENCRYPTED (opaque to the server); the password is bcrypted on arrival |
| `POST /users/login` | — | `LoginBody` → `LoginResponse` | **devicetoken rotation**: the previous device is revoked |
| `PUT /users/save` | block | `SaveBlockBody` → 200 | `409 DEVICE_REVOKED` when the devicetoken is no longer the active one |
| `PUT /users/sign` | block | `SignBlockBody` → 200 | the server signs the last block (bills, genesis) |
| `POST /users/password` | timestamp | `PasswordChangeBody` → 200 | updates bcrypt + re-encrypted sk, without reading anything |
| `POST /tx/send` | — | `TxSendBody` → 200 | **MANDATORY cross-verification** (§5.3) |
| `GET /tx/list` | timestamp | → `TxWire[]` | pending payments for the key |
| `POST /tx/verify` | — | `TxVerifyBody` → `TxVerifyResponse` | read-only; statuses: `confirmed` / `pending` / `invalid` / `unknown-sender` |
| `POST /papers/cash` | — | `PapersCashBody` → 200 | requires the full PAPER, verifies its crypto; `409 ALREADY_CASHED` |
| `GET /papers/isCashed?hash=` | — | → `IsCashedResponse` \| 404 | 404 = never cashed |

### 5.3 Cross-verification (server duty)

Before accepting on `tx/send` (and, in Phase 2, any ecosystem input), the server MUST:

1. verify the cryptographic validity of the transaction;
2. load the SAVED chain of the sender (`tx.s`) and validate it (`assertIsValid`);
3. verify the transaction exists in that chain's history (by its signature `h`).

Without step 3, an attacker can sign a transaction carrying units they do not own. Client-side consequence: the **`pay → save → send` order is strict**.

### 5.4 One account = one active device

The server issues an opaque `devicetoken` (UUID) at `register` and at every `login`; only the last one issued is valid. A `save` carrying a stale token receives `409 DEVICE_REVOKED` — the app must then switch to read-only and offer the restore flow. This mechanism is not cryptographic (identity is still proven by `x-signature`); it prevents the accidental fork of a chain across two devices.

### 5.5 Error codes

`INVALID_TX` · `INVALID_CHAIN` · `TX_NOT_IN_CHAIN` · `UNKNOWN_SENDER` · `UNKNOWN_USER` · `INVALID_SIGNATURE` · `DEVICE_REVOKED` · `ALREADY_CASHED`

## 6. Versioning

- **Protocol** (`PROTOCOL_VERSION`, `v` field of txs/blocks): bumped only on a wire-format break.
- **QR** (`QR_VERSION`, `OM<v>` prefix): bumped only on a QR payload break.
- **API** (`/api/v1`): a REST contract break creates `/api/v2`; `GET /info` announces the spoken versions.

The three evolve independently. Every implementation MUST announce its versions via `GET /info` and refuse cleanly what it does not speak.

---

*MIT license — © suipotryot. Phases 2 (ecosystems, validations) and 3 (federation) will extend this document without breaking v1.*
