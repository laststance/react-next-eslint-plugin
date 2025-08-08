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
    const reportedNodes = new Set();
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

    function isJSXExpressionStatement(node) {
      return node && node.type === 'ExpressionStatement' && isJSX(node.expression);
    }

    return {
      // Check for standalone JSX expressions
      ExpressionStatement(node) {
        if (isJSX(node.expression)) {
          if (reportedNodes.has(node)) return;
          context.report({
            node,
            messageId: 'jsxWithoutReturn',
          })
        }
      },

      // Check for JSX in if statements without return
      IfStatement(node) {
        // Then branch: JSX as a bare expression (no block/return)
        if (
          node.consequent &&
          node.consequent.type !== 'BlockStatement' &&
          isJSXExpressionStatement(node.consequent)
        ) {
          reportedNodes.add(node.consequent);
          context.report({
            node: node.consequent,
            messageId: 'jsxInIfWithoutReturn',
          })
        }

        // Else branch: JSX as a bare expression (no block/return)
        if (
          node.alternate &&
          node.alternate.type !== 'BlockStatement' &&
          node.alternate.type !== 'IfStatement' &&
          isJSXExpressionStatement(node.alternate)
        ) {
          reportedNodes.add(node.alternate);
          context.report({
            node: node.alternate,
            messageId: 'jsxInElseWithoutReturn',
          })
        }
      },
    }
  },
}