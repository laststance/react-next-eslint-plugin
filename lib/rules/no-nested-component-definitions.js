/**
 * NOTE: Imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.
 */

import { isComponentNameLoose } from '../utils/naming.js'
import {
  collectReturnStatements,
  findParentNode,
  getFunctionId,
  isClassNode,
  isFunctionNode,
} from '../utils/ast.js'

const REACT_NAMESPACE = 'React'
const CREATE_ELEMENT_METHOD = 'createElement'
const MEMO_METHOD = 'memo'
const FORWARD_REF_METHOD = 'forwardRef'
const USE_CALLBACK_METHOD = 'useCallback'
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
 * Determines if a call expression is React.createElement or createElement.
 * @param {import('estree').CallExpression} node - CallExpression node.
 * @returns {boolean} True if createElement call.
 */
function isCreateElementCall(node) {
  const callee = unwrapChainExpression(node.callee)
  if (callee.type === 'Identifier') {
    return callee.name === CREATE_ELEMENT_METHOD
  }
  if (callee.type === 'MemberExpression' && !callee.computed) {
    return (
      callee.object.type === 'Identifier' &&
      callee.object.name === REACT_NAMESPACE &&
      callee.property.type === 'Identifier' &&
      callee.property.name === CREATE_ELEMENT_METHOD
    )
  }
  return false
}

/**
 * Determines if an expression represents JSX or createElement output.
 * @param {import('estree').Node | null | undefined} node - Expression node.
 * @returns {boolean} True if JSX-like.
 */
function isJsxLikeExpression(node) {
  if (!node) return false
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true
  if (node.type === 'CallExpression') {
    return isCreateElementCall(node)
  }
  return false
}

/**
 * Checks whether a function returns JSX-like expressions.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').Node} node - Function node.
 * @returns {boolean} True if function returns JSX-like output.
 */
function functionReturnsJsx(context, node) {
  if (!isFunctionNode(node)) return false
  if (node.body.type !== 'BlockStatement') {
    return isJsxLikeExpression(node.body)
  }
  const returns = collectReturnStatements(node, context.sourceCode)
  return returns.some((statement) => isJsxLikeExpression(statement.argument))
}

/**
 * Determines if a node is a component wrapper call.
 * @param {import('estree').CallExpression} node - CallExpression node.
 * @returns {boolean} True if it is memo/forwardRef/useCallback.
 */
function isComponentWrapperCall(node) {
  const callee = unwrapChainExpression(node.callee)
  if (callee.type === 'Identifier') {
    return [MEMO_METHOD, FORWARD_REF_METHOD, USE_CALLBACK_METHOD].includes(
      callee.name,
    )
  }
  if (callee.type === 'MemberExpression' && !callee.computed) {
    if (callee.property.type !== 'Identifier') return false
    return [MEMO_METHOD, FORWARD_REF_METHOD, USE_CALLBACK_METHOD].includes(
      callee.property.name,
    )
  }
  return false
}

/**
 * Checks whether a function node is the first argument to a wrapper call.
 * @param {import('estree').Node} node - Function node.
 * @returns {boolean} True if wrapped by memo/forwardRef/useCallback.
 */
function isWrapperArgument(node) {
  const parent = node.parent
  if (!parent || parent.type !== 'CallExpression') return false
  if (!isComponentWrapperCall(parent)) return false
  return parent.arguments[FIRST_ARGUMENT_INDEX] === node
}

/**
 * Extracts the component name for a function or class node.
 * @param {import('estree').Node} node - Node to inspect.
 * @returns {string | null} Component name or null.
 */
function getComponentName(node) {
  const id = getFunctionId(node)
  if (id && id.type === 'Identifier') {
    return id.name
  }
  if (id && id.type === 'MemberExpression' && id.property.type === 'Identifier') {
    return id.property.name
  }
  if (node.type === 'ClassDeclaration' && node.id) {
    return node.id.name
  }
  if (node.type === 'ClassExpression' && node.id) {
    return node.id.name
  }
  return null
}

/**
 * Determines whether a class is a React component.
 * @param {import('estree').Node} node - Class node.
 * @returns {boolean} True when class extends React.Component or Component.
 */
function isClassComponent(node) {
  if (!isClassNode(node)) return false
  if (!node.superClass) return false
  if (node.superClass.type === 'Identifier') {
    return ['Component', 'PureComponent'].includes(node.superClass.name)
  }
  if (node.superClass.type === 'MemberExpression' && !node.superClass.computed) {
    if (
      node.superClass.object.type === 'Identifier' &&
      node.superClass.object.name === REACT_NAMESPACE &&
      node.superClass.property.type === 'Identifier'
    ) {
      return ['Component', 'PureComponent'].includes(node.superClass.property.name)
    }
  }
  return false
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallows nesting component definitions inside other components.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-nested-component-definitions.md',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      noNestedComponentDefinitions:
        'Do not nest component definitions inside other components. Move it to the top level.',
    },
  },

  /**
   * Creates rule listeners.
   * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
   * @returns {import('eslint').Rule.RuleListener} Rule listener map.
   */
  create(context) {
    const components = []

    /**
     * Registers a component candidate when it meets criteria.
     * @param {import('estree').Node} node - Component node.
     */
    function registerComponent(node) {
      const name = getComponentName(node)
      if (!isComponentNameLoose(name)) return
      if (isWrapperArgument(node)) return
      components.push({ name, node })
    }

    /**
     * Registers a component wrapper call assigned to a name.
     * @param {import('estree').Node} nameNode - Assignment target.
     * @param {import('estree').CallExpression} callExpression - Call expression.
     */
    function registerWrapperComponent(nameNode, callExpression) {
      const name = nameNode.type === 'Identifier' ? nameNode.name : null
      if (!isComponentNameLoose(name)) return
      const componentArg = callExpression.arguments[FIRST_ARGUMENT_INDEX]
      if (!componentArg) return
      if (!isFunctionNode(componentArg)) return
      if (!functionReturnsJsx(context, componentArg)) return
      components.push({ name, node: callExpression })
    }

    return {
      FunctionDeclaration(node) {
        if (!functionReturnsJsx(context, node)) return
        registerComponent(node)
      },
      FunctionExpression(node) {
        if (!functionReturnsJsx(context, node)) return
        registerComponent(node)
      },
      ArrowFunctionExpression(node) {
        if (!functionReturnsJsx(context, node)) return
        registerComponent(node)
      },
      ClassDeclaration(node) {
        if (!isClassComponent(node)) return
        registerComponent(node)
      },
      ClassExpression(node) {
        if (!isClassComponent(node)) return
        registerComponent(node)
      },
      VariableDeclarator(node) {
        if (!node.init) return
        if (node.init.type !== 'CallExpression') return
        if (!isComponentWrapperCall(node.init)) return
        registerWrapperComponent(node.id, node.init)
      },
      AssignmentExpression(node) {
        if (node.operator !== '=') return
        if (!node.right || node.right.type !== 'CallExpression') return
        if (!isComponentWrapperCall(node.right)) return
        registerWrapperComponent(node.left, node.right)
      },
      'Program:exit'() {
        const componentNodes = new Set(components.map((component) => component.node))
        for (const component of components) {
          const parentComponent = findParentNode(component.node, (node) => {
            return componentNodes.has(node)
          })
          if (!parentComponent) continue
          context.report({
            messageId: 'noNestedComponentDefinitions',
            node: component.node,
          })
        }
      },
    }
  },
}
