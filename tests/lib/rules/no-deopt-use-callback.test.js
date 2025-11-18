import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-deopt-use-callback.js'

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

ruleTester.run('no-deopt-use-callback', rule, {
  valid: [
    // Passing useCallback to a memoized component prop is OK
    {
      code: `
        import React, { memo, useCallback } from 'react';
        const Button = memo(function Button(props){ return <button onClick={props.onClick}/> });
        const Parent = () => {
          const handleClick = useCallback(() => {}, []);
          return <Button onClick={handleClick}/>;
        };
      `,
    },
    // Inline lambda on intrinsic is fine; no need to use useCallback
    {
      code: `
        const Parent = () => <div onClick={() => console.log('x')} />;
      `,
    },
    // Plain function passed to intrinsic is fine
    {
      code: `
        const Parent = () => {
          function onClick(){ console.log('x'); }
          return <div onClick={onClick} />;
        };
      `,
    },
    // Passing useCallback result to a memoized custom component is fine
    {
      code: `
        import React, { memo, useCallback } from 'react';
        const FancyButton = memo(function FancyButton(props) {
          return <button {...props} />;
        });
        function Screen() {
          const handle = useCallback(() => {}, []);
          return <FancyButton onClick={handle} />;
        }
      `,
    },
    // React.createElement with custom components stays valid
    {
      code: `
        import React, { useCallback } from 'react';
        const Widget = () => <div/>;
        function Screen() {
          const handle = useCallback(() => {}, []);
          return React.createElement(Widget, { onClick: handle });
        }
      `,
    },
    // Conditional branches forwarding callbacks only into memoized children are fine
    {
      code: `
        import React, { memo, useCallback } from 'react';
        const MemoButton = memo(function MemoButton(props) {
          return <button {...props} />;
        });
        function Screen({ active }) {
          const handlePress = useCallback(() => {}, []);
          return active ? <MemoButton onPress={handlePress} /> : null;
        }
      `,
    },
    // Mapping over data while passing stabilized handlers to memoized items
    {
      code: `
        import React, { memo, useCallback } from 'react';
        const ListItem = memo(function ListItem(props) {
          return <li {...props} />;
        });
        function Screen({ items }) {
          const handleSelect = useCallback(() => {}, []);
          return items.map((item) => (
            <ListItem key={item.id} onSelect={handleSelect} />
          ));
        }
      `,
    },
  ],
  invalid: [
    // Passing useCallback result directly to intrinsic
    {
      code: `
        import { useCallback } from 'react';
        const Parent = () => {
          const onClick = useCallback(() => {}, []);
          return <div onClick={onClick} />;
        };
      `,
      errors: [{ messageId: 'passToIntrinsic' }],
    },
    // Calling useCallback function inside newly created inline handler
    {
      code: `
        import { useCallback } from 'react';
        const Parent = () => {
          const onClick = useCallback(() => {}, []);
          return <div onClick={() => onClick()} />;
        };
      `,
      errors: [{ messageId: 'calledInsideInline' }],
    },
    // React.createElement intrinsic passing useCallback result
    {
      code: `
        import React, { useCallback } from 'react';
        const Parent = () => {
          const onClick = useCallback(() => {}, []);
          return React.createElement('div', { onClick: onClick });
        };
      `,
      errors: [{ messageId: 'passToIntrinsic' }],
    },
    // React.createElement intrinsic calling inside inline handler
    {
      code: `
        import React, { useCallback } from 'react';
        const Parent = () => {
          const onClick = useCallback(() => {}, []);
          return React.createElement('div', { onClick: () => onClick() });
        };
      `,
      errors: [{ messageId: 'calledInsideInline' }],
    },
    // React.useCallback followed by passing to intrinsic still warns
    {
      code: `
        import React from 'react';
        const Parent = () => {
          const handle = React.useCallback(() => {}, []);
          return <button onMouseEnter={handle} />;
        };
      `,
      errors: [{ messageId: 'passToIntrinsic' }],
    },
    // Inline handler block that calls the callback should warn
    {
      code: `
        import { useCallback } from 'react';
        const Parent = () => {
          const handle = useCallback(() => {}, []);
          return <div onClick={() => { handle(); console.log('extra'); }} />;
        };
      `,
      errors: [{ messageId: 'calledInsideInline' }],
    },
    // Passing callback to another intrinsic event name still warns
    {
      code: `
        import { useCallback } from 'react';
        const Parent = () => {
          const handle = useCallback(() => {}, []);
          return <input onBlur={handle} />;
        };
      `,
      errors: [{ messageId: 'passToIntrinsic' }],
    },
    // Identifier createElement variant also rejected
    {
      code: `
        import { createElement, useCallback } from 'react';
        const Parent = () => {
          const handle = useCallback(() => {}, []);
          return createElement('section', { onClick: () => { handle(); console.log('noop'); } });
        };
      `,
      errors: [{ messageId: 'calledInsideInline' }],
    },
    // Multiple callbacks passed to intrinsic props report individually
    {
      code: `
        import { useCallback } from 'react';
        function Screen() {
          const handleClick = useCallback(() => {}, []);
          const handleFocus = useCallback(() => {}, []);
          return (
            <div onClick={handleClick} onFocus={() => handleFocus()}>
              hello
            </div>
          );
        }
      `,
      errors: [
        { messageId: 'passToIntrinsic' },
        { messageId: 'calledInsideInline' },
      ],
    },
    // React.createElement intrinsic props with multiple stabilized callbacks
    {
      code: `
        import React, { useCallback } from 'react';
        function Screen() {
          const enter = useCallback(() => {}, []);
          const leave = useCallback(() => {}, []);
          return React.createElement('button', {
            onMouseEnter: enter,
            onMouseLeave: () => leave(),
          });
        }
      `,
      errors: [
        { messageId: 'passToIntrinsic' },
        { messageId: 'calledInsideInline' },
      ],
    },
  ],
})
