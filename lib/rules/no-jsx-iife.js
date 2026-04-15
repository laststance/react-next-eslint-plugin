/**
 * Determines whether an expression is a directly invoked function expression inside JSX.
 * @param {import('estree').Expression | import('estree').JSXEmptyExpression | null | undefined} expression - Expression to inspect.
 * @returns
 * - `true`: the expression is a `CallExpression` (including optional-call inside `ChainExpression`) whose callee is an arrow/function expression
 * - `false`: the expression is anything else
 * @example
 * isImmediatelyInvokedFunctionExpression({
 *   type: 'CallExpression',
 *   callee: { type: 'ArrowFunctionExpression' },
 * }) // => true
 */
function isImmediatelyInvokedFunctionExpression(expression) {
  // Unwrap ChainExpression so optional-call IIFEs like `(() => 'x')?.()` are caught.
  const target =
    expression && expression.type === 'ChainExpression'
      ? expression.expression
      : expression

  return Boolean(
    target &&
      target.type === 'CallExpression' &&
      (target.callee.type === 'ArrowFunctionExpression' ||
        target.callee.type === 'FunctionExpression'),
  )
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow immediately invoked function expressions inside JSX.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-jsx-iife.md',
    },
    schema: [],
    messages: {
      noJsxIife:
        'Do not use immediately invoked function expressions inside JSX. Move the logic outside JSX and reference the computed value instead.',
    },
  },

  /**
   * Creates rule listeners for JSX expression containers.
   * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
   * @returns
   * - `RuleListener`: listeners that report directly invoked function expressions inside JSX
   * @example
   * create(context) // => { JSXExpressionContainer(node) { ... } }
   */
  create(context) {
    return {
      JSXExpressionContainer(node) {
        if (!isImmediatelyInvokedFunctionExpression(node.expression)) {
          return
        }

        context.report({
          node: node.expression,
          messageId: 'noJsxIife',
        })
      },
    }
  },
}
