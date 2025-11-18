import plugin, {
  type LaststancePlugin,
  type LaststanceRuleModules,
  type LaststanceRuleName,
  type LaststanceConfigName,
} from '@laststance/react-next-eslint-plugin'

// Assert the plugin satisfies the exported helper type
const typedPlugin: LaststancePlugin = plugin

// Ensure the rules map is fully typed
const allRules: LaststanceRuleModules = plugin.rules

// Example strongly-typed names
const exampleRuleName: LaststanceRuleName = 'no-jsx-without-return'
const exampleConfigName: LaststanceConfigName = 'laststance/no-jsx-without-return'

// Touch the references so the compiler checks them
void typedPlugin.meta?.name
void allRules[exampleRuleName]
void exampleConfigName
