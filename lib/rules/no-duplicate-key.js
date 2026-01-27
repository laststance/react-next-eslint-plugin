/**
 * NOTE: Imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.
 */

import { findParentNode, getUnderlyingExpression, isFunctionNode } from '../utils/ast.js'

const MAP_METHOD_NAME = 'map'
const MAP_CALLBACK_INDEX = 0
const INITIAL_COUNT = 0
const COUNT_INCREMENT = 1
const DUPLICATE_THRESHOLD = 1

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
 * Determines whether a CallExpression is a .map call.
 * @param {import('estree').CallExpression} node - CallExpression node.
 * @returns {boolean} True if it is a map call.
 */
function isMapCall(node) {
  const callee = unwrapChainExpression(node.callee)
  if (!callee || callee.type !== 'MemberExpression') return false
  if (callee.computed) return false
  return (
    callee.property.type === 'Identifier' &&
    callee.property.name === MAP_METHOD_NAME
  )
}

/**
 * Extracts a static key value from a JSXAttribute if possible.
 * @param {import('estree').JSXAttribute} node - JSXAttribute node.
 * @returns {string | number | null} Static key value or null.
 */
function getStaticKeyValue(node) {
  const valueNode = node.value
  if (!valueNode) return null
  if (valueNode.type === 'Literal') {
    return valueNode.value
  }
  if (valueNode.type === 'JSXExpressionContainer') {
    const expression = valueNode.expression
    if (expression && expression.type === 'Literal') {
      return expression.value
    }
  }
  return null
}

/**
 * Determines if a JSX element is inside a map callback function.
 * @param {import('estree').Node} jsxElement - JSX element node.
 * @returns {import('estree').CallExpression | null} Map call if found.
 */
function findEnclosingMapCall(jsxElement) {
  const mapCall = findParentNode(jsxElement, (node) => {
    return node.type === 'CallExpression' && isMapCall(node)
  })
  if (!mapCall) return null
  const callback = mapCall.arguments[MAP_CALLBACK_INDEX]
  if (!callback || !isFunctionNode(callback)) return null
  const enclosingFunction = findParentNode(jsxElement, (node) => {
    return isFunctionNode(node)
  })
  const resolvedCallback = getUnderlyingExpression(callback)
  if (enclosingFunction && enclosingFunction === resolvedCallback) {
    return mapCall
  }
  return null
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Prevents duplicate 'key' props on sibling elements when rendering lists.",
      category: 'Possible Errors',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-duplicate-key.md',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      noDuplicateKey: "The 'key' prop must be unique to its sibling elements.",
    },
  },

  /**
   * Creates rule listeners.
   * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
   * @returns {import('eslint').Rule.RuleListener} Rule listener map.
   */
  create(context) {
    if (!context.sourceCode.text.includes('key=')) return {}

    const keyedEntries = new Map()

    /**
     * Registers a key attribute under a root grouping node.
     * @param {import('estree').Node} root - Grouping node.
     * @param {import('estree').JSXAttribute} attribute - JSXAttribute node.
     * @param {boolean} flagDuplicate - Whether to flag duplicates immediately.
     */
    function registerKey(root, attribute, flagDuplicate) {
      const existing = keyedEntries.get(root) || {
        hasDuplicate: false,
        keys: [],
        keyCounts: new Map(),
      }
      const staticValue = getStaticKeyValue(attribute)
      if (staticValue !== null) {
        const previous = existing.keyCounts.get(staticValue) || INITIAL_COUNT
        existing.keyCounts.set(staticValue, previous + COUNT_INCREMENT)
      }
      existing.keys.push(attribute)
      if (flagDuplicate) {
        existing.hasDuplicate = true
      }
      keyedEntries.set(root, existing)
    }

    return {
      "JSXAttribute[name.name='key']"(node) {
        if (!node.parent || !node.parent.parent) return
        const jsxElement = node.parent.parent
        const parent = jsxElement.parent

        if (
          parent &&
          (parent.type === 'ArrayExpression' ||
            parent.type === 'JSXElement' ||
            parent.type === 'JSXFragment')
        ) {
          registerKey(parent, node, false)
          return
        }

        const mapCall = findEnclosingMapCall(jsxElement)
        if (mapCall) {
          const staticValue = getStaticKeyValue(node)
          registerKey(mapCall, node, staticValue !== null)
        }
      },
      'Program:exit'() {
        for (const entry of keyedEntries.values()) {
          if (!entry.hasDuplicate) {
            const duplicates = new Set()
            for (const [value, count] of entry.keyCounts.entries()) {
              if (count > DUPLICATE_THRESHOLD) duplicates.add(value)
            }
            if (duplicates.size === 0) continue
            for (const key of entry.keys) {
              const staticValue = getStaticKeyValue(key)
              if (duplicates.has(staticValue)) {
                context.report({
                  messageId: 'noDuplicateKey',
                  node: key,
                  data: {
                    value: context.sourceCode.getText(key),
                  },
                })
              }
            }
            continue
          }
          for (const key of entry.keys) {
            context.report({
              messageId: 'noDuplicateKey',
              node: key,
              data: {
                value: context.sourceCode.getText(key),
              },
            })
          }
        }
      },
    }
  },
}
