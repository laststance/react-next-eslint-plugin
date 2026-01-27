import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-context-provider.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
})

ruleTester.run('no-context-provider', rule, {
  valid: [
    {
      code: `
        const App = () => <ThemeContext.Provider value={value} />
      `,
      settings: {
        'react-x': { version: '18.2.0' },
      },
    },
    {
      code: `
        const App = () => <ThemeContext value={value} />
      `,
    },
    {
      code: `
        const App = () => <Store.Provider value={value} />
      `,
    },
  ],
  invalid: [
    {
      code: `
        const App = () => <ThemeContext.Provider value={value} />
      `,
      output: `
        const App = () => <ThemeContext value={value} />
      `,
      errors: [{ messageId: 'noContextProvider' }],
    },
    {
      code: `
        const App = () => (
          <ThemeContext.Provider value={value}>Hi</ThemeContext.Provider>
        )
      `,
      output: `
        const App = () => (
          <ThemeContext value={value}>Hi</ThemeContext>
        )
      `,
      errors: [{ messageId: 'noContextProvider' }],
    },
  ],
})
