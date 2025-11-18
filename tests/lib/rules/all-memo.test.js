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
    // Direct export default with memo wrapping inline component
    {
      code: `
        import { memo } from 'react';
        export default memo(function Hello() {
          return <div />;
        });
      `,
    },
    // Memo-wrapped component re-exported under new name
    {
      code: `
        import React from 'react';
        const Base = () => <div />;
        const Wrapped = React.memo(Base);
        export { Wrapped as Renamed };
      `,
    },
    // React.forwardRef wrapped by memo stays valid
    {
      code: `
        import React, { memo } from 'react';
        const InputField = memo(
          React.forwardRef(function InputField(props, ref) {
            return <input ref={ref} {...props} />;
          }),
        );
        export default InputField;
      `,
    },
    // Memoized component with additional metadata stays valid
    {
      code: `
        import { memo } from 'react';
        const Toolbar = memo(function Toolbar() {
          return (
            <header>
              <div />
            </header>
          );
        });
        Toolbar.displayName = 'AppToolbar';
        export default Toolbar;
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
    // Named export component without memo wrapping
    {
      code: `
        export const Hello = () => <div/>;
      `,
      errors: [{ messageId: 'notMemoized' }],
    },
    // Function declaration re-exported without memo
    {
      code: `
        function Hello() { return <div/> }
        export { Hello };
      `,
      errors: [{ messageId: 'notMemoized' }],
    },
    // Calling React.memo without assigning keeps component unstable
    {
      code: `
        import React from 'react';
        const Hello = () => <div/>;
        React.memo(Hello);
        export default Hello;
      `,
      errors: [{ messageId: 'notMemoized' }],
    },
    // Components with nested declarations still need memoization
    {
      code: `
        const Layout = () => {
          function Sidebar() {
            return <aside />;
          }
          return <Sidebar />;
        };
        export default Layout;
      `,
      errors: [
        { messageId: 'notMemoized' },
        { messageId: 'notMemoized' },
      ],
    },
  ],
})
