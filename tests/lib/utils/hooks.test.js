import assert from 'node:assert/strict'
import { describe, test } from 'mocha'
import {
  isHookCallee,
  isUseCallbackCallee,
  isUseMemoCallee,
  isUseStateCallee,
  isUseReducerCallee,
} from '../../../lib/utils/hooks.js'

describe('utils/hooks', () => {
  const makeMember = (property) => ({
    type: 'MemberExpression',
    computed: false,
    object: { type: 'Identifier', name: 'React' },
    property: { type: 'Identifier', name: property },
  })

  test('matches direct identifier hooks', () => {
    assert.equal(isHookCallee({ type: 'Identifier', name: 'useState' }, 'useState'), true)
    assert.equal(isHookCallee({ type: 'Identifier', name: 'notHook' }, 'useState'), false)
  })

  test('matches member expression hooks', () => {
    assert.equal(isHookCallee(makeMember('useMemo'), 'useMemo'), true)
    assert.equal(isHookCallee(makeMember('useOther'), 'useMemo'), false)
  })

  test('exposes convenience wrappers', () => {
    assert.equal(isUseStateCallee({ type: 'Identifier', name: 'useState' }), true)
    assert.equal(isUseCallbackCallee(makeMember('useCallback')), true)
    assert.equal(isUseMemoCallee({ type: 'Identifier', name: 'useMemo' }), true)
    assert.equal(isUseReducerCallee(makeMember('useReducer')), true)
    assert.equal(isUseCallbackCallee({ type: 'Identifier', name: 'useMemo' }), false)
  })
})
