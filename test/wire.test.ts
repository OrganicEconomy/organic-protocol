import { expect } from 'chai'
import { isBlockWire, isTxWire, TxType, type BlockWire, type TxWire } from '../src/index.js'

// 'BLeiCZk=' / 'LyxUgxk=' are real packUnitIds([20260719001]) / packUnitIds([202607199001])
// output (organic-money) — organic-protocol only validates the wire shape, not the packing
// scheme itself, so any well-formed base64 string works as a fixture here.
const tx: TxWire = {
  v: 1,
  d: 20260719,
  t: TxType.PAY,
  p: '03' + 'cd'.repeat(32),
  s: '02' + 'ab'.repeat(32),
  m: 'BLeiCZk=',
  i: '',
  h: 'deadbeef',
}

describe('isTxWire', () => {
  it('accepts a well-formed transaction', () => {
    expect(isTxWire(tx)).to.equal(true)
  })

  it('rejects null, a missing field, a wrongly-typed field', () => {
    expect(isTxWire(null)).to.equal(false)
    const { h, ...withoutSignature } = tx
    expect(isTxWire(withoutSignature)).to.equal(false)
    expect(isTxWire({ ...tx, m: 'not base64 at all!' })).to.equal(false)
    expect(isTxWire({ ...tx, p: 'zz-not-hex' })).to.equal(false)
  })

  it('rejects the old array format for m/i', () => {
    expect(isTxWire({ ...tx, m: [20260719001] })).to.equal(false)
  })

  it('rejects an out-of-range transaction type (0, 14)', () => {
    expect(isTxWire({ ...tx, t: 0 })).to.equal(false)
    expect(isTxWire({ ...tx, t: 14 })).to.equal(false)
  })
})

describe('isBlockWire', () => {
  const block: BlockWire = {
    v: 1,
    d: 20260719,
    p: 'aa'.repeat(16),
    s: tx.s,
    m: 'BLeiCZk=',
    i: 'LyxUgxk=',
    t: 8,
    r: 'bb'.repeat(16),
    h: 'cc'.repeat(16),
    x: [tx],
  }

  it('accepts a well-formed block', () => {
    expect(isBlockWire(block)).to.equal(true)
  })

  it('rejects a block holding a malformed transaction', () => {
    expect(isBlockWire({ ...block, x: [{ ...tx, t: 99 }] })).to.equal(false)
  })
})
