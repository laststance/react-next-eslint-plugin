import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/all-memo.js'

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

ruleTester.run('all-memo', rule, {
  valid: [
    // Wrapped variable component with memo()
    {
      code: `
        import React, { memo } from 'react';
        const Hello = memo(() => <div />);
        export default Hello;
      `,
    },
    // Wrapped variable component with React.memo
    {
      code: `
        import React from 'react';
        const Hello = React.memo(function Hello() { return <div/> });
        export default Hello;
      `,
    },
    // Function declaration exported as default with memo
    {
      code: `
        import React, { memo } from 'react';
        function Hello() { return <div/> }
        export default memo(Hello);
      `,
    },
    // Assignment wrapping
    {
      code: `
        import React, { memo } from 'react';
        function Hello() { return <div/> }
        Hello = memo(Hello);
      `,
    },
    // Non-component function (not PascalCase) should be ignored
    {
      code: `
        const helper = () => 1;
        export default helper;
      `,
    },
    // PascalCase but not returning JSX should be ignored
    {
      code: `
        const Data = () => 1;
        export default Data;
      `,
    },
    // Arrow returning JSX but memo-wrapped later
    {
      code: `
        import { memo } from 'react';
        const Hello = () => <div />;
        export default memo(Hello);
      `,
    },
  ],
  invalid: [
    // Variable arrow component not memoized
    {
      code: `
        const Hello = () => <div/>;
        export default Hello;
      `,
      errors: [{ messageId: 'notMemoized' }],
    },
    // Function declaration component not memoized
    {
      code: `
        function Hello() { return <div/> }
        export default Hello;
      `,
      errors: [{ messageId: 'notMemoized' }],
    },
    // Named function expression assigned and exported, not memoized
    {
      code: `
        const Hello = function Hello() { return <div/> };
        export default Hello;
      `,
      errors: [{ messageId: 'notMemoized' }],
    },
    // Multiple components: only those returning JSX should warn
    {
      code: `
        const A = () => <div/>;
        const b = () => <div/>; // ignored by name
        const C = () => 1; // ignored by return type
        export default A;
      `,
      errors: [{ messageId: 'notMemoized' }],
    },
  ],
})
