import { RuleTester } from 'eslint';
import rule from '../../../lib/rules/no-use-effect.js';

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

ruleTester.run('no-use-effect', rule, {
  valid: [
    // Custom hook using useEffect is allowed
    {
      code: `
        import { useEffect } from 'react';
        function useHello() {
          useEffect(() => {});
        }
      `,
    },
    // Component without useEffect is allowed
    {
      code: `
        const Hello = () => <div/>;
      `,
    },
    // Non-component function using useEffect is allowed (though odd)
    {
      code: `
        import React from 'react';
        function helper() {
          React.useEffect(() => {});
        }
      `,
    },
    // useEffect used outside component scope
    {
      code: `
        import { useEffect } from 'react';
        useEffect(() => {});
        const Hello = () => <div/>;
      `,
    },
  ],
  invalid: [
    // Component FunctionDeclaration with useEffect
    {
      code: `
        import { useEffect } from 'react';
        function Hello() {
          useEffect(() => {});
          return <div/>;
        }
      `,
      errors: [{ messageId: 'avoidUseEffect' }],
    },
    // Component arrow with React.useEffect
    {
      code: `
        import React from 'react';
        const Hello = () => {
          React.useEffect(() => {});
          return <div/>;
        }
      `,
      errors: [{ messageId: 'avoidUseEffect' }],
    },
    // Memo-wrapped component with useEffect
    {
      code: `
        import React, { memo } from 'react';
        const Hello = memo(() => {
          React.useEffect(() => {});
          return <div/>;
        });
      `,
      errors: [{ messageId: 'avoidUseEffect' }],
    },
    // Named function expression component with useEffect
    {
      code: `
        import { useEffect } from 'react';
        const Hello = function Hello() {
          useEffect(() => {});
          return <div/>;
        }
      `,
      errors: [{ messageId: 'avoidUseEffect' }],
    },
  ],
});
