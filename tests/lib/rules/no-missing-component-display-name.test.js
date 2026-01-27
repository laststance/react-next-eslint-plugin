import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-missing-component-display-name.js'

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

ruleTester.run('no-missing-component-display-name', rule, {
  valid: [
    {
      code: `
        const App = React.memo(function App() {
          return <div />
        })
      `,
    },
    {
      code: `
        const App = React.memo(() => <div />)
        App.displayName = 'App'
      `,
    },
    {
      code: `
        const Button = React.forwardRef(function Button(props, ref) {
          return <button ref={ref} />
        })
      `,
    },
  ],
  invalid: [
    {
      code: `
        const App = React.memo(() => <div />)
      `,
      errors: [{ messageId: 'noMissingComponentDisplayName' }],
    },
    {
      code: `
        const Button = React.forwardRef(() => <button />)
      `,
      errors: [{ messageId: 'noMissingComponentDisplayName' }],
    },
  ],
})
