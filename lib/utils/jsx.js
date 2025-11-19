/**
 * Utilities for reasoning about JSX nodes.
 */

/**
 * Determines whether the given AST node is a JSX element or fragment.
 * @param {import('estree').Node | null | undefined} node - Node to inspect.
 * @returns {boolean} True if the node is JSX.
 */
export function isJSX(node) {
  return Boolean(
    node && (node.type === 'JSXElement' || node.type === 'JSXFragment'),
  )
}

/**
 * Determines whether the node is an ExpressionStatement that wraps JSX.
 * @param {import('estree').Node | null | undefined} node
 * @returns {boolean} True if the statement is a bare JSX expression.
 */
export function isJSXExpressionStatement(node) {
  return Boolean(
    node &&
      node.type === 'ExpressionStatement' &&
      isJSX(node.expression),
  )
}
