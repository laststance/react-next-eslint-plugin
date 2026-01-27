/**
 * JSX attribute helpers that resolve direct and spread props.
 */

const PROPERTY_NODE_TYPES = new Set(['Property'])
const FIRST_DEFINITION_INDEX = 0

/**
 * Returns the ESLint scope for a node.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').Node} node - Node to resolve scope for.
 * @returns {import('eslint').Scope.Scope} Scope instance.
 */
function getScope(context, node) {
  const sourceCode = context.sourceCode ?? context.getSourceCode()
  if (typeof sourceCode.getScope === 'function') {
    return sourceCode.getScope(node)
  }
  return context.getScope()
}

/**
 * Finds a variable by name in the given scope chain.
 * @param {import('eslint').Scope.Scope} scope - Starting scope.
 * @param {string} name - Variable name to look up.
 * @returns {import('eslint').Scope.Variable | null} The matching variable or null.
 */
function findVariable(scope, name) {
  let current = scope
  while (current) {
    if (current.set && current.set.has(name)) {
      return current.set.get(name)
    }
    current = current.upper
  }
  return null
}

/**
 * Gets the initializer node for a variable definition when available.
 * @param {import('eslint').Scope.Variable | null} variable - Variable to inspect.
 * @returns {import('estree').Node | null} The definition node or null.
 */
function getVariableDefinitionNode(variable) {
  if (!variable || !Array.isArray(variable.defs)) return null
  const def = variable.defs[FIRST_DEFINITION_INDEX]
  if (!def) return null
  if (def.type === 'FunctionName' && def.node.type === 'FunctionDeclaration') {
    return def.node
  }
  if (def.type === 'ClassName' && def.node.type === 'ClassDeclaration') {
    return def.node
  }
  if (def.type === 'Variable' && def.node.init) {
    return def.node.init
  }
  return null
}

/**
 * Checks if an object property name matches a target name.
 * @param {import('estree').Property} property - Object property node.
 * @param {string} name - Expected property name.
 * @returns {boolean} True if property matches the name.
 */
function isPropertyName(property, name) {
  if (property.computed) return false
  if (property.key.type === 'Identifier') {
    return property.key.name === name
  }
  if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
    return property.key.value === name
  }
  return false
}

/**
 * Finds a property by name in an object expression, following nested spreads.
 * @param {string} name - Property name to look for.
 * @param {Array<import('estree').Property | import('estree').SpreadElement>} properties - Object properties.
 * @param {import('eslint').Scope.Scope} scope - Scope for resolving identifiers.
 * @param {Set<string>} seen - Seen identifier names to avoid cycles.
 * @returns {import('estree').Node | null} Matching property node or null.
 */
function findPropertyInObject(name, properties, scope, seen) {
  for (const prop of properties) {
    if (PROPERTY_NODE_TYPES.has(prop.type)) {
      if (isPropertyName(prop, name)) {
        return prop
      }
      continue
    }
    if (prop.type !== 'SpreadElement') continue
    const argument = prop.argument
    if (argument.type === 'Identifier') {
      if (seen.has(argument.name)) continue
      seen.add(argument.name)
      const variable = findVariable(scope, argument.name)
      const variableNode = getVariableDefinitionNode(variable)
      if (variableNode && variableNode.type === 'ObjectExpression') {
        const found = findPropertyInObject(
          name,
          variableNode.properties,
          scope,
          seen,
        )
        if (found) return found
      }
      continue
    }
    if (argument.type === 'ObjectExpression') {
      const found = findPropertyInObject(name, argument.properties, scope, seen)
      if (found) return found
    }
  }
  return null
}

/**
 * Creates a helper to find JSX attributes by name, including spread props.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').JSXElement} node - JSX element to inspect.
 * @param {import('eslint').Scope.Scope | null | undefined} initialScope - Optional scope override.
 * @returns {(name: string) => import('estree').JSXAttribute | import('estree').JSXSpreadAttribute | null}
 */
export function getJsxAttribute(context, node, initialScope) {
  const scope = initialScope ?? getScope(context, node)
  const attributes = node.openingElement.attributes

  return (name) => {
    const found = attributes.findLast((attr) => {
      if (attr.type === 'JSXAttribute') {
        return attr.name && attr.name.type === 'JSXIdentifier'
          ? attr.name.name === name
          : false
      }
      if (attr.type !== 'JSXSpreadAttribute') return false
      const argument = attr.argument
      if (argument.type === 'ObjectExpression') {
        return Boolean(
          findPropertyInObject(name, argument.properties, scope, new Set()),
        )
      }
      if (argument.type === 'Identifier') {
        const variable = findVariable(scope, argument.name)
        const variableNode = getVariableDefinitionNode(variable)
        if (variableNode && variableNode.type === 'ObjectExpression') {
          return Boolean(
            findPropertyInObject(
              name,
              variableNode.properties,
              scope,
              new Set(),
            ),
          )
        }
      }
      return false
    })
    return found ?? null
  }
}

/**
 * Extracts a static string value from a JSX attribute when possible.
 * @param {import('estree').JSXAttribute | null | undefined} attribute - JSX attribute node.
 * @returns {string | null} Static string value or null.
 */
export function getStaticJsxAttributeStringValue(attribute) {
  if (!attribute || attribute.type !== 'JSXAttribute') return null
  if (!attribute.value) return null
  if (attribute.value.type === 'Literal') {
    return typeof attribute.value.value === 'string'
      ? attribute.value.value
      : null
  }
  if (attribute.value.type === 'JSXExpressionContainer') {
    const expression = attribute.value.expression
    if (expression && expression.type === 'Literal') {
      return typeof expression.value === 'string' ? expression.value : null
    }
  }
  return null
}
