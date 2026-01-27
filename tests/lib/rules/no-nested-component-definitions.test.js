import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-nested-component-definitions.js'

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

ruleTester.run('no-nested-component-definitions', rule, {
  valid: [
    {
      code: `
        function Parent() {
          function getChild() {
            return <div />
          }
          return <div>{getChild()}</div>
        }
      `,
    },
    {
      code: `
        function Child() {
          return <div />
        }

        function Parent() {
          return <Child />
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        function Parent() {
          function Child() {
            return <div />
          }
          return <Child />
        }
      `,
      errors: [{ messageId: 'noNestedComponentDefinitions' }],
    },
    {
      code: `
        function Parent() {
          const Child = () => <div />
          return <Child />
        }
      `,
      errors: [{ messageId: 'noNestedComponentDefinitions' }],
    },
    {
      code: `
        class Parent extends React.Component {
          render() {
            function Child() {
              return <div />
            }
            return <Child />
          }
        }
      `,
      errors: [{ messageId: 'noNestedComponentDefinitions' }],
    },
  ],
})
