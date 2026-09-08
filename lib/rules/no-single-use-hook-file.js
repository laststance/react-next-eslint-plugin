import { createRequire } from 'node:module'
import { relative } from 'node:path'
import { getRuleSourceCode } from '../utils/eslint-context.js'
import { getHookOwnership } from '../utils/hook-ownership.js'

const require = createRequire(import.meta.url)

/** Enforces component ownership when a typed application enables the rule; ESLint invokes the adapter. @example rules: { 'laststance/no-single-use-hook-file': 'error' } */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Colocate a single-use custom Hook with its production component.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin/blob/main/docs/rules/no-single-use-hook-file.md',
    },
    schema: [],
    messages: {
      colocateWithComponent:
        'Hook "{{hookName}}" is used only by component "{{componentName}}". Move its definition to module scope in "{{componentFile}}" so its component-specific ownership is explicit.',
      incompleteAnalysis:
        'Cannot determine all consumers of Hook "{{hookName}}": {{reason}}. No colocation decision was made.',
    },
  },

  /** Configures ownership checks when ESLint enables this typed rule. @param {import('eslint').Rule.RuleContext} context Current file. @returns {import('eslint').Rule.RuleListener} Program visitor. @example rule.create(context) */
  create(context) {
    const sourceCode = getRuleSourceCode(context)
    const services = sourceCode.parserServices
    // Existing syntax-only rules must load without installing the optional compiler.
    if (!services?.program || !services.esTreeNodeToTSNodeMap) {
      throw new Error(
        'no-single-use-hook-file requires @typescript-eslint/parser with a complete typed application project (parserOptions.project or programs).',
      )
    }
    let typescript
    try {
      typescript = require('typescript')
    } catch {
      throw new Error(
        'no-single-use-hook-file requires the optional TypeScript ~6.0.3 peer. Install typescript to enable this rule.',
      )
    }
    if (
      !/^6\.0\.([3-9]|[1-9]\d+)(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(
        typescript.version,
      )
    ) {
      throw new Error(
        'no-single-use-hook-file currently supports TypeScript >=6.0.3 <6.1.0 (stable releases); use a supported compiler version.',
      )
    }

    return {
      Program(node) {
        const compilerSource = services.esTreeNodeToTSNodeMap.get(node)
        // Editors can briefly hold two different snapshots; never report a move from stale source.
        if (!compilerSource || compilerSource.text !== sourceCode.text) {
          context.report({
            node,
            messageId: 'incompleteAnalysis',
            data: {
              hookName: '(project)',
              reason:
                'the ESLint text and TypeScript source snapshot differ; rerun a complete lint without --cache',
            },
          })
          return
        }
        const analysis = getHookOwnership(services.program, typescript)
        // Only the defining file reports; importing files never duplicate a diagnostic.
        for (const hook of analysis.hooks) {
          if (
            hook.file !== analysis.files.get(compilerSource) ||
            !hook.target ||
            hook.owners.size >= 2
          )
            continue
          const [owner] = hook.owners
          if (owner?.file === hook.file) continue
          const location = hook.node.name || hook.node
          const loc = {
            start: sourceCode.getLocFromIndex(
              location.getStart(compilerSource),
            ),
            end: sourceCode.getLocFromIndex(location.getEnd()),
          }
          if (hook.reason) {
            context.report({
              loc,
              messageId: 'incompleteAnalysis',
              data: { hookName: hook.name, reason: hook.reason },
            })
          } else if (owner) {
            context.report({
              loc,
              messageId: 'colocateWithComponent',
              data: {
                hookName: hook.name,
                componentName: owner.name,
                componentFile: relative(analysis.root, owner.file).replaceAll(
                  '\\',
                  '/',
                ),
              },
            })
          }
        }
      },
    }
  },
}
