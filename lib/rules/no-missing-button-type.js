/**
 * NOTE: Imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.
 */

import {
  getJsxAttribute,
  getStaticJsxAttributeStringValue,
} from '../utils/jsx-attributes.js'
import { getJsxElementType } from '../utils/jsx.js'
import { getReactSettings } from '../utils/react-settings.js'

const BUTTON_TYPES = ['button', 'submit', 'reset']

/**
 * Resolves the DOM element type for a JSX element.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').JSXElement} node - JSX element node.
 * @returns {string} DOM element type.
 */
function resolveDomElementType(context, node) {
  const elementName = getJsxElementType(node)
  if (!elementName) return ''
  if (elementName === elementName.toLowerCase()) {
    return elementName
  }
  const { polymorphicPropName } = getReactSettings(context)
  if (!polymorphicPropName) {
    return elementName
  }
  const polymorphicAttribute = getJsxAttribute(context, node)(polymorphicPropName)
  const staticValue = getStaticJsxAttributeStringValue(polymorphicAttribute)
  if (typeof staticValue === 'string') {
    return staticValue
  }
  return elementName
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: "Enforces an explicit 'type' attribute for 'button' elements.",
      category: 'Possible Errors',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-missing-button-type.md',
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      addTypeAttribute: 'Add type attribute with value "{{ type }}".',
      missingTypeAttribute: 'Missing an explicit type attribute for button.',
    },
  },

  /**
   * Creates rule listeners.
   * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
   * @returns {import('eslint').Rule.RuleListener} Rule listener map.
   */
  create(context) {
    return {
      JSXElement(node) {
        const domElementType = resolveDomElementType(context, node)
        if (domElementType !== 'button') return
        if (getJsxAttribute(context, node)('type') != null) return
        context.report({
          messageId: 'missingTypeAttribute',
          node: node.openingElement,
          suggest: BUTTON_TYPES.map((type) => ({
            messageId: 'addTypeAttribute',
            data: { type },
            fix: (fixer) =>
              fixer.insertTextAfter(
                node.openingElement.name,
                ` type="${type}"`,
              ),
          })),
        })
      },
    }
  },
}
