/**
 * Utilities for recognizing React hook call expressions.
 */

/**
 * Checks if a callee node corresponds to a specific React hook invocation.
 * Supports direct calls (e.g., useState) and member calls (e.g., React.useState).
 * @param {import('estree').Expression | import('estree').Super | null | undefined} callee - The callee node.
 * @param {string} hookName - The hook name to match (e.g., "useState").
 * @returns {boolean} True if the callee matches the hook.
 */
export function isHookCallee(callee, hookName) {
  if (!callee || !hookName) return false
  if (callee.type === 'Identifier' && callee.name === hookName) {
    return true
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property &&
    callee.property.type === 'Identifier' &&
    callee.property.name === hookName
  ) {
    return true
  }
  return false
}

/**
 * Checks for `useState` calls such as `useState()` or `React.useState()`.
 * @param {import('estree').Expression | import('estree').Super | null | undefined} callee
 * @returns {boolean}
 */
export const isUseStateCallee = (callee) => isHookCallee(callee, 'useState')

/**
 * Checks for `useCallback` calls such as `useCallback()` or `React.useCallback()`.
 * @param {import('estree').Expression | import('estree').Super | null | undefined} callee
 * @returns {boolean}
 */
export const isUseCallbackCallee = (callee) => isHookCallee(callee, 'useCallback')

/**
 * Checks for `useMemo` calls such as `useMemo()` or `React.useMemo()`.
 * @param {import('estree').Expression | import('estree').Super | null | undefined} callee
 * @returns {boolean}
 */
export const isUseMemoCallee = (callee) => isHookCallee(callee, 'useMemo')

/**
 * Checks for `useReducer` calls based on the general hook matcher.
 * @param {import('estree').Expression | import('estree').Super | null | undefined} callee
 * @returns {boolean}
 */
export const isUseReducerCallee = (callee) => isHookCallee(callee, 'useReducer')

/**
 * Checks for `useEffect` calls such as `useEffect()` or `React.useEffect()`.
 * @param {import('estree').Expression | import('estree').Super | null | undefined} callee - The callee being invoked.
 * @returns {boolean} True when the call target is useEffect.
 */
export const isUseEffectCallee = (callee) => isHookCallee(callee, 'useEffect')
