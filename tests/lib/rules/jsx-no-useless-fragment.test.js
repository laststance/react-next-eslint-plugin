import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/jsx-no-useless-fragment.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
})

ruleTester.run('jsx-no-useless-fragment', rule, {
  valid: [
    {
      code: '<></>',
      options: [{ allowEmptyFragment: true }],
    },
    {
      code: '<><Foo /><Bar /></>',
    },
    {
      code: '<>{foo}</>',
    },
    {
      code: '<SomeComponent><><div /><div /></></SomeComponent>',
    },
    {
      code: '<Fragment key={item.id}>{item.value}</Fragment>',
    },
    {
      code: '<React.Fragment ref={forwardedRef}><Foo /></React.Fragment>',
    },
  ],
  invalid: [
    {
      code: '<></>',
      errors: [{ messageId: 'default' }],
      output: null,
    },
    {
      code: '<>{foo}</>',
      options: [{ allowExpressions: false }],
      errors: [{ messageId: 'default' }],
      output: null,
    },
    {
      code: '<><div/></>',
      errors: [{ messageId: 'default' }],
      output: '<div/>',
    },
    {
      code: '<p>moo<>foo</></p>',
      errors: [{ messageId: 'default' }],
      output: '<p>moofoo</p>',
    },
    {
      code: '<div><>{foo}</></div>',
      errors: [{ messageId: 'default' }],
      output: '<div>{foo}</div>',
    },
    {
      code: '<Eeee><>foo</></Eeee>',
      errors: [{ messageId: 'default' }],
      output: null,
    },
    {
      code: '<Fragment />',
      errors: [{ messageId: 'default' }],
      output: null,
    },
    {
      code: '<div><Fragment>foo</Fragment></div>',
      errors: [{ messageId: 'default' }],
      output: '<div>foo</div>',
    },
  ],
})
