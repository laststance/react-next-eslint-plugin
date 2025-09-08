export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow useReducer React hook in favor of Redux Toolkit',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-use-reducer.md',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      noUseReducer:
        'Avoid useReducer hook. Instead, recommend using Redux Toolkit to eliminate the possibility of introducing bugs.',
    },
  },

  create(context) {
    const reportedNodes = new Set()

    /**
     * Reports a useReducer violation if not already reported
     * @param {object} node - The AST node to report
     */
    function reportUseReducer(node) {
      if (reportedNodes.has(node)) return
      reportedNodes.add(node)

      context.report({
        node,
        messageId: 'noUseReducer',
      })
    }

    /**
     * Checks if the given node is a useReducer hook call
     * @param {object} node - The AST node to check
     * @returns {boolean} True if the node is a useReducer call
     */
    function isUseReducerCall(node) {
      return (
        node &&
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'useReducer'
      )
    }

    /**
     * Checks if useReducer is imported from React
     * @param {object} node - The AST node to check
     * @returns {boolean} True if useReducer is imported from React
     */
    function isUseReducerImport(node) {
      return (
        node &&
        node.type === 'ImportDeclaration' &&
        node.source &&
        node.source.value === 'react' &&
        node.specifiers &&
        node.specifiers.some(
          (specifier) =>
            specifier.type === 'ImportSpecifier' &&
            specifier.imported &&
            specifier.imported.name === 'useReducer',
        )
      )
    }

    return {
      // Check for direct useReducer calls and React.useReducer calls
      CallExpression(node) {
        if (isUseReducerCall(node)) {
          reportUseReducer(node)
        }

        // Check for React.useReducer calls
        if (
          node.callee &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object &&
          node.callee.object.name === 'React' &&
          node.callee.property &&
          node.callee.property.name === 'useReducer'
        ) {
          reportUseReducer(node)
        }
      },

      // Check for useReducer imports
      ImportDeclaration(node) {
        if (isUseReducerImport(node)) {
          const useReducerSpecifier = node.specifiers.find(
            (specifier) =>
              specifier.type === 'ImportSpecifier' &&
              specifier.imported &&
              specifier.imported.name === 'useReducer',
          )

          if (useReducerSpecifier) {
            reportUseReducer(useReducerSpecifier)
          }
        }
      },
    }
  },
}
