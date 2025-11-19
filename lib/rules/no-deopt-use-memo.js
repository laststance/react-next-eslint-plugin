import { isUseMemoCallee } from '../utils/hooks.js'

/**
 * @fileoverview Detects meaningless useMemo usage similar to no-deopt-use-callback but for memoized values.
 */

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag meaningless useMemo usage: passing memoized values to intrinsic elements or referencing them from brand new inline handlers.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      passToIntrinsic:
        'Avoid passing a useMemo result{{name}} to an intrinsic element. useMemo is intended to stabilize values for memoized components or expensive computations, so inline them here instead.',
      usedInsideInline:
        'Avoid touching a useMemo result{{name}} from a newly created inline handler; this defeats its referential stability. Pass the memoized value directly to a memoized component or inline the logic.',
    },
  },

  create(context) {
    const memoNames = new Set()

    function collectUseMemoDeclarator(node) {
      if (
        node.id &&
        node.id.type === 'Identifier' &&
        node.init &&
        node.init.type === 'CallExpression' &&
        isUseMemoCallee(node.init.callee)
      ) {
        memoNames.add(node.id.name)
      }
    }

    function isIntrinsicJsxName(nameNode) {
      return (
        nameNode &&
        nameNode.type === 'JSXIdentifier' &&
        /^[a-z]/.test(nameNode.name)
      )
    }

    function getMemoIdentifierFromExpression(expr) {
      if (!expr) return null
      if (expr.type === 'Identifier' && memoNames.has(expr.name)) {
        return expr.name
      }
      if (expr.type === 'MemberExpression') {
        return getMemoIdentifierFromExpression(expr.object)
      }
      if (expr.type === 'ChainExpression') {
        return getMemoIdentifierFromExpression(expr.expression)
      }
      return null
    }

    function reportPassToIntrinsic(attributeNode, name) {
      const nameSuffix = name ? ` "${name}"` : ''
      context.report({
        node: attributeNode,
        messageId: 'passToIntrinsic',
        data: { name: nameSuffix },
      })
    }

    function reportUsedInsideInline(attributeNode, name) {
      const nameSuffix = name ? ` "${name}"` : ''
      context.report({
        node: attributeNode,
        messageId: 'usedInsideInline',
        data: { name: nameSuffix },
      })
    }

    function findTouchedUseMemoName(fnNode) {
      function visit(n) {
        if (!n) return null
        if (n.type === 'Identifier' && memoNames.has(n.name)) {
          return n.name
        }
        switch (n.type) {
          case 'BlockStatement':
            for (const s of n.body) {
              const result = visit(s)
              if (result) return result
            }
            break
          case 'ExpressionStatement':
            return visit(n.expression)
          case 'ReturnStatement':
            return visit(n.argument)
          case 'IfStatement':
            return visit(n.consequent) || visit(n.alternate)
          case 'ConditionalExpression':
          case 'LogicalExpression':
          case 'BinaryExpression':
            return visit(n.left) || visit(n.right)
          case 'CallExpression': {
            const calleeResult = visit(n.callee)
            if (calleeResult) return calleeResult
            for (const arg of n.arguments) {
              const argResult = visit(arg)
              if (argResult) return argResult
            }
            break
          }
          case 'ObjectExpression':
            for (const prop of n.properties) {
              if (prop.type === 'Property') {
                const propResult = visit(prop.value)
                if (propResult) return propResult
              } else if (prop.type === 'SpreadElement') {
                const spreadResult = visit(prop.argument)
                if (spreadResult) return spreadResult
              }
            }
            break
          case 'ArrayExpression':
            for (const element of n.elements) {
              const elementResult = visit(element)
              if (elementResult) return elementResult
            }
            break
          case 'VariableDeclaration':
            for (const decl of n.declarations) {
              const declResult = visit(decl.init)
              if (declResult) return declResult
            }
            break
          case 'JSXExpressionContainer':
            return visit(n.expression)
          case 'MemberExpression':
            return visit(n.object) || (n.computed ? visit(n.property) : null)
          case 'ArrowFunctionExpression':
          case 'FunctionExpression':
            return visit(n.body)
          default:
            break
        }
        return null
      }
      return visit(fnNode)
    }

    function handleIntrinsicJsxAttribute(attribute) {
      if (!attribute) return
      if (attribute.type === 'JSXSpreadAttribute') {
        const spreadName = getMemoIdentifierFromExpression(attribute.argument)
        if (spreadName) {
          reportPassToIntrinsic(attribute, spreadName)
        }
        return
      }
      if (attribute.type !== 'JSXAttribute') return
      if (!attribute.value) return
      if (attribute.value.type !== 'JSXExpressionContainer') return
      const expr = attribute.value.expression
      if (!expr) return
      const referenced = getMemoIdentifierFromExpression(expr)
      if (referenced) {
        reportPassToIntrinsic(attribute.value, referenced)
        return
      }
      if (
        expr.type === 'ArrowFunctionExpression' ||
        expr.type === 'FunctionExpression'
      ) {
        const touched = findTouchedUseMemoName(expr)
        if (touched) {
          reportUsedInsideInline(attribute.value, touched)
        }
      }
    }

    function handleCreateElement(node) {
      if (!node.arguments || node.arguments.length < 2) return
      const [element, props] = node.arguments
      if (
        !element ||
        element.type !== 'Literal' ||
        typeof element.value !== 'string' ||
        !/^[a-z]/.test(element.value)
      ) {
        return
      }
      if (!props || props.type !== 'ObjectExpression') return
      for (const prop of props.properties) {
        if (prop.type === 'SpreadElement') {
          const spreadName = getMemoIdentifierFromExpression(prop.argument)
          if (spreadName) {
            reportPassToIntrinsic(prop, spreadName)
          }
          continue
        }
        if (prop.type !== 'Property' || prop.key.type !== 'Identifier') continue
        const value = prop.value
        const referenced = getMemoIdentifierFromExpression(value)
        if (referenced) {
          reportPassToIntrinsic(value, referenced)
          continue
        } else if (
          value.type === 'ArrowFunctionExpression' ||
          value.type === 'FunctionExpression'
        ) {
          const touched = findTouchedUseMemoName(value)
          if (touched) {
            reportUsedInsideInline(value, touched)
          }
        }
      }
    }

    return {
      VariableDeclarator(node) {
        collectUseMemoDeclarator(node)
      },
      JSXOpeningElement(node) {
        if (!isIntrinsicJsxName(node.name)) return
        for (const attr of node.attributes || []) {
          handleIntrinsicJsxAttribute(attr)
        }
      },
      CallExpression(node) {
        const callee = node.callee
        const isCreateElement =
          (callee.type === 'Identifier' && callee.name === 'createElement') ||
          (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'createElement')
        if (!isCreateElement) return
        handleCreateElement(node)
      },
    }
  },
}
