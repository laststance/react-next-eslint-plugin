import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-jsx-iife.js'

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

ruleTester.run('no-jsx-iife', rule, {
  valid: [
    {
      code: `
        function Component({ value }) {
          return <div>{value}</div>;
        }
      `,
    },
    {
      code: `
        function renderLabel() {
          return 'label';
        }

        function Component() {
          return <div>{renderLabel()}</div>;
        }
      `,
    },
    {
      code: `
        function Component() {
          return <Button onClick={() => doThing()} />;
        }
      `,
    },
    {
      code: `
        const label = (() => 'ready')();

        function Component() {
          return <Button label={label} />;
        }
      `,
    },
    {
      code: `
        const result = (() => 'outside')();
        console.log(result);
      `,
    },
  ],
  invalid: [
    {
      code: `
        function Component() {
          return <div>{(() => 'x')()}</div>;
        }
      `,
      errors: [{ messageId: 'noJsxIife' }],
    },
    {
      code: `
        function Component() {
          return <div>{(function () { return 'x'; })()}</div>;
        }
      `,
      errors: [{ messageId: 'noJsxIife' }],
    },
    {
      code: `
        function Component() {
          return <Button label={(() => 'x')()} />;
        }
      `,
      errors: [{ messageId: 'noJsxIife' }],
    },
    {
      code: `
        function Component() {
          return <input value={(function () { return 'x'; })()} />;
        }
      `,
      errors: [{ messageId: 'noJsxIife' }],
    },
  ],
})
