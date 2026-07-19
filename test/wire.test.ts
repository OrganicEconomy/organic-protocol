import { expect } from 'chai'
import { isBlockWire, isTxWire, TxType, type BlockWire, type TxWire } from '../src/index.js'

const tx: TxWire = {
  v: 1,
  d: 20260719,
  t: TxType.PAY,
  p: '03' + 'cd'.repeat(32),
  s: '02' + 'ab'.repeat(32),
  m: [20260719001],
  i: [],
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
    expect(isTxWire({ ...tx, m: 'nope' })).to.equal(false)
    expect(isTxWire({ ...tx, p: 'zz-not-hex' })).to.equal(false)
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
    m: [20260719001],
    i: [202607199001],
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
