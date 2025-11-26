import { isPascalCase } from '../utils/naming.js'
import { isJSX } from '../utils/jsx.js'
import { isUseEffectCallee } from '../utils/hooks.js'

/**
 * Extracts the most relevant name for a function node.
 * Prefers the function's identifier, then falls back to the variable or property name it is assigned to.
 * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} node - Function-like AST node.
 * @returns {string | null} The function name when available.
 */
function getFunctionName(node) {
  if (node.id && node.id.type === 'Identifier') return node.id.name
  const parent = node.parent
  if (
    parent &&
    parent.type === 'VariableDeclarator' &&
    parent.id &&
    parent.id.type === 'Identifier'
  ) {
    return parent.id.name
  }
  if (
    parent &&
    parent.type === 'Property' &&
    parent.key &&
    parent.key.type === 'Identifier'
  ) {
    return parent.key.name
  }
  if (
    parent &&
    parent.type === 'MethodDefinition' &&
    parent.key &&
    parent.key.type === 'Identifier'
  ) {
    return parent.key.name
  }
  return null
}

/**
 * Determines whether a function name follows the custom hook convention.
 * @param {string | null} name - Function name to evaluate.
 * @returns {boolean} True when the name starts with "use" and the fourth character is capitalized or numeric.
 */
function isCustomHookName(name) {
  if (!name) return false
  return /^use[A-Z0-9]/.test(name)
}

/**
 * Checks if a function body likely returns JSX.
 * This heuristic inspects concise arrow bodies and return statements inside block bodies.
 * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} fnNode - Function to analyze.
 * @returns {boolean} True when JSX is returned.
 */
function functionReturnsJSX(fnNode) {
  if (fnNode.type === 'ArrowFunctionExpression' && fnNode.expression) {
    return isJSX(fnNode.body)
  }

  if (fnNode.body && fnNode.body.type === 'BlockStatement') {
    for (const statement of fnNode.body.body) {
      if (
        statement.type === 'ReturnStatement' &&
        statement.argument &&
        isJSX(statement.argument)
      ) {
        return true
      }
    }
  }
  return false
}

/**
 * Classifies a function as a React component candidate or custom hook.
 * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} node - Function node.
 * @returns {{ isComponent: boolean, isHook: boolean, name: string | null }} Role flags for the function.
 */
function classifyFunction(node) {
  const name = getFunctionName(node)
  const isHook = isCustomHookName(name)
  const isComponent =
    !isHook && Boolean((name && isPascalCase(name)) || functionReturnsJSX(node))

  return { isComponent, isHook, name }
}

/**
 * Determines whether a detected useEffect call should be reported based on the current function stack.
 * The nearest enclosing hook suppresses reporting, while the nearest enclosing component triggers it.
 * @param {Array<{ isComponent: boolean, isHook: boolean, name: string | null }>} stack - Active function ancestry.
 * @returns {{ shouldReport: boolean, componentName: string | null }} Decision and the relevant component name.
 */
function evaluateUseEffectContext(stack) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const frame = stack[i]
    if (frame.isHook) {
      return { shouldReport: false, componentName: null }
    }
    if (frame.isComponent) {
      return { shouldReport: true, componentName: frame.name }
    }
  }
  return { shouldReport: false, componentName: null }
}

/**
 * ESLint rule that forbids calling useEffect directly inside React components,
 * encouraging authors to extract meaningful custom hooks instead.
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow calling useEffect directly inside React components; extract effect logic into a custom hook.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-direct-use-effect.md',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      noDirectUseEffect:
        'Component "{{componentName}}" should not call useEffect directly. Extract this effect into a well-named custom hook (e.g., useDataLoader or useSyncProfile).',
    },
  },

  create(context) {
    const functionStack = []

    return {
      FunctionDeclaration(node) {
        functionStack.push(classifyFunction(node))
      },
      FunctionExpression(node) {
        functionStack.push(classifyFunction(node))
      },
      ArrowFunctionExpression(node) {
        functionStack.push(classifyFunction(node))
      },

      'FunctionDeclaration:exit'() {
        functionStack.pop()
      },
      'FunctionExpression:exit'() {
        functionStack.pop()
      },
      'ArrowFunctionExpression:exit'() {
        functionStack.pop()
      },

      CallExpression(node) {
        if (!isUseEffectCallee(node.callee)) return
        const { shouldReport, componentName } =
          evaluateUseEffectContext(functionStack)

        if (!shouldReport) return
        context.report({
          node,
          messageId: 'noDirectUseEffect',
          data: { componentName: componentName || 'This component' },
        })
      },
    }
  },
}
