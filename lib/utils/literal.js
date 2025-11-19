/**
 * Helpers for reasoning about literal expressions created inside React components.
 */

/**
 * Returns a descriptive label for inline literal expressions that commonly cause
 * unstable props (objects, arrays, functions, function calls, string concatenations).
 * @param {import('estree').Node | null | undefined} node - The expression node.
 * @returns {('object'|'array'|'function'|'function call'|'string concatenation result') | null}
 */
export function literalKind(node) {
  if (!node) return null
  switch (node.type) {
    case 'ObjectExpression':
      return 'object'
    case 'ArrayExpression':
      return 'array'
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return 'function'
    case 'CallExpression':
      return 'function call'
    case 'BinaryExpression':
      return node.operator === '+' ? 'string concatenation result' : null
    default:
      return null
  }
}
