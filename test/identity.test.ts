import { expect } from 'chai'
import { InvalidServerUrlError, normalizeServerUrl } from '../src/index.js'

describe('normalizeServerUrl', () => {
  it('defaults to https://', () => {
    expect(normalizeServerUrl('trifouillis.fr')).to.equal('https://trifouillis.fr')
  })

  it('keeps explicit http (local network, development)', () => {
    expect(normalizeServerUrl('http://192.168.1.10:3000')).to.equal('http://192.168.1.10:3000')
  })

  it('strips the trailing slash and the /api suffix', () => {
    expect(normalizeServerUrl('https://trifouillis.fr/')).to.equal('https://trifouillis.fr')
    expect(normalizeServerUrl('https://trifouillis.fr/api')).to.equal('https://trifouillis.fr')
    expect(normalizeServerUrl('https://trifouillis.fr/api/')).to.equal('https://trifouillis.fr')
  })

  it('lowercases the host and tolerates surrounding whitespace', () => {
    expect(normalizeServerUrl('  HTTPS://Trifouillis.FR  ')).to.equal('https://trifouillis.fr')
  })

  it('preserves a non-/api path (server behind a subpath)', () => {
    expect(normalizeServerUrl('https://asso.fr/organic')).to.equal('https://asso.fr/organic')
  })

  it('rejects an empty string or a non-http(s) scheme', () => {
    expect(() => normalizeServerUrl('')).to.throw(InvalidServerUrlError)
    expect(() => normalizeServerUrl('ftp://x.fr')).to.throw(InvalidServerUrlError)
  })
})
