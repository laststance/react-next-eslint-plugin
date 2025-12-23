import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-set-state-prop-drilling.js'

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
    // Wrapping setter inside useCallback handler stays valid
    {
      code: `
        import React, { useState, useCallback } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          const handle = useCallback(() => setCount((c) => c + 1), []);
          return <Child onClick={handle} />;
        }
      `,
    },
    // Aliasing setter but invoking through wrapper is allowed
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          const setter = setCount;
          const onClick = () => setter((c) => c + 1);
          return React.createElement(Child, { onClick });
        }
      `,
    },
    // Memoizing semantic actions object keeps props stable
    {
      code: `
        import React, { useMemo, useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          const actions = useMemo(
            () => ({
              increment() {
                setCount((c) => c + 1);
              },
            }),
            [setCount],
          );
          return <Child actions={actions} />;
        }
      `,
    },
    // Allow depth 1 to pass setter to a direct child
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          return <Child onClick={setCount} />;
        }
        function Child({ onClick }) {
          return <button onClick={onClick}>Click</button>;
        }
      `,
      options: [{ depth: 1 }],
    },
    // Stop propagation when child component is imported (depth 1 allowed)
    {
      code: `
        import React, { useState } from 'react';
        import { ExternalChild } from './ExternalChild';
        function Parent() {
          const [count, setCount] = useState(0);
          return <ExternalChild onClick={setCount} />;
        }
      `,
      options: [{ depth: 1 }],
    },
    // Allow depth 2 to pass through two same-file components
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          return <Child onClick={setCount} />;
        }
        function Child({ onClick }) {
          return <Grandchild onClick={onClick} />;
        }
        function Grandchild({ onClick }) {
          return <button onClick={onClick}>Click</button>;
        }
      `,
      options: [{ depth: 2 }],
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
    // Passing setter from React.useState via JSX prop
    {
      code: `
        import React from 'react';
        function Parent() {
          const [value, setValue] = React.useState('');
          return <Child onUpdate={setValue} />;
        }
      `,
      errors: [{ messageId: 'noPropDrillSetter' }],
    },
    // Object literal attribute containing setter is blocked
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [value, setValue] = useState('');
          return <Child handlers={{ onChange: setValue }} />;
        }
      `,
      errors: [{ messageId: 'noPropDrillSetter' }],
    },
    // React.createElement via namespace still disallowed
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          return React.createElement(Child, { onToggle: setCount });
        }
      `,
      errors: [{ messageId: 'noPropDrillSetter' }],
    },
    // Identifier createElement helper rejects setter as prop value
    {
      code: `
        import { createElement, useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          return createElement(Child, { dispatcher: setCount });
        }
      `,
      errors: [{ messageId: 'noPropDrillSetter' }],
    },
    // Multiple setters drilled through JSX each warn
    {
      code: `
        import React, { useState } from 'react';
        function Dashboard() {
          const [count, setCount] = useState(0);
          const [open, setOpen] = useState(false);
          return (
            <>
              <Counter onIncrement={setCount} />
              <Modal onDismiss={setOpen} />
            </>
          );
        }
      `,
      errors: [
        { messageId: 'noPropDrillSetter' },
        { messageId: 'noPropDrillSetter' },
      ],
    },
    // React.createElement props that include multiple setters are rejected
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          const [open, setOpen] = useState(false);
          return React.createElement(Child, {
            onIncrement: setCount,
            onToggle: setOpen,
          });
        }
      `,
      errors: [{ messageId: 'noPropDrillSetter' }],
    },
    // Depth 1 still rejects passing setter beyond one level in same file
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          return <Child onClick={setCount} />;
        }
        function Child({ onClick }) {
          return <Grandchild onClick={onClick} />;
        }
        function Grandchild({ onClick }) {
          return <button onClick={onClick}>Click</button>;
        }
      `,
      options: [{ depth: 1 }],
      errors: [{ messageId: 'noPropDrillSetter' }],
    },
    // Depth 2 rejects passing setter beyond two levels in same file
    {
      code: `
        import React, { useState } from 'react';
        function Parent() {
          const [count, setCount] = useState(0);
          return <Child onClick={setCount} />;
        }
        function Child({ onClick }) {
          return <Grandchild onClick={onClick} />;
        }
        function Grandchild({ onClick }) {
          return <GreatGrandchild onClick={onClick} />;
        }
        function GreatGrandchild({ onClick }) {
          return <button onClick={onClick}>Click</button>;
        }
      `,
      options: [{ depth: 2 }],
      errors: [{ messageId: 'noPropDrillSetter' }],
    },
  ],
})
