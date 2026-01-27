/**
 * Lightweight AST helpers for rule implementations.
 */

const FUNCTION_NODE_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
])

const CLASS_NODE_TYPES = new Set(['ClassDeclaration', 'ClassExpression'])

const TYPE_ASSERTION_NODE_TYPES = new Set([
  'TSAsExpression',
  'TSTypeAssertion',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
])

/**
 * Checks whether a node is a function-like expression.
 * @param {import('estree').Node | null | undefined} node - Node to inspect.
 * @returns {boolean} True if the node is a function.
 */
export function isFunctionNode(node) {
  return Boolean(node && FUNCTION_NODE_TYPES.has(node.type))
}

/**
 * Checks whether a node is a class declaration or expression.
 * @param {import('estree').Node | null | undefined} node - Node to inspect.
 * @returns {boolean} True if the node is a class.
 */
export function isClassNode(node) {
  return Boolean(node && CLASS_NODE_TYPES.has(node.type))
}

/**
 * Removes wrappers like ChainExpression or TS assertions to reach the base node.
 * @param {import('estree').Node} node - Node to unwrap.
 * @returns {import('estree').Node} The underlying expression node.
 */
export function getUnderlyingExpression(node) {
  if (node.type === 'ChainExpression') {
    return getUnderlyingExpression(node.expression)
  }
  if (TYPE_ASSERTION_NODE_TYPES.has(node.type)) {
    return getUnderlyingExpression(node.expression)
  }
  return node
}

/**
 * Walks up the parent chain to find the first node matching the predicate.
 * @param {import('estree').Node | null | undefined} node - Starting node.
 * @param {(candidate: import('estree').Node) => boolean} predicate - Match function.
 * @returns {import('estree').Node | null} Matching parent or null.
 */
export function findParentNode(node, predicate) {
  if (!node) return null
  let current = node.parent
  while (current && current.type !== 'Program') {
    if (predicate(current)) return current
    current = current.parent
  }
  return null
}

/**
 * Attempts to infer the identifier for a function or expression.
 * @param {import('estree').Node} node - Function or expression node.
 * @returns {import('estree').Node | null} Identifier-like node if available.
 */
export function getFunctionId(node) {
  if (node && 'id' in node && node.id) {
    return node.id
  }
  const parent = node.parent
  if (!parent) return null
  if (parent.type === 'VariableDeclarator' && parent.init === node) {
    return parent.id
  }
  if (
    parent.type === 'AssignmentExpression' &&
    parent.right === node &&
    parent.operator === '='
  ) {
    return parent.left
  }
  if (parent.type === 'Property' && parent.value === node && !parent.computed) {
    return parent.key
  }
  if (
    (parent.type === 'MethodDefinition' ||
      parent.type === 'PropertyDefinition') &&
    parent.value === node
  ) {
    return parent.key
  }
  if (parent.type === 'AssignmentPattern' && parent.right === node) {
    return parent.left
  }
  if (TYPE_ASSERTION_NODE_TYPES.has(parent.type)) {
    return getFunctionId(parent)
  }
  return null
}

/**
 * Collects return statements within a function body, skipping nested functions.
 * @param {import('estree').Node} functionNode - Function node to inspect.
 * @param {import('eslint').SourceCode} sourceCode - ESLint SourceCode instance.
 * @returns {import('estree').ReturnStatement[]} Return statements in this function.
 */
export function collectReturnStatements(functionNode, sourceCode) {
  const returns = []
  const visitorKeys = sourceCode.visitorKeys || {}

  /**
   * Traverses the AST while skipping nested function/class scopes.
   * @param {import('estree').Node | null | undefined} node - Node to visit.
   */
  function visit(node) {
    if (!node) return
    if (node !== functionNode && (isFunctionNode(node) || isClassNode(node))) {
      return
    }
    if (node.type === 'ReturnStatement') {
      returns.push(node)
    }
    const keys = visitorKeys[node.type] || []
    for (const key of keys) {
      const value = node[key]
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child.type === 'string') {
            visit(child)
          }
        }
      } else if (value && typeof value.type === 'string') {
        visit(value)
      }
    }
  }

  const body = functionNode.body || functionNode
  visit(body)
  return returns
}
