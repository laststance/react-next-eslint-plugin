import { RuleTester } from 'eslint';
import rule from '../../../lib/rules/no-set-state-prop-drilling.js';

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

ruleTester.run('no-set-state-prop-drilling', rule, {
  valid: [
    // Passing callback wrapping setter is allowed
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          return <Child onClick={() => setCount((c) => c + 1)} />;
        }
      `,
    },
    // Passing non-setter identifiers is allowed
    {
      code: `
        function Parent() {
          const onClick = () => {};
          return <Child onClick={onClick} />;
        }
      `,
    },
    // Setter used locally is fine
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          const handle = () => setCount(count + 1);
          return <Child onClick={handle} />;
        }
      `,
    },
    // React.createElement with wrapper function
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          return React.createElement(Child, { onClick: () => setCount(count + 1) });
        }
      `,
    },
  ],
  invalid: [
    // Direct prop drilling of setter in JSX
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          return <Child setCount={setCount} />;
        }
      `,
      errors: [{ messageId: 'noPropDrillSetter' }],
    },
    // Direct prop drilling via React.createElement
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          return React.createElement(Child, { setCount });
        }
      `,
      errors: [{ messageId: 'noPropDrillSetter' }],
    },
    // Passing setter as handler directly
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          return <Child onClick={setCount} />;
        }
      `,
      errors: [{ messageId: 'noPropDrillSetter' }],
    },
  ],
});
