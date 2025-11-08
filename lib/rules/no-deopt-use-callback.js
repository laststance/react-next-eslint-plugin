/**
 * @fileoverview Detects meaningless use of useCallback: passed to intrinsic elements or immediately called inside inline handlers.
 * useCallback should primarily stabilize function props for memoized components to preserve referential equality.
 * @author laststance
 */

/**
 * @type {import('eslint').Rule.RuleModule}
 */
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
    // A set to store the names of variables declared with useCallback.
    // This allows quick lookup to identify functions stabilized by useCallback.
    const callbackNames = new Set()

    /**
     * Checks if a given callee node represents a `useCallback` hook call.
     * This handles both direct calls like `useCallback(...)` and member expressions like `React.useCallback(...)`.
     * @param {import('estree').Node | null | undefined} callee - The callee node of a CallExpression.
     * @returns {boolean} True if the callee is `useCallback`, false otherwise.
     */
    function isUseCallbackCallee(callee) {
      if (!callee) return false
      // Direct call to `useCallback`
      if (callee.type === 'Identifier' && callee.name === 'useCallback')
        return true
      // Member expression call, e.g., `React.useCallback`
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed && // Ensure it's not a computed property (e.g., obj[key])
        callee.property &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'useCallback'
      ) {
        return true
      }
      return false
    }

    /**
     * Checks if a JSX name node refers to an intrinsic HTML element.
     * Intrinsic elements start with a lowercase letter (e.g., `<div>`, `<span>`).
     * @param {import('estree').Node | null | undefined} nameNode - The JSX name node (e.g., `JSXIdentifier`).
     * @returns {boolean} True if the name node represents an intrinsic element, false otherwise.
     */
    function isIntrinsicJsxName(nameNode) {
      // <div />, <p />, etc. JSXIdentifier starting with lowercase
      return (
        nameNode &&
        nameNode.type === 'JSXIdentifier' &&
        /^[a-z]/.test(nameNode.name)
      )
    }

    /**
     * Collects the name of a variable declared with `useCallback` and adds it to the `callbackNames` set.
     * This function is typically called on `VariableDeclarator` nodes whose `init` property is a `useCallback` call.
     * @param {import('estree').VariableDeclarator} node - The `VariableDeclarator` node.
     * @returns {void}
     */
    function collectUseCallbackDeclarator(node) {
      // Example: const cb = useCallback(() => {}, deps)
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

    /**
     * Recursively traverses an AST node (typically a function body or expression)
     * to find if any `useCallback`-wrapped function (identified by `callbackNames`)
     * is being called directly within it.
     * @param {import('estree').Expression} fnNode - The AST node to start the traversal from (e.g., `ArrowFunctionExpression`).
     * @returns {string|null} The name of the called `useCallback`-wrapped function if found, otherwise `null`.
     */
    function findCalledUseCallbackNameFromFunction(fnNode) {
      // Inner helper function for recursive traversal.
      function visit(n) {
        if (!n) return null

        // Check for direct CallExpressions where the callee is a useCallback-wrapped function.
        if (n.type === 'CallExpression') {
          const callee = n.callee
          if (callee.type === 'Identifier' && callbackNames.has(callee.name)) {
            return callee.name // Found a direct call to a useCallback function
          }
        }

        // Recursively visit child nodes based on their type.
        // This ensures deep inspection within function bodies, expressions, and statements.
        switch (n.type) {
          case 'ArrowFunctionExpression':
            // For arrow functions, visit the body directly.
            return visit(n.body)
          case 'BlockStatement':
            // For block statements (e.g., function bodies), iterate through all statements.
            for (const s of n.body) {
              const found = visit(s)
              if (found) return found
            }
            break
          case 'ExpressionStatement':
            // For expression statements, visit the expression itself.
            return visit(n.expression)
          case 'ReturnStatement':
            // For return statements, visit the argument.
            return visit(n.argument)
          case 'IfStatement':
            // For if statements, check both consequent and alternate branches.
            return visit(n.consequent) || visit(n.alternate)
          case 'ConditionalExpression':
            // For conditional expressions, check both consequent and alternate branches.
            return visit(n.consequent) || visit(n.alternate)
          case 'LogicalExpression':
          case 'BinaryExpression':
            // For logical and binary expressions, check both left and right operands.
            return visit(n.left) || visit(n.right)
          case 'SequenceExpression':
            // For sequence expressions, iterate through all expressions.
            for (const e of n.expressions) {
              const found2 = visit(e)
              if (found2) return found2
            }
            break
          case 'CallExpression':
            // A CallExpression's callee is handled above, but arguments might also contain functions calling our callbacks.
            for (const a of n.arguments) {
              const found3 = visit(a)
              if (found3) return found3
            }
            break
          case 'VariableDeclaration':
            // For variable declarations, check the initializers.
            for (const d of n.declarations) {
              const found4 = visit(d.init)
              if (found4) return found4
            }
            break
          case 'JSXExpressionContainer':
            // For JSX expression containers (e.g., `{expr}`), visit the contained expression.
            return visit(n.expression)
          default:
            // For any other node type, do nothing.
            break
        }
        return null // No call to a useCallback function found in this branch.
      }
      return visit(fnNode) || null
    }

    /**
     * Reports an issue where a `useCallback`-wrapped function is passed directly to an intrinsic element.
     * @param {import('estree').Node} attributeNode - The JSX attribute or Property node where the issue was found.
     * @param {string} name - The name of the `useCallback`-wrapped function.
     * @returns {void}
     */
    function reportPassToIntrinsic(attributeNode, name) {
      const nameSuffix = name ? ` \"${name}\"` : ''
      context.report({
        node: attributeNode,
        messageId: 'passToIntrinsic',
        data: { name: nameSuffix },
      })
    }

    /**
     * Reports an issue where a `useCallback`-wrapped function is called from inside an inline handler.
     * @param {import('estree').Node} attributeNode - The JSX attribute or Property node where the issue was found.
     * @param {string} name - The name of the `useCallback`-wrapped function.
     * @returns {void}
     */
    function reportCalledInsideInline(attributeNode, name) {
      const nameSuffix = name ? ` \"${name}\"` : ''
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

      // Handles JSX cases: <div onClick={cb} /> or <div onClick={() => cb()} />
      JSXOpeningElement(node) {
        // We only care about intrinsic elements like `div`, `span`, etc.
        if (!isIntrinsicJsxName(node.name)) return

        // Iterate through all attributes of the element.
        for (const attr of node.attributes || []) {
          // Ensure we are dealing with a valid attribute with a JSX expression value.
          if (
            !attr ||
            attr.type !== 'JSXAttribute' ||
            !attr.value ||
            attr.value.type !== 'JSXExpressionContainer'
          ) {
            continue
          }

          const expr = attr.value.expression
          if (!expr) continue

          // Case 1: A useCallback-wrapped function is passed directly.
          // e.g., <div onClick={myCallback} />
          if (expr.type === 'Identifier' && callbackNames.has(expr.name)) {
            reportPassToIntrinsic(attr, expr.name)
          } else if (
            // Case 2: A new inline function is created that calls the useCallback-wrapped function.
            // e.g., <div onClick={() => myCallback()} />
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

      // Handles React.createElement('div', { onClick: cb }) or { onClick: () => cb() }
      CallExpression(node) {
        const callee = node.callee

        // Identify calls to `createElement` or `React.createElement`.
        const isCreateElement =
          (callee.type === 'Identifier' && callee.name === 'createElement') ||
          (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'createElement')

        if (!isCreateElement || node.arguments.length < 2) {
          return
        }

        const [element, props] = node.arguments
        // Ensure the first argument is a string literal representing an intrinsic element.
        if (
          !element ||
          element.type !== 'Literal' ||
          typeof element.value !== 'string' ||
          !/^[a-z]/.test(element.value)
        ) {
          return
        }

        // Check the second argument (props object).
        if (props && props.type === 'ObjectExpression') {
          // Iterate over the properties of the props object.
          for (const prop of props.properties) {
            // We are only interested in standard properties with identifiers as keys (e.g., { onClick: ... }).
            if (prop.type !== 'Property' || prop.key.type !== 'Identifier') {
              continue
            }

            const value = prop.value
            // Case 1: A useCallback-wrapped function is passed directly.
            // e.g., { onClick: myCallback }
            if (value.type === 'Identifier' && callbackNames.has(value.name)) {
              reportPassToIntrinsic(prop, value.name)
            } else if (
              // Case 2: A new inline function is created that calls the useCallback-wrapped function.
              // e.g., { onClick: () => myCallback() }
              value.type === 'ArrowFunctionExpression' ||
              value.type === 'FunctionExpression'
            ) {
              const calledName = findCalledUseCallbackNameFromFunction(value)
              if (calledName) {
                reportCalledInsideInline(prop, calledName)
              }
            }
          }
        }
      },
    }
  },
}