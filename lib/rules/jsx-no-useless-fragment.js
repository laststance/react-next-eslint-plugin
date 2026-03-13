/**
 * NOTE: Imported and adapted from https://github.com/Rel1cx/eslint-react.
 */

import { getJsxAttribute } from '../utils/jsx-attributes.js'
import { getJsxElementType } from '../utils/jsx.js'

const NODE_TYPE_JSX_ELEMENT = 'JSXElement'
const NODE_TYPE_JSX_EXPRESSION_CONTAINER = 'JSXExpressionContainer'
const NODE_TYPE_JSX_FRAGMENT = 'JSXFragment'
const NODE_TYPE_JSX_TEXT = 'JSXText'
const FRAGMENT_COMPONENT_NAME = 'Fragment'
const REACT_FRAGMENT_COMPONENT_NAME = 'React.Fragment'
const KEY_ATTRIBUTE_NAME = 'key'
const REF_ATTRIBUTE_NAME = 'ref'
const NEWLINE_CHARACTER = '\n'
const EMPTY_TEXT = ''
const NO_CHILDREN_COUNT = 0
const SINGLE_CHILD_COUNT = 1
const REASON_PLACED_INSIDE_HOST_COMPONENT = 'placed inside a host component'
const REASON_CONTAINS_LESS_THAN_TWO_CHILDREN = 'contains less than two children'

/**
 * Checks whether a node is a JSXElement.
 * @param {import('estree').Node | null | undefined} node - Node to inspect.
 * @returns {node is import('estree').JSXElement} True when node is JSXElement.
 */
function isJsxElement(node) {
  return Boolean(node && node.type === NODE_TYPE_JSX_ELEMENT)
}

/**
 * Checks whether a node is a JSXFragment.
 * @param {import('estree').Node | null | undefined} node - Node to inspect.
 * @returns {node is import('estree').JSXFragment} True when node is JSXFragment.
 */
function isJsxFragment(node) {
  return Boolean(node && node.type === NODE_TYPE_JSX_FRAGMENT)
}

/**
 * Checks whether a node is a JSXExpressionContainer.
 * @param {import('estree').Node | null | undefined} node - Node to inspect.
 * @returns {boolean} True when node is JSXExpressionContainer.
 */
function isJsxExpressionContainer(node) {
  return Boolean(node && node.type === NODE_TYPE_JSX_EXPRESSION_CONTAINER)
}

/**
 * Checks whether a node is a JSXText node.
 * @param {import('estree').Node | null | undefined} node - Node to inspect.
 * @returns {node is import('estree').JSXText} True when node is JSXText.
 */
function isJsxText(node) {
  return Boolean(node && node.type === NODE_TYPE_JSX_TEXT)
}

/**
 * Checks whether JSX text is only whitespace.
 * @param {import('estree').JSXText | null | undefined} node - JSX text node.
 * @returns {boolean} True when text is whitespace only.
 */
function isWhiteSpace(node) {
  if (!isJsxText(node)) return false
  return node.value.trim() === EMPTY_TEXT
}

/**
 * Checks whether a JSXText node is ignorable padding spaces.
 * @param {import('estree').Node | null | undefined} node - Child node.
 * @returns {boolean} True when node is whitespace padding with a line break.
 */
function isPaddingSpaces(node) {
  return (
    isJsxText(node) &&
    isWhiteSpace(node) &&
    node.value.includes(NEWLINE_CHARACTER)
  )
}

/**
 * Checks whether a JSX element is a host element (lowercase tag name).
 * @param {import('estree').Node | null | undefined} node - Node to inspect.
 * @returns {boolean} True when element is an intrinsic host element.
 */
function isHostJsxElement(node) {
  if (!isJsxElement(node)) return false
  const elementType = getJsxElementType(node)
  return Boolean(elementType && elementType === elementType.toLowerCase())
}

/**
 * Checks whether a JSX element is Fragment/React.Fragment.
 * @param {import('estree').Node | null | undefined} node - Node to inspect.
 * @returns {boolean} True when the element represents a fragment component.
 */
function isFragmentElement(node) {
  if (!isJsxElement(node)) return false
  const elementType = getJsxElementType(node)
  return (
    elementType === FRAGMENT_COMPONENT_NAME ||
    elementType === REACT_FRAGMENT_COMPONENT_NAME
  )
}

/**
 * Trims extracted JSX text in the same way React treats leading/trailing newlines.
 * @param {string} text - Extracted text between opening and closing tags.
 * @returns {string} React-like trimmed text.
 */
function trimLikeReact(text) {
  const leadingSpaces = /^\s*/.exec(text)?.[0] ?? EMPTY_TEXT
  const trailingSpaces = /\s*$/.exec(text)?.[0] ?? EMPTY_TEXT

  const start = leadingSpaces.includes(NEWLINE_CHARACTER)
    ? leadingSpaces.length
    : 0
  const end = trailingSpaces.includes(NEWLINE_CHARACTER)
    ? text.length - trailingSpaces.length
    : text.length

  return text.slice(start, end)
}

/**
 * Checks whether a fragment contains an attribute by name.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').JSXElement} node - Fragment element node.
 * @param {string} name - Attribute name to look for.
 * @returns {boolean} True when the attribute is present.
 */
function hasFragmentAttribute(context, node, name) {
  return getJsxAttribute(context, node)(name) != null
}

/**
 * Determines whether auto-fix is safe for the current fragment node.
 * @param {import('estree').JSXElement | import('estree').JSXFragment} node - Fragment node.
 * @returns {boolean} True when replacing the fragment is safe.
 */
function canFix(node) {
  const parent = node.parent

  if (isJsxElement(parent) || isJsxFragment(parent)) {
    return isHostJsxElement(parent)
  }

  if (node.children.length === NO_CHILDREN_COUNT) {
    return false
  }

  return !node.children.some((child) => {
    if (isJsxExpressionContainer(child)) return true
    return isJsxText(child) && !isWhiteSpace(child)
  })
}

/**
 * Creates an autofix function that unwraps a useless fragment.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').JSXElement | import('estree').JSXFragment} node - Fragment node.
 * @returns {import('eslint').Rule.ReportFixer | null} Fixer or null when unsafe.
 */
function getFix(context, node) {
  if (!canFix(node)) return null

  return (fixer) => {
    const opener = isJsxFragment(node)
      ? node.openingFragment
      : node.openingElement
    const closer = isJsxFragment(node)
      ? node.closingFragment
      : node.closingElement

    const childrenText =
      !isJsxFragment(node) && opener.selfClosing
        ? EMPTY_TEXT
        : context.sourceCode.getText().slice(opener.range[1], closer.range[0])

    return fixer.replaceText(node, trimLikeReact(childrenText))
  }
}

/**
 * Reports a useless fragment with a specific reason.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').JSXElement | import('estree').JSXFragment} node - Fragment node.
 * @param {string} reason - Human-readable reason message.
 */
function reportUselessFragment(context, node, reason) {
  context.report({
    node,
    messageId: 'default',
    data: { reason },
    fix: getFix(context, node),
  })
}

/**
 * Evaluates whether a fragment node is useless under current options.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @param {import('estree').JSXElement | import('estree').JSXFragment} node - Fragment node.
 * @param {{ allowEmptyFragment?: boolean, allowExpressions?: boolean }} options - Rule options.
 */
function checkNode(context, node, options) {
  const { allowEmptyFragment = false, allowExpressions = true } = options
  const parent = node.parent
  const isChildElement = isJsxElement(parent) || isJsxFragment(parent)

  if (isHostJsxElement(parent)) {
    reportUselessFragment(context, node, REASON_PLACED_INSIDE_HOST_COMPONENT)
  }

  if (node.children.length === NO_CHILDREN_COUNT) {
    if (!allowEmptyFragment) {
      reportUselessFragment(
        context,
        node,
        REASON_CONTAINS_LESS_THAN_TWO_CHILDREN,
      )
    }
    return
  }

  if (!allowExpressions && isChildElement) {
    reportUselessFragment(context, node, REASON_CONTAINS_LESS_THAN_TWO_CHILDREN)
    return
  }

  if (
    !allowExpressions &&
    !isChildElement &&
    node.children.length === SINGLE_CHILD_COUNT
  ) {
    reportUselessFragment(context, node, REASON_CONTAINS_LESS_THAN_TWO_CHILDREN)
    return
  }

  const nonPaddingChildren = node.children.filter(
    (child) => !isPaddingSpaces(child),
  )
  const firstNonPaddingChild = nonPaddingChildren[0]

  if (
    nonPaddingChildren.length === NO_CHILDREN_COUNT ||
    (nonPaddingChildren.length === SINGLE_CHILD_COUNT &&
      !isJsxExpressionContainer(firstNonPaddingChild))
  ) {
    reportUselessFragment(context, node, REASON_CONTAINS_LESS_THAN_TWO_CHILDREN)
  }
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallows useless fragment elements.',
      category: 'Stylistic Issues',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/jsx-no-useless-fragment.md',
    },
    fixable: 'code',
    hasSuggestions: false,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allowEmptyFragment: {
            type: 'boolean',
            description: 'Allow empty fragments.',
          },
          allowExpressions: {
            type: 'boolean',
            description: 'Allow fragments with a single expression child.',
          },
        },
      },
    ],
    messages: {
      default: 'A fragment {{reason}} is useless.',
    },
  },

  /**
   * Creates rule listeners.
   * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
   * @returns {import('eslint').Rule.RuleListener} Rule listener map.
   */
  create(context) {
    const options = context.options[0] ?? {}

    return {
      JSXElement(node) {
        if (!isFragmentElement(node)) return
        if (hasFragmentAttribute(context, node, KEY_ATTRIBUTE_NAME)) return
        if (hasFragmentAttribute(context, node, REF_ATTRIBUTE_NAME)) return
        checkNode(context, node, options)
      },
      JSXFragment(node) {
        checkNode(context, node, options)
      },
    }
  },
}
