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

/**
 * Converts JSX name nodes into a dotted string representation.
 * @param {import('estree').Node} node - JSX name node to stringify.
 * @returns {string} Stringified JSX name.
 */
export function stringifyJsxName(node) {
  if (!node) return ''
  switch (node.type) {
    case 'JSXIdentifier':
      return node.name
    case 'JSXNamespacedName':
      return `${node.namespace.name}:${node.name.name}`
    case 'JSXMemberExpression':
      return `${stringifyJsxName(node.object)}.${stringifyJsxName(node.property)}`
    default:
      return ''
  }
}

/**
 * Returns the element type name for a JSX element or fragment.
 * @param {import('estree').Node} node - JSX element or fragment.
 * @returns {string} Element type name or empty string for fragments.
 */
export function getJsxElementType(node) {
  if (!node) return ''
  if (node.type === 'JSXFragment') return ''
  if (node.type === 'JSXElement') {
    return stringifyJsxName(node.openingElement.name)
  }
  return ''
}
