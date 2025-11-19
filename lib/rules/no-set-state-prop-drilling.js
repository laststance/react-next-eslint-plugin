import { isUseStateCallee } from '../utils/hooks.js'

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Disallow passing React.useState's updater function through props; prefer semantic handlers or state management.",
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      noPropDrillSetter:
        'Avoid prop-drilling a React.useState updater ({{name}}). It tightly couples components and can cause unnecessary re-renders due to unstable function identity. Prefer exposing a semantic handler (e.g., onIncrement) or use a state management library (e.g., Zustand, Redux, Jotai).',
    },
  },

  create(context) {
    const setterNames = new Set()

    function collectSetterFromDeclarator(node) {
      // const [state, setState] = useState(...)
      if (
        node.id &&
        node.id.type === 'ArrayPattern' &&
        node.init &&
        node.init.type === 'CallExpression' &&
        isUseStateCallee(node.init.callee)
      ) {
        const elements = node.id.elements || []
        if (elements.length >= 2) {
          const setter = elements[1]
          if (setter && setter.type === 'Identifier') {
            setterNames.add(setter.name)
          }
        }
      }
    }

    function isPassingSetterExpression(expr) {
      if (!expr) return false
      // Passing setter directly is disallowed
      if (expr.type === 'Identifier' && setterNames.has(expr.name)) return true
      // { onClick: setCount } inside object literal (e.g., React.createElement props)
      if (expr.type === 'ObjectExpression') {
        for (const prop of expr.properties) {
          if (prop.type === 'Property' && !prop.computed) {
            const v = prop.value
            if (v && v.type === 'Identifier' && setterNames.has(v.name))
              return true
          }
        }
      }
      return false
    }

    return {
      VariableDeclarator(node) {
        collectSetterFromDeclarator(node)
      },

      // Disallow <Child prop={setCount} />
      JSXAttribute(node) {
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return
        const expr = node.value.expression
        // Allow function wrappers: () => setCount(...), function(){...}
        if (
          expr &&
          (expr.type === 'ArrowFunctionExpression' ||
            expr.type === 'FunctionExpression')
        )
          return
        if (isPassingSetterExpression(expr)) {
          let name = null
          if (expr.type === 'Identifier') name = expr.name
          context.report({
            node,
            messageId: 'noPropDrillSetter',
            data: { name },
          })
        }
      },

      // Disallow React.createElement(Child, { onClick: setCount })
      CallExpression(node) {
        const callee = node.callee
        const isCreateElement =
          (callee.type === 'Identifier' && callee.name === 'createElement') ||
          (callee.type === 'MemberExpression' &&
            !callee.computed &&
            callee.property &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'createElement')
        if (!isCreateElement) return
        const args = node.arguments || []
        if (args.length >= 2) {
          const propsArg = args[1]
          if (isPassingSetterExpression(propsArg)) {
            let name = null
            if (propsArg.type === 'ObjectExpression') {
              const prop = propsArg.properties.find(
                (p) =>
                  p.type === 'Property' &&
                  p.value &&
                  p.value.type === 'Identifier' &&
                  setterNames.has(p.value.name),
              )
              if (prop && prop.value && prop.value.type === 'Identifier')
                name = prop.value.name
            }
            context.report({
              node,
              messageId: 'noPropDrillSetter',
              data: { name },
            })
          }
        }
      },
    }
  },
}
