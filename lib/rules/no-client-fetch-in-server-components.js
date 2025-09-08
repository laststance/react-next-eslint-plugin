export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow client-side fetch APIs inside Next.js Server Components (no "use client").',
      category: 'Possible Errors',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      noClientFetch:
        'Avoid using client-only fetch APIs in Server Components. Use the Web Fetch API or move to a Client Component ("use client").',
    },
  },

  create(context) {
    let isClientComponent = false

    function isClientFetchCallee(callee) {
      if (!callee) return false
      if (
        callee.type === 'Identifier' &&
        (callee.name === 'axios' || callee.name === '$fetch')
      )
        return true
      if (
        callee.type === 'MemberExpression' &&
        callee.object &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'axios'
      )
        return true
      return false
    }

    return {
      Program(node) {
        // Detect "use client" at the top
        isClientComponent = false
        for (const stmt of node.body.slice(0, 3)) {
          if (
            stmt &&
            stmt.type === 'ExpressionStatement' &&
            stmt.expression &&
            stmt.expression.type === 'Literal' &&
            stmt.expression.value === 'use client'
          ) {
            isClientComponent = true
            break
          }
        }
      },

      CallExpression(node) {
        if (isClientComponent) return // ignore client components
        if (isClientFetchCallee(node.callee)) {
          context.report({ node, messageId: 'noClientFetch' })
        }
      },
    }
  },
}
