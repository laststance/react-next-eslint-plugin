import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/prefer-usememo-might-work.js'

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

ruleTester.run('prefer-usememo-might-work', rule, {
  valid: [
    {
      code: `
        import { useMemo } from 'react';
        const Panel = ({ style }) => <section style={style} />;
        function Screen({ bg }) {
          const style = useMemo(() => ({ background: bg }), [bg]);
          return <Panel style={style} />;
        }
      `,
    },
    {
      code: `
        const Panel = ({ style }) => <section style={style} />;
        const baseStyle = { color: 'red' };
        function Screen() {
          return <Panel style={baseStyle} />;
        }
      `,
    },
    {
      code: `
        import React from 'react';
        const Panel = ({ style }) => <section style={style} />;
        function Screen(props) {
          return React.createElement(Panel, { style: props.style });
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        const Panel = ({ style }) => <section style={style} />;
        function Screen() {
          return <Panel style={{ color: 'red' }} />;
        }
      `,
      errors: [{ messageId: 'inlineValue' }],
    },
    {
      code: `
        const Panel = ({ style }) => <section style={style} />;
        function Screen() {
          const style = { color: 'red' };
          return <Panel style={style} />;
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
    {
      code: `
        import { createElement } from 'react';
        const Card = ({ options }) => null;
        function Screen() {
          const options = { size: 'lg' };
          return createElement(Card, { options });
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
  ],
})
