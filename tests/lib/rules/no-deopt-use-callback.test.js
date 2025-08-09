import { RuleTester } from 'eslint';
import rule from '../../../lib/rules/no-deopt-use-callback.js';

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
  ],
});
