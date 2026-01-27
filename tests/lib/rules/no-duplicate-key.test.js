import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-duplicate-key.js'

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

ruleTester.run('no-duplicate-key', rule, {
  valid: [
    {
      code: `[
        <Item key="a" />,
        <Item key="b" />,
      ]`,
    },
    {
      code: `items.map((item) => <Item key={item.id} />)`,
    },
  ],
  invalid: [
    {
      code: `[
        <Item key="a" />,
        <Item key="a" />,
      ]`,
      errors: [
        { messageId: 'noDuplicateKey' },
        { messageId: 'noDuplicateKey' },
      ],
    },
    {
      code: `items.map((item) => <Item key="a" />)`,
      errors: [{ messageId: 'noDuplicateKey' }],
    },
  ],
})
