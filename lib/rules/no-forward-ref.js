/**
 * NOTE: Imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.
 */

import { getReactSettings, isVersionAtLeastMajor } from '../utils/react-settings.js'
import { getFunctionId } from '../utils/ast.js'

const REACT_VERSION_MAJOR = 19

/**
 * Determines whether a CallExpression represents a forwardRef call.
 * @param {import('estree').CallExpression} node - CallExpression node.
 * @returns {boolean} True if the call is to forwardRef.
 */
function isForwardRefCall(node) {
  const callee = unwrapChainExpression(node.callee)
  if (!callee) return false
  if (callee.type === 'Identifier') {
    return callee.name === 'forwardRef'
  }
  if (callee.type === 'MemberExpression') {
    if (callee.computed) return false
    return callee.property.type === 'Identifier'
      ? callee.property.name === 'forwardRef'
      : false
  }
  return false
}

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
 * Determines if the rule should apply based on React settings.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @returns {boolean} True when React version is at least 19.
 */
function shouldCheck(context) {
  const { version } = getReactSettings(context)
  return isVersionAtLeastMajor(version, REACT_VERSION_MAJOR)
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: "Replaces usage of 'forwardRef' with passing 'ref' as a prop.",
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-forward-ref.md',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      noForwardRef:
        "In React 19, 'forwardRef' is no longer necessary. Pass 'ref' as a prop instead.",
    },
  },

  /**
   * Creates rule listeners.
   * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
   * @returns {import('eslint').Rule.RuleListener} Rule listener map.
   */
  create(context) {
    if (!context.sourceCode.text.includes('forwardRef')) {
      return {}
    }
    if (!shouldCheck(context)) {
      return {}
    }
    return {
      CallExpression(node) {
        if (!isForwardRefCall(node)) return
        const id = getFunctionId(node)
        context.report({
          node: id || node,
          messageId: 'noForwardRef',
        })
      },
    }
  },
}
