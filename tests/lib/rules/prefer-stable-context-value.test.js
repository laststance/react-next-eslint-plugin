import { RuleTester } from 'eslint';
import rule from '../../../lib/rules/prefer-stable-context-value.js';

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

ruleTester.run('prefer-stable-context-value', rule, {
  valid: [
    {
      code: `
        import React, { useMemo } from 'react';
        const Ctx = React.createContext(null);
        function App(){
          const value = useMemo(() => ({ a: 1 }), []);
          return <Ctx.Provider value={value}><div/></Ctx.Provider>;
        }
      `,
    },
    {
      code: `
        const Ctx = React.createContext(null);
        const fn = () => {};
        const App = () => <Ctx.Provider value={fn}><div/></Ctx.Provider>;
      `,
    },
  ],
  invalid: [
    {
      code: `
        const Ctx = React.createContext(null);
        const App = () => <Ctx.Provider value={{ a: 1 }}><div/></Ctx.Provider>;
      `,
      errors: [{ messageId: 'preferStable' }],
    },
    {
      code: `
        const Ctx = React.createContext(null);
        const App = () => <Ctx.Provider value={[1,2]}><div/></Ctx.Provider>;
      `,
      errors: [{ messageId: 'preferStable' }],
    },
    {
      code: `
        const Ctx = React.createContext(null);
        const App = () => <Ctx.Provider value={() => {}}><div/></Ctx.Provider>;
      `,
      errors: [{ messageId: 'preferStable' }],
    },
  ],
});
