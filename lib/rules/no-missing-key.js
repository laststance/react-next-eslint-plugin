/**
 * NOTE: Imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.
 */

import { getJsxAttribute } from '../utils/jsx-attributes.js'
import { collectReturnStatements, isFunctionNode } from '../utils/ast.js'

const MAP_CALLBACK_INDEX = 0
const ARRAY_FROM_CALLBACK_INDEX = 1
const DEPTH_INCREMENT = 1
const DEPTH_DECREMENT = 1
const MIN_CHILDREN_TO_ARRAY_DEPTH = 0
const CHILDREN_TO_ARRAY_METHOD = 'toArray'
const CHILDREN_NAMESPACE = 'Children'
const REACT_NAMESPACE = 'React'

/**
 * Determines whether a node is a JSX element.
 * @param {import('estree').Node | null | undefined} node - Node to inspect.
 * @returns {node is import('estree').JSXElement} True if JSX element.
 */
function isJsxElement(node) {
  return Boolean(node && node.type === 'JSXElement')
}

/**
 * Determines whether a node is a JSX fragment.
 * @param {import('estree').Node | null | undefined} node - Node to inspect.
 * @returns {node is import('estree').JSXFragment} True if JSX fragment.
 */
function isJsxFragment(node) {
  return Boolean(node && node.type === 'JSXFragment')
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
 * Checks if a CallExpression is React.Children.toArray or Children.toArray.
 * @param {import('estree').CallExpression} node - CallExpression node.
 * @returns {boolean} True if it is a Children.toArray call.
 */
function isChildrenToArrayCall(node) {
  const callee = unwrapChainExpression(node.callee)
  if (!callee || callee.type !== 'MemberExpression') return false
  if (callee.computed) return false
  if (callee.property.type !== 'Identifier') return false
  if (callee.property.name !== CHILDREN_TO_ARRAY_METHOD) return false
  const object = callee.object
  if (object.type === 'Identifier') {
    return object.name === CHILDREN_NAMESPACE
  }
  if (
    object.type === 'MemberExpression' &&
    !object.computed &&
    object.property.type === 'Identifier'
  ) {
    return (
      object.property.name === CHILDREN_NAMESPACE &&
      object.object.type === 'Identifier' &&
      object.object.name === REACT_NAMESPACE
    )
  }
  return false
}

/**
 * Checks if a CallExpression is an array map call.
 * @param {import('estree').CallExpression} node - CallExpression node.
 * @returns {boolean} True if it is a map call.
 */
function isArrayMapCall(node) {
  const callee = unwrapChainExpression(node.callee)
  if (!callee || callee.type !== 'MemberExpression') return false
  if (callee.computed) return false
  if (callee.property.type !== 'Identifier') return false
  return callee.property.name === 'map'
}

/**
 * Checks if a CallExpression is Array.from with a callback.
 * @param {import('estree').CallExpression} node - CallExpression node.
 * @returns {boolean} True if it is an Array.from call.
 */
function isArrayFromCall(node) {
  const callee = unwrapChainExpression(node.callee)
  if (!callee) return false
  if (callee.type === 'MemberExpression') {
    if (callee.computed) return false
    return (
      callee.object.type === 'Identifier' &&
      callee.object.name === 'Array' &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'from'
    )
  }
  return false
}

/**
 * Determines whether a JSX element has a key attribute.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').JSXElement} node - JSX element.
 * @returns {boolean} True if key attribute exists.
 */
function hasKeyAttribute(context, node) {
  return getJsxAttribute(context, node)('key') != null
}

/**
 * Evaluates a JSX expression returned from a list callback.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').Expression} expression - Expression to check.
 * @returns {Array<{ node: import('estree').Node, messageId: 'missingKey' | 'unexpectedFragmentSyntax' }>} Issues.
 */
function checkExpression(context, expression) {
  if (!expression) return []
  switch (expression.type) {
    case 'ConditionalExpression': {
      return [
        ...checkExpression(context, expression.consequent),
        ...checkExpression(context, expression.alternate),
      ]
    }
    case 'LogicalExpression': {
      return [
        ...checkExpression(context, expression.left),
        ...checkExpression(context, expression.right),
      ]
    }
    default: {
      if (isJsxElement(expression)) {
        return hasKeyAttribute(context, expression)
          ? []
          : [{ node: expression, messageId: 'missingKey' }]
      }
      if (isJsxFragment(expression)) {
        return [{ node: expression, messageId: 'unexpectedFragmentSyntax' }]
      }
      return []
    }
  }
}

/**
 * Extracts return statement arguments for a callback function.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').Node} node - Function node.
 * @returns {import('estree').Expression[]} Return expressions.
 */
function collectReturnExpressions(context, node) {
  if (!isFunctionNode(node)) return []
  if (node.body.type !== 'BlockStatement') {
    return node.body ? [node.body] : []
  }
  const returns = collectReturnStatements(node, context.sourceCode)
  return returns
    .map((statement) => statement.argument)
    .filter(Boolean)
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: "Disallows missing 'key' on items in list rendering.",
      category: 'Possible Errors',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-missing-key.md',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      missingKey: "Missing 'key' for element when rendering list.",
      unexpectedFragmentSyntax:
        "Use fragment component instead of '<>' because it does not support `key`.",
    },
  },

  /**
   * Creates rule listeners.
   * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
   * @returns {import('eslint').Rule.RuleListener} Rule listener map.
   */
  create(context) {
    let childrenToArrayDepth = MIN_CHILDREN_TO_ARRAY_DEPTH

    return {
      ArrayExpression(node) {
        if (childrenToArrayDepth > 0) return
        const elements = node.elements.filter((element) => {
          return isJsxElement(element)
        })
        if (elements.length === 0) return
        for (const element of elements) {
          if (!hasKeyAttribute(context, element)) {
            context.report({
              messageId: 'missingKey',
              node: element,
            })
          }
        }
      },
      CallExpression(node) {
        if (isChildrenToArrayCall(node)) {
          childrenToArrayDepth += DEPTH_INCREMENT
          return
        }
        if (childrenToArrayDepth > 0) return
        const isMap = isArrayMapCall(node)
        const isFrom = isArrayFromCall(node)
        if (!isMap && !isFrom) return
        const callbackIndex = isMap
          ? MAP_CALLBACK_INDEX
          : ARRAY_FROM_CALLBACK_INDEX
        const callback = node.arguments[callbackIndex]
        if (!callback || !isFunctionNode(callback)) return
        const returnExpressions = collectReturnExpressions(context, callback)
        for (const expression of returnExpressions) {
          const descriptors = checkExpression(context, expression)
          for (const descriptor of descriptors) {
            context.report({
              node: descriptor.node,
              messageId: descriptor.messageId,
            })
          }
        }
      },
      'CallExpression:exit'(node) {
        if (isChildrenToArrayCall(node)) {
          childrenToArrayDepth = Math.max(
            childrenToArrayDepth - DEPTH_DECREMENT,
            MIN_CHILDREN_TO_ARRAY_DEPTH,
          )
        }
      },
      JSXFragment(node) {
        if (childrenToArrayDepth > 0) return
        if (node.parent && node.parent.type === 'ArrayExpression') {
          context.report({
            messageId: 'unexpectedFragmentSyntax',
            node,
          })
        }
      },
    }
  },
}
