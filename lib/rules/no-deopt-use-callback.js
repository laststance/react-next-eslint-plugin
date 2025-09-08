export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detect meaningless use of useCallback: passed to intrinsic elements or immediately called inside inline handlers. useCallback should primarily stabilize function props for memoized components to preserve referential equality.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      passToIntrinsic:
        'Avoid passing a useCallback-wrapped function{{name}} to an intrinsic element. useCallback is intended to stabilize function props for memoized components to prevent unnecessary re-renders. Prefer an inline handler or plain function instead.',
      calledInsideInline:
        'Avoid calling a useCallback-wrapped function{{name}} from a newly created inline handler; this defeats its referential stability. Pass the stabilized function to a memoized component, or inline the logic without useCallback.',
    },
  },

  create(context) {
    const callbackNames = new Set()

    function isUseCallbackCallee(callee) {
      if (!callee) return false
      if (callee.type === 'Identifier' && callee.name === 'useCallback')
        return true
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'useCallback'
      ) {
        return true
      }
      return false
    }

    function isIntrinsicJsxName(nameNode) {
      // <div />, <p />, etc. JSXIdentifier starting with lowercase
      return (
        nameNode &&
        nameNode.type === 'JSXIdentifier' &&
        /^[a-z]/.test(nameNode.name)
      )
    }

    function collectUseCallbackDeclarator(node) {
      // const cb = useCallback(() => {}, deps)
      if (
        node.id &&
        node.id.type === 'Identifier' &&
        node.init &&
        node.init.type === 'CallExpression' &&
        isUseCallbackCallee(node.init.callee)
      ) {
        callbackNames.add(node.id.name)
      }
    }

    function findCalledUseCallbackNameFromFunction(fnNode) {
      // Look for CallExpression whose callee is Identifier in callbackNames
      function visit(n) {
        if (!n) return null
        if (n.type === 'CallExpression') {
          const callee = n.callee
          if (callee.type === 'Identifier' && callbackNames.has(callee.name)) {
            return callee.name
          }
        }
        // Recurse into common containers
        switch (n.type) {
          case 'ArrowFunctionExpression':
            return visit(n.body)
          case 'BlockStatement':
            for (const s of n.body) {
              const found = visit(s)
              if (found) return found
            }
            break
          case 'ExpressionStatement':
            return visit(n.expression)
          case 'ReturnStatement':
            return visit(n.argument)
          case 'IfStatement':
            return visit(n.consequent) || visit(n.alternate)
          case 'ConditionalExpression':
            return visit(n.consequent) || visit(n.alternate)
          case 'LogicalExpression':
          case 'BinaryExpression':
            return visit(n.left) || visit(n.right)
          case 'SequenceExpression':
            for (const e of n.expressions) {
              const found2 = visit(e)
              if (found2) return found2
            }
            break
          case 'CallExpression':
            // Handled above, but visit args too
            for (const a of n.arguments) {
              const found3 = visit(a)
              if (found3) return found3
            }
            break
          case 'VariableDeclaration':
            for (const d of n.declarations) {
              const found4 = visit(d.init)
              if (found4) return found4
            }
            break
          case 'JSXExpressionContainer':
            return visit(n.expression)
          default:
            break
        }
        return null
      }
      return visit(fnNode) || null
    }

    function reportPassToIntrinsic(attributeNode, name) {
      const nameSuffix = name ? ` "${name}"` : ''
      context.report({
        node: attributeNode,
        messageId: 'passToIntrinsic',
        data: { name: nameSuffix },
      })
    }

    function reportCalledInsideInline(attributeNode, name) {
      const nameSuffix = name ? ` "${name}"` : ''
      context.report({
        node: attributeNode,
        messageId: 'calledInsideInline',
        data: { name: nameSuffix },
      })
    }

    return {
      VariableDeclarator(node) {
        collectUseCallbackDeclarator(node)
      },

      // <div onClick={cb} /> or <div onClick={() => cb()} />
      JSXOpeningElement(node) {
        if (!isIntrinsicJsxName(node.name)) return
        for (const attr of node.attributes || []) {
          if (
            !attr ||
            attr.type !== 'JSXAttribute' ||
            !attr.value ||
            attr.value.type !== 'JSXExpressionContainer'
          )
            continue
          const expr = attr.value.expression
          if (!expr) continue
          if (expr.type === 'Identifier' && callbackNames.has(expr.name)) {
            reportPassToIntrinsic(attr, expr.name)
          } else if (
            expr.type === 'ArrowFunctionExpression' ||
            expr.type === 'FunctionExpression'
          ) {
            const calledName = findCalledUseCallbackNameFromFunction(expr)
            if (calledName) {
              reportCalledInsideInline(attr, calledName)
            }
          }
        }
      },

      // React.createElement('div', { onClick: cb }) or onClick: () => cb()
      CallExpression(node) {
        const callee = node.callee
        const isCreateElement =
          (callee.type === 'Identifier' && callee.name === 'createElement') ||
          (callee.type === 'MemberExpression' &&
            !callee.computed &&
            callee.property &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'createElement')
        if (!isCreateElement) return
        const args = node.arguments || []
        if (args.length < 2) return
        const typeArg = args[0]
        const propsArg = args[1]
        const isIntrinsic =
          (typeArg.type === 'Literal' && typeof typeArg.value === 'string') ||
          (typeArg.type === 'TemplateLiteral' && typeArg.quasis.length === 1)
        if (!isIntrinsic) return
        if (propsArg && propsArg.type === 'ObjectExpression') {
          for (const prop of propsArg.properties) {
            if (prop.type !== 'Property') continue
            const val = prop.value
            if (val.type === 'Identifier' && callbackNames.has(val.name)) {
              reportPassToIntrinsic(node, val.name)
            } else if (
              val.type === 'ArrowFunctionExpression' ||
              val.type === 'FunctionExpression'
            ) {
              const calledName = findCalledUseCallbackNameFromFunction(val)
              if (calledName) {
                reportCalledInsideInline(node, calledName)
              }
            }
          }
        }
      },
    }
  },
}
