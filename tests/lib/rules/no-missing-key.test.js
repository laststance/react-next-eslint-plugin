import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-missing-key.js'

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

ruleTester.run('no-missing-key', rule, {
  valid: [
    {
      code: `[<Item key="a" />]`,
    },
    {
      code: `items.map((item) => <Item key={item.id} />)`,
    },
    {
      code: `React.Children.toArray(items.map((item) => <Item />))`,
    },
    {
      code: `Children.toArray(items.map((item) => <Item />))`,
    },
  ],
  invalid: [
    {
      code: `[<Item />]`,
      errors: [{ messageId: 'missingKey' }],
    },
    {
      code: `items.map((item) => <Item />)`,
      errors: [{ messageId: 'missingKey' }],
    },
    {
      code: `items.map((item) => <>{item}</>)`,
      errors: [{ messageId: 'unexpectedFragmentSyntax' }],
    },
    {
      code: `[<></>]`,
      errors: [{ messageId: 'unexpectedFragmentSyntax' }],
    },
  ],
})
