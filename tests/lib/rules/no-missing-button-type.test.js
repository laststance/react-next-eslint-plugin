import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-missing-button-type.js'

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

ruleTester.run('no-missing-button-type', rule, {
  valid: [
    {
      code: `<button type="button" />`,
    },
    {
      code: `const props = { type: 'button' }
      const App = () => <button {...props} />`,
    },
  ],
  invalid: [
    {
      code: `<button />`,
      errors: [
        {
          messageId: 'missingTypeAttribute',
          suggestions: [
            {
              messageId: 'addTypeAttribute',
              data: { type: 'button' },
              output: `<button type="button" />`,
            },
            {
              messageId: 'addTypeAttribute',
              data: { type: 'submit' },
              output: `<button type="submit" />`,
            },
            {
              messageId: 'addTypeAttribute',
              data: { type: 'reset' },
              output: `<button type="reset" />`,
            },
          ],
        },
      ],
    },
    {
      code: `<PolyComponent as="button" />`,
      settings: {
        'react-x': {
          polymorphicPropName: 'as',
        },
      },
      errors: [
        {
          messageId: 'missingTypeAttribute',
          suggestions: [
            {
              messageId: 'addTypeAttribute',
              data: { type: 'button' },
              output: `<PolyComponent type="button" as="button" />`,
            },
            {
              messageId: 'addTypeAttribute',
              data: { type: 'submit' },
              output: `<PolyComponent type="submit" as="button" />`,
            },
            {
              messageId: 'addTypeAttribute',
              data: { type: 'reset' },
              output: `<PolyComponent type="reset" as="button" />`,
            },
          ],
        },
      ],
    },
  ],
})
