import assert from 'node:assert/strict'
import { describe, test } from 'mocha'
import { isJSX, isJSXExpressionStatement } from '../../../lib/utils/jsx.js'

describe('utils/jsx', () => {
  test('detects JSX elements and fragments', () => {
    assert.equal(isJSX({ type: 'JSXElement' }), true)
    assert.equal(isJSX({ type: 'JSXFragment' }), true)
    assert.equal(isJSX({ type: 'Identifier' }), false)
  })

  test('detects JSX expression statements', () => {
    const statement = { type: 'ExpressionStatement', expression: { type: 'JSXElement' } }
    assert.equal(isJSXExpressionStatement(statement), true)
    assert.equal(isJSXExpressionStatement({ type: 'ExpressionStatement', expression: { type: 'Literal' } }), false)
  })
})
