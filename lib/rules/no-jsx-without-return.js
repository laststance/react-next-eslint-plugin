export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow JSX elements not returned or assigned',
      category: 'Possible Errors',
      recommended: true,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-jsx-without-return.md',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      jsxWithoutReturn: 'JSX must be returned or assigned. Did you forget to write "return"?',
      jsxInIfWithoutReturn: 'JSX in if statement must be returned or wrapped in a block. Did you forget to write "return" or "{}"?',
      jsxInElseWithoutReturn: 'JSX in else statement must be returned or wrapped in a block. Did you forget to write "return" or "{}"?',
    },
  },

  create(context) {
    /**
     * Determines whether the given AST node is a JSX element or JSX fragment.
     *
     * @param {object} node - The AST node to check.
     * @returns {boolean} True if the node is a JSX element or fragment; otherwise, false.
     */
    function isJSX(node) {
      return (
        node && (node.type === 'JSXElement' || node.type === 'JSXFragment')
      )
    }

    return {
      // Check for standalone JSX expressions
      ExpressionStatement(node) {
        if (isJSX(node.expression)) {
          context.report({
            node,
            messageId: 'jsxWithoutReturn',
          })
        }
      },

      // Check for JSX in if statements without return
      IfStatement(node) {
        // Check if the consequent (the "then" part) is a JSX element directly
        // (not wrapped in a block or return statement)
        if (
          node.consequent &&
          node.consequent.type !== 'BlockStatement' &&
          isJSX(node.consequent)
        ) {
          context.report({
            node: node.consequent,
            messageId: 'jsxInIfWithoutReturn',
          })
        }

        // Also check the "else" part if it exists
        if (
          node.alternate &&
          node.alternate.type !== 'BlockStatement' &&
          node.alternate.type !== 'IfStatement' &&
          isJSX(node.alternate)
        ) {
          context.report({
            node: node.alternate,
            messageId: 'jsxInElseWithoutReturn',
          })
        }
      },
    }
  },
}