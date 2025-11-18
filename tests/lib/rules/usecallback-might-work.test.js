import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/usecallback-might-work.js'

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

ruleTester.run('usecallback-might-work', rule, {
  valid: [
    {
      code: `
        import { useCallback } from 'react';
        const Button = ({ onClick }) => <button onClick={onClick} />;
        function Screen() {
          const handle = useCallback(() => {}, []);
          return <Button onClick={handle} />;
        }
      `,
    },
    {
      code: `
        const Button = ({ onClick }) => <button onClick={onClick} />;
        const stable = () => {};
        function Screen({ onClick }) {
          return (
            <>
              <Button onClick={onClick} />
              <Button onClick={stable} />
            </>
          );
        }
      `,
    },
    {
      code: `
        import React from 'react';
        const Button = ({ onClick }) => <button onClick={onClick} />;
        function Screen() {
          const handle = React.useCallback(() => {}, []);
          return React.createElement(Button, { onClick: handle });
        }
      `,
    },
    {
      code: `
        import { useCallback } from 'react';
        const Input = ({ renderLabel }) => <label>{renderLabel()}</label>;
        function Screen({ renderLabel }) {
          const stable = useCallback(renderLabel, [renderLabel]);
          return <Input renderLabel={stable} />;
        }
      `,
    },
    {
      code: `
        function Demo() {
          return <div onClick={() => {}} />; // intrinsic elements are ignored
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        const Button = ({ onClick }) => <button onClick={onClick} />;
        function Screen() {
          return <Button onClick={() => console.log('click')} />;
        }
      `,
      errors: [{ messageId: 'inlineFunction' }],
    },
    {
      code: `
        const Button = ({ onClick }) => <button onClick={onClick} />;
        function Screen() {
          function handle() {}
          return <Button onClick={handle} />;
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
    {
      code: `
        import React from 'react';
        const Button = ({ onClick }) => <button onClick={onClick} />;
        function Screen() {
          const handle = () => {};
          return React.createElement(Button, { onClick: handle });
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
    {
      code: `
        import { memo } from 'react';
        const Button = ({ onClick }) => <button onClick={onClick} />;
        const Wrapper = memo(Button);
        function Screen() {
          const handle = () => {};
          return <Wrapper onClick={handle} />;
        }
      `,
      errors: [{ messageId: 'unstableReference' }],
    },
  ],
})
