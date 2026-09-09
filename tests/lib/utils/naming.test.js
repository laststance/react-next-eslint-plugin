import assert from 'node:assert/strict'
import { describe, test } from 'mocha'
import { isPascalCase } from '../../../lib/utils/naming.js'

describe('utils/naming', () => {
  test('validates PascalCase strings', () => {
    assert.equal(isPascalCase('MyComponent'), true)
    assert.equal(isPascalCase('with123Numbers'), false)
    assert.equal(isPascalCase('lowercase'), false)
    assert.equal(isPascalCase(''), false)
    assert.equal(isPascalCase(null), false)
  })
})
