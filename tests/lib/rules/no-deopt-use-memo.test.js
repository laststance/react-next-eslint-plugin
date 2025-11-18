import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-deopt-use-memo.js'

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

ruleTester.run('no-deopt-use-memo', rule, {
  valid: [
    {
      code: `
        import { memo, useMemo } from 'react';
        const MemoThing = memo(({ data }) => <div>{data.value}</div>);
        function Screen({ value }) {
          const payload = useMemo(() => ({ value }), [value]);
          return <MemoThing data={payload} />;
        }
      `,
    },
    {
      code: `
        import { useMemo } from 'react';
        function Screen({ user }) {
          const value = useMemo(() => ({ id: user.id }), [user.id]);
          useSomeHook(value);
          return <div />;
        }
      `,
    },
    {
      code: `
        import React from 'react';
        function Screen({ Component, props }) {
          const memoized = React.useMemo(() => props, [props]);
          return <Component {...memoized} />;
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { useMemo } from 'react';
        function Screen(props) {
          const value = useMemo(() => ({ foo: props.foo }), [props.foo]);
          return <div data={value} />;
        }
      `,
      errors: [{ messageId: 'passToIntrinsic' }],
    },
    {
      code: `
        import React from 'react';
        function Screen(props) {
          const style = React.useMemo(() => ({ color: props.color }), [props.color]);
          return <div style={() => style} />;
        }
      `,
      errors: [{ messageId: 'usedInsideInline' }],
    },
    {
      code: `
        import { useMemo, createElement } from 'react';
        function Screen(props) {
          const payload = useMemo(() => ({ foo: props.foo }), [props.foo]);
          return createElement('section', { data: payload });
        }
      `,
      errors: [{ messageId: 'passToIntrinsic' }],
    },
    {
      code: `
        import React, { useMemo } from 'react';
        function Screen(props) {
          const payload = useMemo(() => ({ foo: props.foo }), [props.foo]);
          return React.createElement('section', {
            onClick: () => {
              console.log(payload.foo);
            },
          });
        }
      `,
      errors: [{ messageId: 'usedInsideInline' }],
    },
  ],
})
