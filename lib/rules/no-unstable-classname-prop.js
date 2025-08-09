export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow inline object/array/classnames constructions in JSX className prop; prefer stable string or memoized value to avoid re-renders in memoized components.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      unstableClassName:
        'Avoid creating a new {{kind}} for className on each render. Prefer a stable string, template literal, or a memoized result of a classnames utility.',
    },
  },

  create(context) {
    function literalKind(node) {
      if (!node) return null;
      if (node.type === 'ObjectExpression') return 'object';
      if (node.type === 'ArrayExpression') return 'array';
      if (node.type === 'CallExpression') return 'function call';
      if (node.type === 'BinaryExpression' && node.operator === '+') return 'string concatenation result';
      return null;
    }

    return {
      JSXAttribute(node) {
        if (!node.name || node.name.type !== 'JSXIdentifier' || node.name.name !== 'className') return;
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;
        const expr = node.value.expression;
        const kind = literalKind(expr);
        if (kind) {
          context.report({ node, messageId: 'unstableClassName', data: { kind } });
        }
      },
    };
  },
};
