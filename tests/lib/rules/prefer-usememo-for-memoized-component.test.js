import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/prefer-usememo-for-memoized-component.js'

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

ruleTester.run('prefer-usememo-for-memoized-component', rule, {
  valid: [
    {
      code: `
        import { memo, useMemo } from 'react';
        const MemoList = memo(function MemoList(props) { return <div />; });
        function Screen({ items }) {
          const value = useMemo(() => ({ items }), [items]);
          return <MemoList data={value} />;
        }
      `,
    },
    {
      code: `
        import { memo } from 'react';
        const MemoList = memo(() => null);
        const shared = { id: 1 };
        function Screen() {
          return <MemoList data={shared} />;
        }
      `,
    },
    {
      code: `
        import * as React from 'react';
        const MemoCard = React.memo(({ value }) => <div>{value.title}</div>);
        function Screen({ value }) {
          return React.createElement(MemoCard, { value });
        }
      `,
    },
    {
      code: `
        import { memo } from 'react';
        const MemoThing = memo(() => null);
        const outside = [1, 2, 3];
        function Screen(props) {
          return <MemoThing list={props.list ?? outside} />;
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { memo } from 'react';
        const MemoList = memo(() => null);
        function Screen() {
          return <MemoList data={{ foo: 'bar' }} />;
        }
      `,
      errors: [{ messageId: 'inlineValue' }],
    },
    {
      code: `
        import { memo } from 'react';
        const MemoList = memo(() => null);
        function Screen() {
          const value = { foo: 'bar' };
          return <MemoList data={value} />;
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
    {
      code: `
        import React, { memo } from 'react';
        const MemoList = memo(() => null);
        function Screen(props) {
          const options = { foo: props.foo };
          return React.createElement(MemoList, { options });
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
    {
      code: `
        import { memo } from 'react';
        const MemoList = memo(() => null);
        function Screen() {
          return <MemoList config={[1, 2, 3]} />;
        }
      `,
      errors: [{ messageId: 'inlineValue' }],
    },
  ],
})
