import { literalKind } from '../utils/literal.js'

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer stable Context.Provider value: disallow inline object/array/function literals as provider value; wrap with useMemo/useCallback.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      preferStable:
        'Avoid passing a new {{kind}} literal to Context.Provider "value" on each render. Wrap it in useMemo/useCallback to provide a stable reference and prevent unnecessary context consumers re-rendering.',
    },
  },

  create(context) {
    function isProviderElement(nameNode) {
      // Match Something.Provider
      if (!nameNode || nameNode.type !== 'JSXMemberExpression') return false
      const property = nameNode.property
      return (
        property &&
        property.type === 'JSXIdentifier' &&
        property.name === 'Provider'
      )
    }

    return {
      JSXOpeningElement(node) {
        if (!isProviderElement(node.name)) return
        for (const attr of node.attributes || []) {
          if (!attr || attr.type !== 'JSXAttribute') continue
          if (
            !attr.name ||
            attr.name.type !== 'JSXIdentifier' ||
            attr.name.name !== 'value'
          )
            continue
          if (!attr.value || attr.value.type !== 'JSXExpressionContainer')
            continue
          const expr = attr.value.expression
          const kind = literalKind(expr)
          if (kind && ['object', 'array', 'function'].includes(kind)) {
            context.report({
              node: attr,
              messageId: 'preferStable',
              data: { kind },
            })
          }
        }
      },
    }
  },
}
