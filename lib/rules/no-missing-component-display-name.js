/**
 * NOTE: Imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.
 */

const MEMO_METHOD_NAME = 'memo'
const FORWARD_REF_METHOD_NAME = 'forwardRef'
const FIRST_ARGUMENT_INDEX = 0

/**
 * Unwraps a ChainExpression to its underlying expression.
 * @param {import('estree').Node} node - Node to unwrap.
 * @returns {import('estree').Node} Unwrapped node.
 */
function unwrapChainExpression(node) {
  if (node.type === 'ChainExpression') {
    return node.expression
  }
  return node
}

/**
 * Determines whether a CallExpression matches a React helper by name.
 * @param {import('estree').CallExpression} node - CallExpression node.
 * @param {string} name - Helper name to match.
 * @returns {boolean} True if call matches.
 */
function isNamedCall(node, name) {
  const callee = unwrapChainExpression(node.callee)
  if (callee.type === 'Identifier') {
    return callee.name === name
  }
  if (callee.type === 'MemberExpression' && !callee.computed) {
    return callee.property.type === 'Identifier'
      ? callee.property.name === name
      : false
  }
  return false
}

/**
 * Extracts the component function argument from a memo/forwardRef call.
 * @param {import('estree').CallExpression} node - CallExpression node.
 * @returns {import('estree').Node | null} The component argument node.
 */
function getComponentArgument(node) {
  if (isNamedCall(node, FORWARD_REF_METHOD_NAME)) {
    return node.arguments[FIRST_ARGUMENT_INDEX] || null
  }
  if (isNamedCall(node, MEMO_METHOD_NAME)) {
    const arg = node.arguments[FIRST_ARGUMENT_INDEX]
    if (arg && arg.type === 'CallExpression' && isNamedCall(arg, FORWARD_REF_METHOD_NAME)) {
      return arg.arguments[FIRST_ARGUMENT_INDEX] || null
    }
    return arg || null
  }
  return null
}

/**
 * Determines whether a component argument is anonymous.
 * @param {import('estree').Node | null} node - Component argument node.
 * @returns {boolean} True if anonymous.
 */
function isAnonymousComponentArgument(node) {
  if (!node) return false
  if (node.type === 'ArrowFunctionExpression') return true
  if (node.type === 'FunctionExpression') {
    return !node.id
  }
  return false
}

/**
 * Extracts the component name from assignment targets.
 * @param {import('estree').Node} node - Assignment target node.
 * @returns {string | null} Component name.
 */
function getAssignedName(node) {
  if (node.type === 'Identifier') return node.name
  return null
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Enforces that all components have a 'displayName' that can be used in DevTools.",
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-missing-component-display-name.md',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      noMissingComponentDisplayName: "Add missing 'displayName' for component.",
    },
  },

  /**
   * Creates rule listeners.
   * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
   * @returns {import('eslint').Rule.RuleListener} Rule listener map.
   */
  create(context) {
    if (
      !context.sourceCode.text.includes(MEMO_METHOD_NAME) &&
      !context.sourceCode.text.includes(FORWARD_REF_METHOD_NAME)
    ) {
      return {}
    }

    const componentsNeedingDisplayName = new Map()
    const componentsWithDisplayName = new Set()

    /**
     * Registers a component that requires displayName.
     * @param {string | null} name - Component name.
     * @param {import('estree').Node} node - Report target node.
     */
    function registerMissingDisplayName(name, node) {
      if (!name) return
      if (componentsNeedingDisplayName.has(name)) return
      componentsNeedingDisplayName.set(name, node)
    }

    /**
     * Handles a call expression assigned to a component identifier.
     * @param {string | null} name - Component name.
     * @param {import('estree').CallExpression} callExpression - Call expression.
     */
    function handleComponentWrapperCall(name, callExpression) {
      const componentArg = getComponentArgument(callExpression)
      if (!componentArg) return
      if (!isAnonymousComponentArgument(componentArg)) return
      registerMissingDisplayName(name, componentArg)
    }

    return {
      VariableDeclarator(node) {
        if (!node.init || node.id.type !== 'Identifier') return
        if (node.init.type !== 'CallExpression') return
        const name = node.id.name
        if (!isNamedCall(node.init, MEMO_METHOD_NAME) && !isNamedCall(node.init, FORWARD_REF_METHOD_NAME)) {
          return
        }
        handleComponentWrapperCall(name, node.init)
      },
      AssignmentExpression(node) {
        if (node.operator === '=') {
          const targetName = getAssignedName(node.left)
          if (targetName && node.right && node.right.type === 'CallExpression') {
            if (
              isNamedCall(node.right, MEMO_METHOD_NAME) ||
              isNamedCall(node.right, FORWARD_REF_METHOD_NAME)
            ) {
              handleComponentWrapperCall(targetName, node.right)
            }
          }
        }
        if (node.left.type !== 'MemberExpression') return
        if (node.left.computed) return
        if (node.left.property.type !== 'Identifier') return
        if (node.left.property.name !== 'displayName') return
        if (node.left.object.type !== 'Identifier') return
        componentsWithDisplayName.add(node.left.object.name)
      },
      'Program:exit'() {
        for (const [name, node] of componentsNeedingDisplayName.entries()) {
          if (componentsWithDisplayName.has(name)) continue
          context.report({
            messageId: 'noMissingComponentDisplayName',
            node,
          })
        }
      },
    }
  },
}
