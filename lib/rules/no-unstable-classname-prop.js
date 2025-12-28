import { literalKind } from '../utils/literal.js'

const ALLOWED_CLASSNAME_FUNCTION_NAMES = new Set([
  'cn',
  'cva',
  'clsx',
  'classnames',
])

/**
 * Determines whether a call expression is a supported className utility.
 * @param {import('estree').CallExpression} expression - The call expression to inspect.
 * @returns
 * - true when the callee resolves to an allowed className helper
 * - false when the call does not match a supported helper
 * @example
 * isAllowedClassNameCallExpression(cn('p-4')) // => true
 */
function isAllowedClassNameCallExpression(expression) {
  let current = expression.callee
  while (current && current.type === 'CallExpression') {
    current = current.callee
  }
  return (
    Boolean(current) &&
    current.type === 'Identifier' &&
    ALLOWED_CLASSNAME_FUNCTION_NAMES.has(current.name)
  )
}

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
    return {
      JSXAttribute(node) {
        if (
          !node.name ||
          node.name.type !== 'JSXIdentifier' ||
          node.name.name !== 'className'
        )
          return
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return
        const expr = node.value.expression
        if (expr.type === 'CallExpression' && isAllowedClassNameCallExpression(expr))
          return
        const kind = literalKind(expr)
        if (
          kind &&
          ['object', 'array', 'function call', 'string concatenation result'].includes(kind)
        ) {
          context.report({
            node,
            messageId: 'unstableClassName',
            data: { kind },
          })
        }
      },
    }
  },
}
