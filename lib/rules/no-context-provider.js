/**
 * NOTE: Imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.
 */

import { getJsxElementType } from '../utils/jsx.js'
import { isComponentNameLoose } from '../utils/naming.js'
import { getReactSettings, isVersionAtLeastMajor } from '../utils/react-settings.js'

const PROVIDER_SUFFIX = '.Provider'
const REACT_VERSION_MAJOR = 19

/**
 * Determines if the rule should apply based on React settings.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @returns {boolean} True when React version is at least 19.
 */
function shouldCheck(context) {
  const { version } = getReactSettings(context)
  return isVersionAtLeastMajor(version, REACT_VERSION_MAJOR)
}

/**
 * Extracts the context name without the Provider suffix.
 * @param {string} fullName - Full JSX element name.
 * @returns {{ contextName: string | null, contextSelfName: string | null }} Result.
 */
function parseContextProviderName(fullName) {
  if (!fullName.endsWith(PROVIDER_SUFFIX)) {
    return { contextName: null, contextSelfName: null }
  }
  const contextName = fullName.slice(0, -PROVIDER_SUFFIX.length)
  const parts = contextName.split('.')
  const contextSelfName = parts.length > 0 ? parts[parts.length - 1] : null
  return { contextName, contextSelfName }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: "Replaces usage of '<Context.Provider>' with '<Context>'.",
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-context-provider.md',
    },
    fixable: 'code',
    hasSuggestions: false,
    schema: [],
    messages: {
      noContextProvider:
        "In React 19, you can render '<Context>' as a provider instead of '<Context.Provider>'.",
    },
  },

  /**
   * Creates rule listeners.
   * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
   * @returns {import('eslint').Rule.RuleListener} Rule listener map.
   */
  create(context) {
    if (!context.sourceCode.text.includes('Provider')) {
      return {}
    }
    if (!shouldCheck(context)) {
      return {}
    }
    return {
      JSXElement(node) {
        const fullName = getJsxElementType(node)
        if (!fullName) return
        const { contextName, contextSelfName } =
          parseContextProviderName(fullName)
        if (!contextName || !contextSelfName) return
        if (!contextSelfName.endsWith('Context')) return
        if (!isComponentNameLoose(contextSelfName)) return

        context.report({
          node,
          messageId: 'noContextProvider',
          fix(fixer) {
            const openingElement = node.openingElement
            const closingElement = node.closingElement
            if (!closingElement) {
              return fixer.replaceText(openingElement.name, contextName)
            }
            return [
              fixer.replaceText(openingElement.name, contextName),
              fixer.replaceText(closingElement.name, contextName),
            ]
          },
        })
      },
    }
  },
}
