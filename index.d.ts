import type { ESLint, Rule } from 'eslint'

export interface LaststanceRuleModules {
  'no-jsx-without-return': Rule.RuleModule
  'all-memo': Rule.RuleModule
  'no-use-reducer': Rule.RuleModule
  'no-set-state-prop-drilling': Rule.RuleModule
  'no-deopt-use-callback': Rule.RuleModule
  'no-deopt-use-memo': Rule.RuleModule
  'prefer-stable-context-value': Rule.RuleModule
  'no-unstable-classname-prop': Rule.RuleModule
  'usecallback-might-work': Rule.RuleModule
  'usecallback-for-memoized-component': Rule.RuleModule
  'usememo-for-memoized-component': Rule.RuleModule
  'usememo-might-work': Rule.RuleModule
}

export type LaststanceRuleName = keyof LaststanceRuleModules
export type LaststanceConfigName = `laststance/${LaststanceRuleName}`

export type LaststancePlugin = ESLint.Plugin & {
  rules: LaststanceRuleModules
}

declare const plugin: LaststancePlugin

export default plugin
