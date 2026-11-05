import { expect } from 'chai'
import { createRequire } from 'node:module'

describe('organic-protocol package', () => {
  it('should be loadable with require, as CommonJS consumers like Playwright do', () => {
    const require = createRequire(import.meta.url)
    expect(require('organic-protocol').hashRequestAuth).to.be.a('function')
  })
})
