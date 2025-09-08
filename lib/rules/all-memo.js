export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce wrapping all React function components with React.memo',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      notMemoized:
        'React function component "{{name}}" should be wrapped with React.memo(...)',
    },
  },

  create(context) {
    const componentCandidates = new Map() // name -> node (Identifier)
    const memoWrappedNames = new Set()

    function isPascalCase(name) {
      return /^[A-Z][A-Za-z0-9]*$/.test(name)
    }

    function isJSX(node) {
      return node && (node.type === 'JSXElement' || node.type === 'JSXFragment')
    }

    function functionReturnsJSX(fnNode) {
      // Best-effort: check for immediate return of JSX. This reduces false positives.
      if (
        !fnNode ||
        (fnNode.type !== 'ArrowFunctionExpression' &&
          fnNode.type !== 'FunctionExpression' &&
          fnNode.type !== 'FunctionDeclaration')
      ) {
        return false
      }
      if (
        fnNode.type === 'ArrowFunctionExpression' &&
        fnNode.expression &&
        isJSX(fnNode.body)
      ) {
        return true
      }
      const body =
        fnNode.body && fnNode.body.type === 'BlockStatement'
          ? fnNode.body.body
          : []
      for (const stmt of body) {
        if (
          stmt.type === 'ReturnStatement' &&
          stmt.argument &&
          isJSX(stmt.argument)
        ) {
          return true
        }
      }
      return false
    }

    function isMemoCall(node) {
      if (!node || node.type !== 'CallExpression') return false
      const callee = node.callee
      if (callee.type === 'Identifier' && callee.name === 'memo') return true
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'memo'
      ) {
        return true
      }
      return false
    }

    function markMemoWrapped(node) {
      if (!node) return
      if (node.type === 'Identifier') {
        memoWrappedNames.add(node.name)
      } else if (
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'FunctionDeclaration'
      ) {
        // Attempt to capture a name from a named function expression/declaration
        if (node.id && node.id.type === 'Identifier') {
          memoWrappedNames.add(node.id.name)
        }
      }
    }

    return {
      // const Comp = memo(() => <div />)
      // const Comp = React.memo(function Comp() { return <div/> })
      VariableDeclarator(node) {
        if (node.id && node.id.type === 'Identifier') {
          const name = node.id.name
          const init = node.init

          if (!isPascalCase(name)) return

          // If the initializer is a memo(...) call, treat as wrapped
          if (isMemoCall(init)) {
            memoWrappedNames.add(name)
            const firstArg = init.arguments && init.arguments[0]
            markMemoWrapped(firstArg)
            return
          }

          // If this is a function/arrow assigned directly, track as candidate
          if (
            init &&
            (init.type === 'ArrowFunctionExpression' ||
              init.type === 'FunctionExpression')
          ) {
            // Only consider it a component if it likely returns JSX
            if (functionReturnsJSX(init)) {
              componentCandidates.set(name, node.id)
            }
          }
        }
      },

      // function Comp() { return <div/> }
      FunctionDeclaration(node) {
        if (node.id && node.id.type === 'Identifier') {
          const name = node.id.name
          if (!isPascalCase(name)) return
          if (functionReturnsJSX(node)) {
            componentCandidates.set(name, node.id)
          }
        }
      },

      // export default memo(Comp) | export default React.memo(Comp)
      ExportDefaultDeclaration(node) {
        const expr = node.declaration
        if (isMemoCall(expr)) {
          const firstArg = expr.arguments && expr.arguments[0]
          markMemoWrapped(firstArg)
        }
      },

      // Handle assignments: Comp = memo(Comp)
      AssignmentExpression(node) {
        if (
          node.left &&
          node.left.type === 'Identifier' &&
          isPascalCase(node.left.name) &&
          isMemoCall(node.right)
        ) {
          memoWrappedNames.add(node.left.name)
          const firstArg = node.right.arguments && node.right.arguments[0]
          markMemoWrapped(firstArg)
        }
      },

      'Program:exit'() {
        for (const [name, idNode] of componentCandidates.entries()) {
          if (!memoWrappedNames.has(name)) {
            context.report({
              node: idNode,
              messageId: 'notMemoized',
              data: { name },
            })
          }
        }
      },
    }
  },
}
