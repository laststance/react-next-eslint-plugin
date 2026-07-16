import {
  findVariableByName,
  getRuleScope,
  getRuleSourceCode,
} from '../utils/eslint-context.js'

const REACT_MODULE_NAME = 'react'
const DISALLOWED_REACT_CONTEXT_APIS = new Set(['createContext', 'useContext'])

/**
 * Reads a property name when rule visitors inspect dot or bracket access without evaluating code.
 * @param {import('estree').MemberExpression | import('estree').Property} node - Member or object-pattern property to inspect.
 * @returns {string | null} Static property name, or null for dynamic computed access.
 * @example
 * getStaticPropertyName(memberExpression) // => "useContext" for React["useContext"].
 */
function getStaticPropertyName(node) {
  const property = node.type === 'Property' ? node.key : node.property
  // Dot access exposes its name directly, while bracket access needs a string literal.
  if (!node.computed && property.type === 'Identifier') return property.name
  if (node.computed && property.type === 'Literal') {
    return typeof property.value === 'string' ? property.value : null
  }
  return null
}

/**
 * Recognizes the global require('react') boundary when CommonJS code is linted.
 * @param {import('estree').Node | null | undefined} node - Potential require call.
 * @param {import('eslint').Rule.RuleContext} context - Rule context used to reject a locally shadowed require function.
 * @returns {boolean} True only for a global require call whose sole argument is "react".
 * @example
 * isReactRequireCall(callExpression, context) // => true for require('react').
 */
function isReactRequireCall(node, context) {
  // Ignore calls that cannot represent the CommonJS require function.
  if (
    !node ||
    node.type !== 'CallExpression' ||
    node.callee.type !== 'Identifier' ||
    node.callee.name !== 'require'
  ) {
    return false
  }

  const sourceCode = getRuleSourceCode(context)
  const requireVariable = findVariableByName(
    getRuleScope(context, node.callee),
    node.callee.name,
  )

  return Boolean(
    (sourceCode.isGlobalReference(node.callee) || !requireVariable) &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'Literal' &&
    node.arguments[0].value === REACT_MODULE_NAME,
  )
}

/**
 * Recognizes TypeScript's import-equals form when namespace checks inspect an import binding.
 * @param {import('estree').Node} node - Import binding node that may be a TSImportEqualsDeclaration.
 * @returns {boolean} True only for `import Name = require('react')`.
 * @example
 * isReactTypeScriptImportEquals(tsImportNode) // => true for import React = require('react').
 */
function isReactTypeScriptImportEquals(node) {
  if (node.type !== 'TSImportEqualsDeclaration') return false
  const moduleReference = node.moduleReference
  return Boolean(
    moduleReference.type === 'TSExternalModuleReference' &&
    moduleReference.expression.type === 'Literal' &&
    moduleReference.expression.value === REACT_MODULE_NAME,
  )
}

/**
 * Checks variable metadata when a member visitor needs to prove a binding came from React.
 * @param {import('eslint').Scope.Definition} definition - ESLint scope definition for a resolved variable.
 * @param {import('eslint').Rule.RuleContext} context - Rule context used to validate CommonJS require calls.
 * @param {Set<import('eslint').Scope.Variable>} visitedVariables - Bindings already checked while following alias chains.
 * @returns {boolean} True for React default/namespace imports or identifiers assigned require('react').
 * @example
 * isReactNamespaceDefinition(definition, context, visitedVariables) // => true for import React from 'react'.
 */
function isReactNamespaceDefinition(definition, context, visitedVariables) {
  // Import bindings cover standard ESM imports and TypeScript import-equals declarations.
  if (definition.type === 'ImportBinding') {
    if (isReactTypeScriptImportEquals(definition.node)) return true
    return Boolean(
      definition.parent &&
      definition.parent.type === 'ImportDeclaration' &&
      definition.parent.source.value === REACT_MODULE_NAME &&
      (definition.node.type === 'ImportDefaultSpecifier' ||
        definition.node.type === 'ImportNamespaceSpecifier'),
    )
  }

  // Only simple variable declarations can create a namespace alias tracked by this rule.
  if (
    definition.type !== 'Variable' ||
    definition.node.type !== 'VariableDeclarator' ||
    definition.node.id.type !== 'Identifier'
  ) {
    return false
  }

  const initializer = definition.node.init
  if (isReactRequireCall(initializer, context)) return true
  return Boolean(
    initializer &&
    initializer.type === 'Identifier' &&
    isReactNamespaceIdentifier(initializer, context, visitedVariables),
  )
}

/**
 * Verifies an identifier is the React object before member and destructuring visitors report context APIs.
 * @param {import('estree').Identifier} identifier - Object identifier used by the candidate React API access.
 * @param {import('eslint').Rule.RuleContext} context - Rule context that provides source and lexical scope data.
 * @param {Set<import('eslint').Scope.Variable>} [visitedVariables] - Bindings already checked to stop cyclic aliases.
 * @returns {boolean} True for an imported/required React object or an unshadowed global named React.
 * @example
 * isReactNamespaceIdentifier(identifier, context) // => true for React.useContext after importing React.
 */
function isReactNamespaceIdentifier(
  identifier,
  context,
  visitedVariables = new Set(),
) {
  const sourceCode = getRuleSourceCode(context)
  const scope = getRuleScope(context, identifier)
  const variable = findVariableByName(scope, identifier.name)

  // Unresolved identifiers only count when ESLint confirms the traditional React global.
  if (!variable) {
    return (
      identifier.name === 'React' && sourceCode.isGlobalReference(identifier)
    )
  }

  // Stop cyclic aliases before recursively following their initializer definitions.
  if (visitedVariables.has(variable)) return false
  visitedVariables.add(variable)

  return variable.defs.some((definition) =>
    isReactNamespaceDefinition(definition, context, visitedVariables),
  )
}

/**
 * Recognizes imported and required React namespace expressions before access checks report a violation.
 * @param {import('estree').Node | null | undefined} node - Expression expected to produce the React namespace.
 * @param {import('eslint').Rule.RuleContext} context - Rule context used for binding resolution.
 * @returns {boolean} True when the expression is a React namespace identifier or require('react').
 * @example
 * isReactNamespaceExpression(identifier, context) // => true for a `ReactLibrary` namespace import.
 */
function isReactNamespaceExpression(node, context) {
  // A missing initializer cannot produce the React namespace.
  if (!node) return false
  // Direct CommonJS access is accepted before resolving identifier aliases.
  if (isReactRequireCall(node, context)) return true
  return node.type === 'Identifier' && isReactNamespaceIdentifier(node, context)
}

/**
 * Disallows React context APIs so projects use explicit data flow or an external store instead.
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow React createContext and useContext APIs.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-react-context.md',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      noReactContext:
        'Do not use React.{{apiName}}. Prefer explicit props, component composition, or an external state store.',
    },
  },

  /**
   * Registers import, member, and destructuring checks when ESLint runs this rule for a source file.
   * @param {import('eslint').Rule.RuleContext} context - ESLint rule context used to report forbidden APIs.
   * @returns {import('eslint').Rule.RuleListener} Listeners that check every supported React API access form.
   * @example
   * rule.create(context) // => ESLint listeners for imports, members, and variable declarators.
   */
  create(context) {
    /**
     * Reports forbidden React context named imports as ESLint visits each import specifier.
     * @param {import('estree').ImportSpecifier} node - Named import specifier to inspect.
     * @returns {void} Reports once for a forbidden React context API; otherwise returns silently.
     * @example
     * checkImportSpecifier(importSpecifier) // Reports `import { useContext } from 'react'`.
     */
    function checkImportSpecifier(node) {
      const importDeclaration = node.parent
      // Ignore matching API names unless the named import comes from React itself.
      if (
        importDeclaration.type !== 'ImportDeclaration' ||
        importDeclaration.source.value !== REACT_MODULE_NAME
      ) {
        return
      }

      const importedName = node.imported.name
      // Other React named imports remain available.
      if (!DISALLOWED_REACT_CONTEXT_APIS.has(importedName)) return

      context.report({
        node,
        messageId: 'noReactContext',
        data: { apiName: importedName },
      })
    }

    /**
     * Reports forbidden properties when a React object is accessed through dot or bracket syntax.
     * @param {import('estree').MemberExpression} node - Member expression to inspect.
     * @returns {void} Reports a forbidden React context API access; otherwise returns silently.
     * @example
     * checkMemberExpression(memberExpression) // Reports React.useContext.
     */
    function checkMemberExpression(node) {
      const apiName = getStaticPropertyName(node)
      // Dynamic or unrelated member names are outside this rule's two forbidden APIs.
      if (!apiName || !DISALLOWED_REACT_CONTEXT_APIS.has(apiName)) return
      // The object must resolve to React rather than a same-shaped local object.
      if (!isReactNamespaceExpression(node.object, context)) return

      context.report({
        node,
        messageId: 'noReactContext',
        data: { apiName },
      })
    }

    /**
     * Reports forbidden properties when source code destructures APIs from a React namespace or require call.
     * @param {import('estree').VariableDeclarator} node - Variable declaration whose object pattern may read React APIs.
     * @returns {void} Reports each forbidden property; otherwise returns silently.
     * @example
     * checkVariableDeclarator(declarator) // Reports const { createContext } = require('react').
     */
    function checkVariableDeclarator(node) {
      // Ignore declarations unless they destructure from a proven React namespace.
      if (
        node.id.type !== 'ObjectPattern' ||
        !isReactNamespaceExpression(node.init, context)
      ) {
        return
      }

      // Check each destructured key because one declaration can import both forbidden APIs.
      for (const property of node.id.properties) {
        // Rest elements cannot name either forbidden API directly.
        if (property.type !== 'Property') continue
        const apiName = getStaticPropertyName(property)
        // Preserve unrelated destructured React exports.
        if (!apiName || !DISALLOWED_REACT_CONTEXT_APIS.has(apiName)) continue

        context.report({
          node: property,
          messageId: 'noReactContext',
          data: { apiName },
        })
      }
    }

    return {
      ImportSpecifier: checkImportSpecifier,
      MemberExpression: checkMemberExpression,
      VariableDeclarator: checkVariableDeclarator,
    }
  },
}
