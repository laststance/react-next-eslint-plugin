import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/prefer-stable-context-value.js'

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
    {
      code: `
        import React, { useMemo } from 'react';
        const Ctx = React.createContext(null);
        function App({ theme }) {
          const ctxValue = useMemo(() => [theme], [theme]);
          return <Ctx.Provider value={ctxValue}><div/></Ctx.Provider>;
        }
      `,
    },
    {
      code: `
        import React, { useMemo } from 'react';
        const ThemeCtx = React.createContext(null);
        const LocaleCtx = React.createContext(null);
        function Shell({ theme, locale }) {
          const themeValue = useMemo(() => ({ theme }), [theme]);
          const localeValue = useMemo(() => ({ locale }), [locale]);
          return (
            <ThemeCtx.Provider value={themeValue}>
              <LocaleCtx.Provider value={localeValue}>
                <div />
              </LocaleCtx.Provider>
            </ThemeCtx.Provider>
          );
        }
      `,
    },
    {
      code: `
        import React, { useMemo } from 'react';
        const SettingsCtx = React.createContext(null);
        function App({ base, accent }) {
          const stable = useMemo(
            () => ({
              ...base,
              accent,
            }),
            [base, accent],
          );
          return <SettingsCtx.Provider value={stable}><div /></SettingsCtx.Provider>;
        }
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
    {
      code: `
        const Ctx = React.createContext(null);
        const App = () => <Ctx.Provider value={function build() { return {}; }}><div/></Ctx.Provider>;
      `,
      errors: [{ messageId: 'preferStable' }],
    },
    {
      code: `
        const base = { lang: 'en' };
        const Ctx = React.createContext(null);
        function App() {
          return <Ctx.Provider value={{ ...base, theme: 'dark' }}><div/></Ctx.Provider>;
        }
      `,
      errors: [{ messageId: 'preferStable' }],
    },
    {
      code: `
        const ThemeCtx = React.createContext(null);
        const LocaleCtx = React.createContext(null);
        function Shell() {
          return (
            <ThemeCtx.Provider value={{ palette: 'blue' }}>
              <LocaleCtx.Provider value={['en', 'US']}>
                <div />
              </LocaleCtx.Provider>
            </ThemeCtx.Provider>
          );
        }
      `,
      errors: [
        { messageId: 'preferStable' },
        { messageId: 'preferStable' },
      ],
    },
    {
      code: `
        const ConfigCtx = React.createContext(null);
        function App() {
          return <ConfigCtx.Provider value={() => ({ retries: 1 })}><div/></ConfigCtx.Provider>;
        }
      `,
      errors: [{ messageId: 'preferStable' }],
    },
  ],
})
