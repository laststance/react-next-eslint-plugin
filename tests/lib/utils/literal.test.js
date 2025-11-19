import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { literalKind } from '../../../lib/utils/literal.js'

describe('utils/literal', () => {
  it('classifies inline literal expressions', () => {
    assert.equal(literalKind({ type: 'ObjectExpression' }), 'object')
    assert.equal(literalKind({ type: 'ArrayExpression' }), 'array')
    assert.equal(literalKind({ type: 'ArrowFunctionExpression' }), 'function')
    assert.equal(literalKind({ type: 'FunctionExpression' }), 'function')
    assert.equal(literalKind({ type: 'CallExpression' }), 'function call')
    assert.equal(
      literalKind({ type: 'BinaryExpression', operator: '+' }),
      'string concatenation result',
    )
  })

  it('returns null for unsupported expressions', () => {
    assert.equal(literalKind({ type: 'Identifier', name: 'foo' }), null)
    assert.equal(
      literalKind({ type: 'BinaryExpression', operator: '-' }),
      null,
    )
  })
})
