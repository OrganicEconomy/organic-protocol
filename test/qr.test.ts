import { expect } from 'chai'
import {
  decodeQr,
  encodeContactQr,
  encodeOfflineTxQr,
  encodePaperQr,
  encodeValidationQr,
  InvalidQrError,
  TxType,
  UnsupportedQrVersionError,
  type TxWire,
} from '../src/index.js'

const payTx: TxWire = {
  v: 1,
  d: 20260719,
  t: TxType.PAY,
  p: '03' + 'cd'.repeat(32),
  s: '02' + 'ab'.repeat(32),
  m: 'BLeiCZkEt6IJmg==', // packUnitIds([20260719001, 20260719002]) — organic-money
  i: '',
  h: '30450221' + 'ee'.repeat(32),
}

const paperTx: TxWire = { ...payTx, t: TxType.PAPER }

describe('QR round-trips', () => {
  it('contact (CT)', () => {
    const qr = encodeContactQr({ pk: payTx.s, url: 'https://trifouillis.fr', n: 'Alice' })
    expect(qr.startsWith('OM1:CT:')).to.equal(true)
    const decoded = decodeQr(qr)
    expect(decoded.type).to.equal('CT')
    if (decoded.type === 'CT') {
      expect(decoded.payload.pk).to.equal(payTx.s)
      expect(decoded.payload.n).to.equal('Alice')
      expect(decoded.payload.e).to.equal(undefined)
    }
  })

  it('ecosystem contact (CT with e flag)', () => {
    const qr = encodeContactQr({ pk: payTx.s, url: 'https://x.fr', n: 'Coop', e: true })
    const decoded = decodeQr(qr)
    if (decoded.type === 'CT') expect(decoded.payload.e).to.equal(true)
  })

  it('offline payment (TX)', () => {
    const qr = encodeOfflineTxQr({ tx: payTx, url: 'https://trifouillis.fr' })
    const decoded = decodeQr(qr)
    expect(decoded.type).to.equal('TX')
    if (decoded.type === 'TX') {
      expect(decoded.payload.tx).to.deep.equal(payTx)
      expect(decoded.payload.url).to.equal('https://trifouillis.fr')
    }
  })

  it('validation request (BR)', () => {
    const qr = encodeValidationQr({ pk: payTx.s, url: 'https://trifouillis.fr', n: 'Basile' })
    const decoded = decodeQr(qr)
    expect(decoded.type).to.equal('BR')
    if (decoded.type === 'BR') expect(decoded.payload.n).to.equal('Basile')
  })

  it('paper bill (PP)', () => {
    const qr = encodePaperQr({ tx: paperTx })
    const decoded = decodeQr(qr)
    expect(decoded.type).to.equal('PP')
    if (decoded.type === 'PP') expect(decoded.payload.tx).to.deep.equal(paperTx)
  })
})

describe('size', () => {
  it('packing money ids keeps a large paper bill meaningfully smaller than the old array format', () => {
    // organic-protocol doesn't implement packing itself (that's organic-money's
    // packUnitIds) — build the same packed buffer by hand just to measure the wire size.
    const ids = Array.from({ length: 200 }, (_, i) => 20260721000 + i)
    const packed = Buffer.alloc(ids.length * 5)
    ids.forEach((id, idx) => packed.writeUIntBE(id, idx * 5, 5))
    const m = packed.toString('base64')

    const packedQr = encodePaperQr({ tx: { ...paperTx, m, i: '' } })
    const oldFormatQr = `OM1:PP:${JSON.stringify({ tx: { ...paperTx, m: ids, i: [] } })}`

    // measured ratio is ~0.60; 0.65 leaves headroom without being a no-op assertion
    expect(packedQr.length).to.be.below(oldFormatQr.length * 0.65)
  })
})

describe('rejections', () => {
  it('unknown version OM2 → UnsupportedQrVersionError', () => {
    expect(() => decodeQr('OM2:CT:{"pk":"a","url":"b","n":"c"}')).to.throw(UnsupportedQrVersionError)
  })

  it('the version error carries the encountered version', () => {
    try {
      decodeQr('OM7:CT:{}')
      expect.fail('should have thrown')
    } catch (e) {
      expect(e).to.be.instanceOf(UnsupportedQrVersionError)
      expect((e as UnsupportedQrVersionError).version).to.equal(7)
    }
  })

  it('arbitrary text → InvalidQrError', () => {
    expect(() => decodeQr('https://example.org/not-an-om-qr')).to.throw(InvalidQrError)
  })

  it('unknown type OM1:ZZ → InvalidQrError', () => {
    expect(() => decodeQr('OM1:ZZ:{}')).to.throw(InvalidQrError)
  })

  it('invalid JSON → InvalidQrError', () => {
    expect(() => decodeQr('OM1:CT:{not json')).to.throw(InvalidQrError)
  })

  it('contact without url → InvalidQrError', () => {
    expect(() => decodeQr('OM1:CT:{"pk":"02ab","n":"Alice"}')).to.throw(InvalidQrError)
  })

  it('TX without the payer server url → InvalidQrError', () => {
    expect(() => decodeQr(`OM1:TX:${JSON.stringify({ tx: payTx })}`)).to.throw(InvalidQrError)
  })

  it('TX whose tx is not a PAY → InvalidQrError', () => {
    const qr = `OM1:TX:${JSON.stringify({ tx: paperTx, url: 'https://x.fr' })}`
    expect(() => decodeQr(qr)).to.throw(InvalidQrError)
  })

  it('PP whose tx is not a PAPER → InvalidQrError', () => {
    expect(() => decodeQr(`OM1:PP:${JSON.stringify({ tx: payTx })}`)).to.throw(InvalidQrError)
  })

  it('TX with a malformed tx → InvalidQrError', () => {
    const bad = { tx: { ...payTx, m: 'not-an-array' }, url: 'https://x.fr' }
    expect(() => decodeQr(`OM1:TX:${JSON.stringify(bad)}`)).to.throw(InvalidQrError)
  })
})
