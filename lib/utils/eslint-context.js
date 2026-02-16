const DEFAULT_VIRTUAL_FILENAME = '<input>'

/**
 * Returns the effective filename for a rule context.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @returns {string} Absolute filename or virtual filename.
 * @example
 * getRuleFilename(context) // => "/repo/src/app.tsx" or "<input>"
 */
export function getRuleFilename(context) {
  if (typeof context.filename === 'string' && context.filename.length > 0) {
    return context.filename
  }
  if (typeof context.getFilename === 'function') {
    return context.getFilename()
  }
  return DEFAULT_VIRTUAL_FILENAME
}

/**
 * Returns a SourceCode instance in both ESLint v9 and v10.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @returns {import('eslint').SourceCode} SourceCode instance.
 * @example
 * const sourceCode = getRuleSourceCode(context)
 */
export function getRuleSourceCode(context) {
  if (context.sourceCode) {
    return context.sourceCode
  }
  if (typeof context.getSourceCode === 'function') {
    return context.getSourceCode()
  }
  throw new TypeError('Unable to resolve SourceCode from ESLint rule context.')
}

/**
 * Returns scope information for a specific node in a version-safe way.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').Node} node - Target node for scope lookup.
 * @returns {import('eslint').Scope.Scope | null} Scope when available, otherwise null.
 * @example
 * const scope = getRuleScope(context, identifierNode)
 */
export function getRuleScope(context, node) {
  const sourceCode = getRuleSourceCode(context)
  if (typeof sourceCode.getScope === 'function') {
    return sourceCode.getScope(node)
  }
  if (typeof context.getScope === 'function') {
    return context.getScope()
  }
  return null
}
