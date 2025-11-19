import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { isPascalCase } from '../../../lib/utils/naming.js'

describe('utils/naming', () => {
  it('validates PascalCase strings', () => {
    assert.equal(isPascalCase('MyComponent'), true)
    assert.equal(isPascalCase('with123Numbers'), false)
    assert.equal(isPascalCase('lowercase'), false)
    assert.equal(isPascalCase(''), false)
    assert.equal(isPascalCase(null), false)
  })
})
