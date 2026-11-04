import { expect } from 'chai'
import { hashRequestAuth, type RequestAuthFields } from '../src/index.js'

const REQUEST: RequestAuthFields = {
  method: 'POST',
  path: '/api/v1/users/password',
  timestamp: 1767225600,
  nonce: '00112233445566778899aabbccddeeff',
  body: '{"newpassword":"x"}',
  serverPk: '03e7e050c53dcaba20afd83512b355cd0b966fa4af726c1d6cee75b2c11a29f189',
  publickey: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
}

describe('hashRequestAuth', () => {
  it('should give the same hash for the same request', () => {
    expect(hashRequestAuth({ ...REQUEST })).to.deep.equal(hashRequestAuth({ ...REQUEST }))
  })

  it('should change when the method changes', () => {
    expect(hashRequestAuth({ ...REQUEST, method: 'GET' })).to.not.deep.equal(hashRequestAuth(REQUEST))
  })

  it('should change when the path changes', () => {
    expect(hashRequestAuth({ ...REQUEST, path: '/api/v1/tx/list' })).to.not.deep.equal(hashRequestAuth(REQUEST))
  })

  it('should change when the timestamp changes', () => {
    expect(hashRequestAuth({ ...REQUEST, timestamp: 1767225601 })).to.not.deep.equal(hashRequestAuth(REQUEST))
  })

  it('should change when the nonce changes', () => {
    expect(hashRequestAuth({ ...REQUEST, nonce: 'ffeeddccbbaa99887766554433221100' })).to.not.deep.equal(hashRequestAuth(REQUEST))
  })

  it('should change when the body changes', () => {
    expect(hashRequestAuth({ ...REQUEST, body: '{"newpassword":"y"}' })).to.not.deep.equal(hashRequestAuth(REQUEST))
  })

  it('should change when the server changes', () => {
    expect(hashRequestAuth({ ...REQUEST, serverPk: '0359d53f259715320cb6d3ca514ce75dbebad95ac1172a2f82132389c9cae27560' })).to.not.deep.equal(hashRequestAuth(REQUEST))
  })

  it('should change when the publickey changes', () => {
    expect(hashRequestAuth({ ...REQUEST, publickey: '0306ffd8f4fe843f5f7183179dcf36f550326813f56ec824911abca9c9d1cd7834' })).to.not.deep.equal(hashRequestAuth(REQUEST))
  })

  it('should give the same hash whatever the case of the method', () => {
    expect(hashRequestAuth({ ...REQUEST, method: 'post' })).to.deep.equal(hashRequestAuth(REQUEST))
  })
})
