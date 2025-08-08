import { RuleTester } from 'eslint';
import rule from '../../../lib/rules/no-jsx-without-return.js';

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
});

ruleTester.run('no-jsx-without-return', rule, {
  valid: [
    // Valid: JSX returned from function
    {
      code: `
        function Component() {
          return <div>Hello</div>;
        }
      `,
    },
    
    // Valid: JSX assigned to variable
    {
      code: `
        function Component() {
          const element = <div>Hello</div>;
          return element;
        }
      `,
    },
    
    // Valid: JSX fragment returned
    {
      code: `
        function Component() {
          return <>Hello</>;
        }
      `,
    },
    
    // Valid: JSX in if statement with return
    {
      code: `
        function Component() {
          if (condition) {
            return <div>Hello</div>;
          }
        }
      `,
    },
    
    // Valid: JSX in if statement wrapped in block
    {
      code: `
        function Component() {
          if (condition) {
            const element = <div>Hello</div>;
            return element;
          }
        }
      `,
    },
    
    // Valid: JSX in else statement with return
    {
      code: `
        function Component() {
          if (condition) {
            return <div>Hello</div>;
          } else {
            return <div>Goodbye</div>;
          }
        }
      `,
    },
    
    // Valid: Nested if-else with proper returns
    {
      code: `
        function Component() {
          if (condition1) {
            return <div>Hello</div>;
          } else if (condition2) {
            return <div>World</div>;
          }
        }
      `,
    },
    
    // Valid: Non-JSX expression statement
    {
      code: `
        function Component() {
          console.log("Hello");
          return <div>Hello</div>;
        }
      `,
    },
  ],

  invalid: [
    // Invalid: Standalone JSX expression
    {
      code: `
        function Component() {
          <div>Hello</div>;
        }
      `,
      errors: [
        {
          messageId: 'jsxWithoutReturn',
          line: 3,
          column: 11,
        },
      ],
    },
    
    // Invalid: JSX fragment expression
    {
      code: `
        function Component() {
          <>Hello</>;
        }
      `,
      errors: [
        {
          messageId: 'jsxWithoutReturn',
          line: 3,
          column: 11,
        },
      ],
    },
    
    // Invalid: JSX in if statement without return or block
    {
      code: `
        function Component() {
          if (condition)
            <div>Hello</div>;
        }
      `,
      errors: [
        {
          messageId: 'jsxInIfWithoutReturn',
          line: 4,
          column: 13,
        },
      ],
    },
    
    // Invalid: JSX in else statement without return or block
    {
      code: `
        function Component() {
          if (condition) {
            return <div>Hello</div>;
          } else
            <div>Goodbye</div>;
        }
      `,
      errors: [
        {
          messageId: 'jsxInElseWithoutReturn',
          line: 6,
          column: 13,
        },
      ],
    },
    
    // Invalid: Multiple JSX expression statements
    {
      code: `
        function Component() {
          <div>Hello</div>;
          <div>World</div>;
        }
      `,
      errors: [
        {
          messageId: 'jsxWithoutReturn',
          line: 3,
          column: 11,
        },
        {
          messageId: 'jsxWithoutReturn',
          line: 4,
          column: 11,
        },
      ],
    },
    
    // Invalid: JSX in both if and else without proper handling
    {
      code: `
        function Component() {
          if (condition)
            <div>Hello</div>;
          else
            <div>Goodbye</div>;
        }
      `,
      errors: [
        {
          messageId: 'jsxInIfWithoutReturn',
          line: 4,
          column: 13,
        },
        {
          messageId: 'jsxInElseWithoutReturn',
          line: 6,
          column: 13,
        },
      ],
    },
  ],
});