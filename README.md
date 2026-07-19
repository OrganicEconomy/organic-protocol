# organic-protocol

> The shared protocol of the [Organic Economy](https://economie-organique.fr) — wire formats, QR codes and REST contracts, verified by the TypeScript compiler.

This package carries the **shapes** that travel between Organic Economy instances: transaction and block wire formats, the versioned QR standard (`OM1:CT/TX/BR/PP`) with its encode/decode functions, and the DTOs of the `/api/v1` REST contract. It contains **no cryptography** — that lives in [`organic-money`](https://www.npmjs.com/package/organic-money).

The [organic-webapp](https://github.com/GuziEconomy/organic-webapp) client and the [organic-webserver](https://github.com/GuziEconomy/organic-webserver) server both import this package, so any drift between what one sends and the other expects becomes a compile error instead of a silent bug. Third-party implementations should either import it or implement [PROTOCOL.md](PROTOCOL.md), which is the same standard in prose.

```bash
npm install organic-protocol
```

```ts
import { decodeQr, encodeContactQr, UnsupportedQrVersionError } from 'organic-protocol'

const qr = encodeContactQr({ pk: '02ab…', url: 'https://trifouillis.fr', n: 'Alice' })
const decoded = decodeQr(qr) // { type: 'CT', payload: { pk, url, n } }
```

## Development

```bash
npm install
npm run build   # tsc → dist/
npm test        # mocha + chai (via tsx)
```

## License

[MIT](LICENSE) — © suipotryot
