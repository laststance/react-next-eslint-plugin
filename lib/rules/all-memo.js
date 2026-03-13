import { isPascalCase } from '../utils/naming.js'
import { isJSX } from '../utils/jsx.js'
import { getRuleFilename } from '../utils/eslint-context.js'

/**
 * @fileoverview Enforce wrapping all React function components with React.memo.
 * @author laststance
 */

const VIRTUAL_FILENAME = '<input>'
const SERVER_COMPONENT_LAYOUT_FILENAME = 'layout.tsx'
const STORYBOOK_FILENAME_SEGMENT = '.stories.'
const PATH_SEPARATOR_PATTERN = /[\\/]/g
const REACT_MODULE_NAME = 'react'
const IMPORT_FIX_MODE_NONE = 'none'
const IMPORT_FIX_MODE_ADD_REACT_IMPORT = 'add-react-import'
const IMPORT_FIX_MODE_AUGMENT_REACT_IMPORT = 'augment-react-import'

/**
 * Determines whether the current file should be excluded from this rule.
 * @param {string} filename The filename reported by ESLint.
 * @returns
 * - true: when the file is a Next.js layout.tsx or a Storybook story file
 * - false: when the file should be linted by this rule
 * @example
 * shouldIgnoreFile('/app/layout.tsx') // => true
 */
function shouldIgnoreFile(filename) {
  if (!filename || filename === VIRTUAL_FILENAME) {
    return false
  }

  const normalizedFilename = filename.replace(PATH_SEPARATOR_PATTERN, '/')
  const baseName = normalizedFilename.split('/').pop() || ''

  return (
    baseName === SERVER_COMPONENT_LAYOUT_FILENAME ||
    normalizedFilename.includes(STORYBOOK_FILENAME_SEGMENT)
  )
}

/**
 * Determines whether a variable declarator is defined at the top-level scope.
 * @param {import('estree').VariableDeclarator} node The variable declarator to inspect.
 * @returns {boolean} True when the declaration is directly under Program or ExportNamedDeclaration.
 */
function isTopLevelVariableDeclarator(node) {
  const declaration = node.parent
  if (!declaration || declaration.type !== 'VariableDeclaration') {
    return false
  }

  const parent = declaration.parent
  return (
    !!parent &&
    (parent.type === 'Program' || parent.type === 'ExportNamedDeclaration')
  )
}

/**
 * Determines whether a statement is a directive prologue statement.
 * @param {import('estree').Statement} statement The statement to inspect.
 * @returns {boolean} True when the statement is a string literal expression.
 */
function isDirectivePrologueStatement(statement) {
  return (
    statement.type === 'ExpressionStatement' &&
    statement.expression.type === 'Literal' &&
    typeof statement.expression.value === 'string'
  )
}

/**
 * Finds the node after which a newly inserted import should be appended.
 * @param {import('estree').Program} programNode The AST program node.
 * @returns {import('estree').Statement | null} The insertion anchor node, if available.
 */
function findImportInsertionAnchor(programNode) {
  let lastImportNode = null
  let lastDirectiveNode = null

  for (const statement of programNode.body) {
    if (statement.type === 'ImportDeclaration') {
      lastImportNode = statement
      continue
    }

    if (isDirectivePrologueStatement(statement) && !lastImportNode) {
      lastDirectiveNode = statement
      continue
    }

    if (!isDirectivePrologueStatement(statement)) {
      break
    }
  }

  return lastImportNode || lastDirectiveNode
}

/**
 * Collects import information related to React.
 * @param {import('estree').Program} programNode The AST program node.
 * @returns {{
 *   memoImportLocalName: string | null
 *   reactObjectName: string | null
 *   firstReactNamedImportSpecifier: import('estree').ImportSpecifier | null
 * }}
 */
function collectReactImportInfo(programNode) {
  const reactImportInfo = {
    memoImportLocalName: null,
    reactObjectName: null,
    firstReactNamedImportSpecifier: null,
  }

  for (const statement of programNode.body) {
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.source.type !== 'Literal' ||
      statement.source.value !== REACT_MODULE_NAME ||
      statement.importKind === 'type'
    ) {
      continue
    }

    for (const specifier of statement.specifiers) {
      if (
        specifier.type === 'ImportDefaultSpecifier' ||
        specifier.type === 'ImportNamespaceSpecifier'
      ) {
        if (!reactImportInfo.reactObjectName) {
          reactImportInfo.reactObjectName = specifier.local.name
        }
        continue
      }

      if (
        specifier.type !== 'ImportSpecifier' ||
        specifier.importKind === 'type'
      ) {
        continue
      }

      if (!reactImportInfo.firstReactNamedImportSpecifier) {
        reactImportInfo.firstReactNamedImportSpecifier = specifier
      }

      const imported =
        specifier.imported.type === 'Identifier'
          ? specifier.imported.name
          : String(specifier.imported.value)
      if (imported === 'memo' && !reactImportInfo.memoImportLocalName) {
        reactImportInfo.memoImportLocalName = specifier.local.name
      }
    }
  }

  return reactImportInfo
}

/**
 * Resolves the autofix strategy for wrapping components with `memo`.
 * @param {{
 *   memoImportLocalName: string | null
 *   reactObjectName: string | null
 *   firstReactNamedImportSpecifier: import('estree').ImportSpecifier | null
 * }} reactImportInfo React import information.
 * @returns {{
 *   memoCalleeText: string
 *   importFixMode: 'none' | 'add-react-import' | 'augment-react-import'
 *   reactNamedImportSpecifier: import('estree').ImportSpecifier | null
 * }}
 */
function resolveMemoFixStrategy(reactImportInfo) {
  if (reactImportInfo.memoImportLocalName) {
    return {
      memoCalleeText: reactImportInfo.memoImportLocalName,
      importFixMode: IMPORT_FIX_MODE_NONE,
      reactNamedImportSpecifier: null,
    }
  }

  if (reactImportInfo.reactObjectName) {
    return {
      memoCalleeText: `${reactImportInfo.reactObjectName}.memo`,
      importFixMode: IMPORT_FIX_MODE_NONE,
      reactNamedImportSpecifier: null,
    }
  }

  if (reactImportInfo.firstReactNamedImportSpecifier) {
    return {
      memoCalleeText: 'memo',
      importFixMode: IMPORT_FIX_MODE_AUGMENT_REACT_IMPORT,
      reactNamedImportSpecifier: reactImportInfo.firstReactNamedImportSpecifier,
    }
  }

  return {
    memoCalleeText: 'memo',
    importFixMode: IMPORT_FIX_MODE_ADD_REACT_IMPORT,
    reactNamedImportSpecifier: null,
  }
}

/**
 * Builds fixer operations that insert `memo` import when needed.
 * @param {import('eslint').Rule.RuleFixer} fixer ESLint fixer object.
 * @param {import('eslint').SourceCode} sourceCode Source code object.
 * @param {{
 *   importFixMode: 'none' | 'add-react-import' | 'augment-react-import'
 *   reactNamedImportSpecifier: import('estree').ImportSpecifier | null
 * }} memoFixStrategy Resolved memo fix strategy.
 * @returns {import('eslint').Rule.Fix | null} Import-related fix operation.
 */
function createMemoImportFix(fixer, sourceCode, memoFixStrategy) {
  if (memoFixStrategy.importFixMode === IMPORT_FIX_MODE_NONE) {
    return null
  }

  if (
    memoFixStrategy.importFixMode === IMPORT_FIX_MODE_AUGMENT_REACT_IMPORT &&
    memoFixStrategy.reactNamedImportSpecifier
  ) {
    return fixer.insertTextBefore(
      memoFixStrategy.reactNamedImportSpecifier,
      'memo, ',
    )
  }

  const programNode = sourceCode.ast
  const importDeclaration = `import { memo } from '${REACT_MODULE_NAME}'`
  const anchor = findImportInsertionAnchor(programNode)

  if (anchor) {
    return fixer.insertTextAfter(anchor, `\n${importDeclaration}`)
  }

  const firstStatement = programNode.body[0]
  if (firstStatement) {
    return fixer.insertTextBefore(firstStatement, `${importDeclaration}\n`)
  }

  return fixer.insertTextBeforeRange([0, 0], `${importDeclaration}\n`)
}

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce wrapping all React function components with React.memo',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: 'code',
    hasSuggestions: false,
    schema: [],
    messages: {
      notMemoized:
        'React function component "{{name}}" should be wrapped with React.memo(...)',
    },
  },

  /**
   * Creates an ESLint rule listener.
   * This rule identifies React function components that are not wrapped with `React.memo`
   * and reports them. It tracks component candidates based on PascalCase naming and JSX return,
   * and marks components as memoized if they are wrapped with `memo` or `React.memo`.
   * @param {import('eslint').Rule.RuleContext} context The ESLint rule context.
   * @returns {import('eslint').Rule.NodeListener} A visitor object for AST nodes.
   */
  create(context) {
    const filename = getRuleFilename(context)
    if (shouldIgnoreFile(filename)) {
      return {}
    }

    const sourceCode = context.sourceCode
    const reactImportInfo = collectReactImportInfo(sourceCode.ast)
    const memoFixStrategy = resolveMemoFixStrategy(reactImportInfo)
    const memoCallIdentifierNames = new Set(['memo'])
    if (reactImportInfo.memoImportLocalName) {
      memoCallIdentifierNames.add(reactImportInfo.memoImportLocalName)
    }

    // Stores potential React function components that need to be checked for memoization.
    // Map: componentName (string) -> candidate descriptor
    const componentCandidates = new Map()
    // Stores the names of components that are already identified as wrapped with memo.
    const memoWrappedNames = new Set()

    /**
     * Determines if a function node (ArrowFunctionExpression, FunctionExpression, FunctionDeclaration)
     * appears to return JSX. This is a heuristic used to identify potential React components.
     * It checks for an immediate JSX return in concise body arrow functions, or a ReturnStatement
     * with a JSX argument within a block body.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression | null | undefined} fnNode The function AST node to analyze.
     * @returns {boolean} True if the function likely returns JSX, false otherwise.
     */
    function functionReturnsJSX(fnNode) {
      // Ensure the node is a function type we're interested in.
      if (
        !fnNode ||
        (fnNode.type !== 'ArrowFunctionExpression' &&
          fnNode.type !== 'FunctionExpression' &&
          fnNode.type !== 'FunctionDeclaration')
      ) {
        return false
      }

      // Handle arrow functions with a concise body (implicit return).
      // e.g., `const Comp = () => <div />`
      if (
        fnNode.type === 'ArrowFunctionExpression' &&
        fnNode.expression && // `expression` is true for concise body arrow functions
        isJSX(fnNode.body)
      ) {
        return true
      }

      // Handle block body functions (e.g., `function() { return <div />; }` or `() => { return <div />; }`).
      const body =
        fnNode.body && fnNode.body.type === 'BlockStatement'
          ? fnNode.body.body // Get the list of statements within the block
          : []
      // Iterate through the statements to find a return statement that directly returns JSX.
      for (const stmt of body) {
        if (
          stmt.type === 'ReturnStatement' &&
          stmt.argument &&
          isJSX(stmt.argument)
        ) {
          return true
        }
      }
      return false
    }

    /**
     * Checks if a given CallExpression node represents a `memo` call (e.g., `memo(...)` or `React.memo(...)`).
     * This is crucial for identifying components that are already memoized.
     * @param {import('estree').CallExpression | null | undefined} node The CallExpression AST node to check.
     * @returns {boolean} True if it's a memo call, false otherwise.
     */
    function isMemoCall(node) {
      if (!node || node.type !== 'CallExpression') return false
      const callee = node.callee // The function being called in the CallExpression

      // Case 1: Direct call to `memo` (e.g., `memo(MyComponent)`).
      // This typically happens if `memo` is imported directly: `import { memo } from 'react';`
      if (
        callee.type === 'Identifier' &&
        memoCallIdentifierNames.has(callee.name)
      ) {
        return true
      }

      // Case 2: Member expression call (e.g., `React.memo(MyComponent)`).
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed && // Ensures it's `React.memo` not `React['memo']`
        callee.property &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'memo'
      ) {
        return true
      }
      return false
    }

    /**
     * Marks a component as memo-wrapped by adding its resolved name to the `memoWrappedNames` set.
     * This function attempts to extract a meaningful name from an Identifier or a function node's `id`.
     * @param {import('estree').Node | null | undefined} node The AST node representing the component (Identifier or Function node).
     * @returns {void}
     */
    function markMemoWrapped(node) {
      if (!node) return
      // If the node is an Identifier, directly add its name to the memoized set.
      // e.g., `memo(Comp)` -> marks `Comp` as memoized.
      if (node.type === 'Identifier') {
        memoWrappedNames.add(node.name)
      } else if (
        // If the node is a function (expression or declaration), try to get its `id` name.
        // e.g., `memo(function Comp() { ... })` -> marks `Comp` as memoized.
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'FunctionDeclaration'
      ) {
        // Attempt to capture a name from a named function expression/declaration's `id`.
        if (node.id && node.id.type === 'Identifier') {
          memoWrappedNames.add(node.id.name)
        }
      }
    }

    return {
      /**
       * Visitor for `VariableDeclarator` nodes.
       * This catches function components defined via variable declarations, such as:
       * `const Comp = memo(() => <div />)`
       * `const Comp = React.memo(function Comp() { return <div/> })`
       * `const Comp = () => <div />` (potential component candidate)
       * @param {import('estree').VariableDeclarator} node The VariableDeclarator node.
       * @returns {void}
       */
      VariableDeclarator(node) {
        // Ensure the variable is declared with an identifier name (e.g., `const Comp = ...`).
        if (node.id && node.id.type === 'Identifier') {
          const name = node.id.name
          const init = node.init // The initializer (right-hand side) of the declaration

          // Only process identifiers that follow PascalCase, as these are typical React components.
          if (!isPascalCase(name)) return

          // Case 1: The initializer is a `memo()` or `React.memo()` call.
          // This component is explicitly wrapped with memo.
          if (isMemoCall(init)) {
            memoWrappedNames.add(name) // Mark the declared variable name as memoized.
            // Also attempt to mark the component function passed *into* `memo` as memoized,
            // in case it has a name (e.g., `const C = memo(function Comp() {})`).
            const firstArg = init.arguments && init.arguments[0]
            markMemoWrapped(firstArg)
            return // Component is confirmed memoized, no need to check further.
          }

          // Case 2: The initializer is a function expression or arrow function.
          // This is a potential component candidate that might need memoization.
          if (
            init &&
            (init.type === 'ArrowFunctionExpression' ||
              init.type === 'FunctionExpression')
          ) {
            // Only consider it a component if it likely returns JSX.
            if (functionReturnsJSX(init)) {
              componentCandidates.set(name, {
                idNode: node.id,
                initNode: init,
                canAutoFix: isTopLevelVariableDeclarator(node),
              })
            }
          }
        }
      },

      /**
       * Visitor for `FunctionDeclaration` nodes.
       * This catches function components defined via function declarations:
       * `function Comp() { return <div/> }`
       * @param {import('estree').FunctionDeclaration} node The FunctionDeclaration node.
       * @returns {void}
       */
      FunctionDeclaration(node) {
        // Ensure the function has an identifier name.
        if (node.id && node.id.type === 'Identifier') {
          const name = node.id.name
          // Only process functions with PascalCase names.
          if (!isPascalCase(name)) return
          // If the function returns JSX, it's a component candidate.
          if (functionReturnsJSX(node)) {
            componentCandidates.set(name, {
              idNode: node.id,
              initNode: null,
              canAutoFix: false,
            })
          }
        }
      },

      /**
       * Visitor for `ExportDefaultDeclaration` nodes.
       * This catches components wrapped with memo directly in an export statement:
       * `export default memo(Comp)`
       * `export default React.memo(Comp)`
       * @param {import('estree').ExportDefaultDeclaration} node The ExportDefaultDeclaration node.
       * @returns {void}
       */
      ExportDefaultDeclaration(node) {
        const expr = node.declaration
        // Check if the exported expression is a `memo` call.
        if (isMemoCall(expr)) {
          // If so, mark the component passed as its first argument as memoized.
          const firstArg = expr.arguments && expr.arguments[0]
          markMemoWrapped(firstArg)
        }
      },

      /**
       * Visitor for `AssignmentExpression` nodes.
       * This handles cases where a component is re-assigned to its memoized version:
       * `Comp = memo(Comp)`
       * This pattern is less common but can occur in some codebases.
       * @param {import('estree').AssignmentExpression} node The AssignmentExpression node.
       * @returns {void}
       */
      AssignmentExpression(node) {
        if (
          node.left &&
          node.left.type === 'Identifier' &&
          isPascalCase(node.left.name) && // Check if the assignee is a component.
          isMemoCall(node.right) // Check if the right-hand side is a `memo` call.
        ) {
          // Mark the component on the left as memoized.
          memoWrappedNames.add(node.left.name)
          // Also mark the component passed into memo on the right.
          const firstArg = node.right.arguments && node.right.arguments[0]
          markMemoWrapped(firstArg)
        }
      },

      /**
       * At the end of the program traversal, check all component candidates.
       * This hook ensures that all files and scopes have been processed before reporting,
       * preventing false positives where a component might be memo-wrapped in a different
       * part of the file than where it was defined.
       * @returns {void}
       */
      'Program:exit'() {
        let shouldAttachImportFix =
          memoFixStrategy.importFixMode !== IMPORT_FIX_MODE_NONE

        // Iterate over all collected component candidates.
        for (const [name, candidate] of componentCandidates.entries()) {
          // If a candidate component's name is not in the set of memo-wrapped names,
          // it means it was defined but never wrapped.
          if (!memoWrappedNames.has(name)) {
            const reportDescriptor = {
              node: candidate.idNode,
              messageId: 'notMemoized',
              data: { name },
            }

            if (candidate.canAutoFix && candidate.initNode) {
              const shouldApplyImportFix = shouldAttachImportFix
              if (shouldApplyImportFix) {
                shouldAttachImportFix = false
              }

              reportDescriptor.fix = (fixer) => {
                const fixes = [
                  fixer.replaceText(
                    candidate.initNode,
                    `${memoFixStrategy.memoCalleeText}(${sourceCode.getText(candidate.initNode)})`,
                  ),
                ]

                if (shouldApplyImportFix) {
                  const importFix = createMemoImportFix(
                    fixer,
                    sourceCode,
                    memoFixStrategy,
                  )
                  if (importFix) {
                    fixes.unshift(importFix)
                  }
                }

                return fixes
              }
            }

            // Report an error for the non-memoized component.
            context.report(reportDescriptor)
          }
        }
      },
    }
  },
}
