import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-forward-ref.js'

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

ruleTester.run('no-forward-ref', rule, {
  valid: [
    {
      code: `
        const Button = React.forwardRef((props, ref) => {
          return <button ref={ref} />
        })
      `,
      settings: {
        'react-x': { version: '18.2.0' },
      },
    },
  ],
  invalid: [
    {
      code: `
        const Button = React.forwardRef((props, ref) => {
          return <button ref={ref} />
        })
      `,
      errors: [{ messageId: 'noForwardRef' }],
    },
    {
      code: `
        import { forwardRef } from 'react'

        const Button = forwardRef((props, ref) => <button ref={ref} />)
      `,
      errors: [{ messageId: 'noForwardRef' }],
    },
  ],
})
