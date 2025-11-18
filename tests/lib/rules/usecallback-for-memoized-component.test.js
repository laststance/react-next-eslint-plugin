import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/usecallback-for-memoized-component.js'

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

ruleTester.run('usecallback-for-memoized-component', rule, {
  valid: [
    {
      code: `
        import React, { memo, useCallback } from 'react';
        const MemoButton = memo(function MemoButton(props) { return <button {...props} />; });
        function Screen() {
          const handle = useCallback(() => {}, []);
          return <MemoButton onClick={handle} />;
        }
      `,
    },
    {
      code: `
        import { memo } from 'react';
        const MemoButton = memo((props) => <button {...props} />);
        const Plain = (props) => <button {...props} />;
        const outside = () => {};
        function Screen({ onClick }) {
          return (
            <>
              <Plain onClick={() => console.log('ok')} />
              <MemoButton onClick={onClick} />
              <MemoButton onClick={outside} />
            </>
          );
        }
      `,
    },
    {
      code: `
        import React, { memo } from 'react';
        const stable = () => {};
        const MemoList = memo(function MemoList() { return null; });
        function Parent(props) {
          return <MemoList onSelect={props.onSelect ?? stable} />;
        }
      `,
    },
    {
      code: `
        import * as React from 'react';
        const Card = React.memo(function Card({ onHover }) { return <div onMouseEnter={onHover} />; });
        function Page() {
          const handle = React.useCallback(() => {}, []);
          return <Card onHover={handle} />;
        }
      `,
    },
    {
      code: `
        import React from 'react';
        const memoize = React.memo;
        const useCb = React.useCallback;
        const MemoThing = memoize(() => null);
        function Wrapper() {
          const handler = useCb(() => {}, []);
          return <MemoThing onAction={handler} />;
        }
      `,
    },
    {
      code: `
        import { memo, useCallback, createElement } from 'react';
        const MemoThing = memo(() => null);
        function Wrapper() {
          const onSubmit = useCallback(() => {}, []);
          return createElement(MemoThing, { onSubmit });
        }
      `,
    },
    {
      code: `
        const React = require('react');
        const MemoThing = React.memo(() => null);
        function Wrapper() {
          const onSubmit = React.useCallback(() => {}, []);
          return React.createElement(MemoThing, { onSubmit });
        }
      `,
    },
    {
      code: `
        import { memo } from 'react';
        const MemoItem = memo(() => null);
        function Parent({ actions }) {
          const { onClick } = actions;
          return <MemoItem onClick={onClick} />;
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { memo } from 'react';
        const MemoItem = memo(() => null);
        function Parent() {
          return <MemoItem onClick={() => console.log('click')} />;
        }
      `,
      errors: [{ messageId: 'inlineFunction' }],
    },
    {
      code: `
        import { memo } from 'react';
        const MemoItem = memo(() => null);
        function Parent() {
          function handle() {}
          return <MemoItem onClick={handle} />;
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
    {
      code: `
        import { memo } from 'react';
        const MemoItem = memo(() => null);
        function Parent() {
          const handle = () => {};
          return <MemoItem onClick={handle} />;
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
    {
      code: `
        import * as React from 'react';
        const MemoItem = React.memo(() => null);
        function Parent() {
          return React.createElement(MemoItem, { onClick: () => console.log('inline') });
        }
      `,
      errors: [{ messageId: 'inlineFunction' }],
    },
    {
      code: `
        import React from 'react';
        const memoize = React.memo;
        const MemoItem = memoize(() => null);
        function Parent() {
          const handle = () => {};
          return <MemoItem onClick={handle} />;
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
    {
      code: `
        import { memo as memoize } from 'react';
        const MemoItem = memoize(() => null);
        function Parent() {
          return <MemoItem onHover={() => {}} />;
        }
      `,
      errors: [{ messageId: 'inlineFunction' }],
    },
    {
      code: `
        import { memo } from 'react';
        let MemoItem;
        MemoItem = memo(() => null);
        function Parent() {
          const handle = () => {};
          return <MemoItem onClick={handle} />;
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
    {
      code: `
        const React = require('react');
        const MemoItem = React.memo(() => null);
        function Parent() {
          const handle = () => {};
          return React.createElement(MemoItem, { onClick: handle });
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
  ],
})
