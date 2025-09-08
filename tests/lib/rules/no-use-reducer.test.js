import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-use-reducer.js'

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

ruleTester.run('no-use-reducer', rule, {
  valid: [
    // Valid: Using Redux Toolkit
    {
      code: `
        import { useSelector, useDispatch } from 'react-redux';
        import { createSlice } from '@reduxjs/toolkit';
        
        function Component() {
          const dispatch = useDispatch();
          const state = useSelector(state => state.counter);
          return <div>{state}</div>;
        }
      `,
    },

    // Valid: Using useState instead
    {
      code: `
        import { useState } from 'react';
        
        function Component() {
          const [state, setState] = useState(0);
          return <div>{state}</div>;
        }
      `,
    },

    // Valid: Custom hook without useReducer
    {
      code: `
        import { useState, useCallback } from 'react';
        
        function useCounter() {
          const [count, setCount] = useState(0);
          const increment = useCallback(() => setCount(c => c + 1), []);
          return { count, increment };
        }
      `,
    },

    // Valid: No React hooks used
    {
      code: `
        function Component() {
          return <div>Hello World</div>;
        }
      `,
    },

    // Valid: Function with similar name but not useReducer
    {
      code: `
        function useMyReducer() {
          return 'not a hook';
        }
        
        function Component() {
          const result = useMyReducer();
          return <div>{result}</div>;
        }
      `,
    },
  ],

  invalid: [
    // Invalid: Direct useReducer import and usage
    {
      code: `
        import { useReducer } from 'react';
        
        function Component() {
          const [state, dispatch] = useReducer(reducer, initialState);
          return <div>{state}</div>;
        }
      `,
      errors: [
        {
          messageId: 'noUseReducer',
          type: 'ImportSpecifier',
        },
        {
          messageId: 'noUseReducer',
          type: 'CallExpression',
        },
      ],
    },

    // Invalid: React.useReducer usage
    {
      code: `
        import React from 'react';
        
        function Component() {
          const [state, dispatch] = React.useReducer(reducer, initialState);
          return <div>{state}</div>;
        }
      `,
      errors: [
        {
          messageId: 'noUseReducer',
          type: 'CallExpression',
        },
      ],
    },

    // Invalid: Multiple useReducer imports
    {
      code: `
        import React, { useReducer, useState } from 'react';
        
        function Component() {
          const [state1, dispatch1] = useReducer(reducer1, initialState1);
          const [state2, dispatch2] = useReducer(reducer2, initialState2);
          return <div>{state1} {state2}</div>;
        }
      `,
      errors: [
        {
          messageId: 'noUseReducer',
          type: 'ImportSpecifier',
        },
        {
          messageId: 'noUseReducer',
          type: 'CallExpression',
        },
        {
          messageId: 'noUseReducer',
          type: 'CallExpression',
        },
      ],
    },

    // Invalid: useReducer in custom hook
    {
      code: `
        import { useReducer } from 'react';
        
        function useCustomHook() {
          const [state, dispatch] = useReducer(reducer, initialState);
          return { state, dispatch };
        }
      `,
      errors: [
        {
          messageId: 'noUseReducer',
          type: 'ImportSpecifier',
        },
        {
          messageId: 'noUseReducer',
          type: 'CallExpression',
        },
      ],
    },

    // Invalid: Mixed imports with useReducer
    {
      code: `
        import { useState, useEffect, useReducer, useCallback } from 'react';
        
        function Component() {
          const [count, setCount] = useState(0);
          const [state, dispatch] = useReducer(reducer, initialState);
          
          useEffect(() => {
            // effect logic
          }, []);
          
          return <div>{count} {state}</div>;
        }
      `,
      errors: [
        {
          messageId: 'noUseReducer',
          type: 'ImportSpecifier',
        },
        {
          messageId: 'noUseReducer',
          type: 'CallExpression',
        },
      ],
    },

    // Invalid: useReducer with complex reducer function
    {
      code: `
        import { useReducer } from 'react';
        
        const reducer = (state, action) => {
          switch (action.type) {
            case 'increment':
              return { count: state.count + 1 };
            case 'decrement':
              return { count: state.count - 1 };
            default:
              return state;
          }
        };
        
        function Counter() {
          const [state, dispatch] = useReducer(reducer, { count: 0 });
          
          return (
            <div>
              <span>{state.count}</span>
              <button onClick={() => dispatch({ type: 'increment' })}>+</button>
              <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
            </div>
          );
        }
      `,
      errors: [
        {
          messageId: 'noUseReducer',
          type: 'ImportSpecifier',
        },
        {
          messageId: 'noUseReducer',
          type: 'CallExpression',
        },
      ],
    },

    // Invalid: useReducer in arrow function component
    {
      code: `
        import { useReducer } from 'react';
        
        const Component = () => {
          const [state, dispatch] = useReducer(reducer, initialState);
          return <div>{state}</div>;
        };
      `,
      errors: [
        {
          messageId: 'noUseReducer',
          type: 'ImportSpecifier',
        },
        {
          messageId: 'noUseReducer',
          type: 'CallExpression',
        },
      ],
    },
  ],
})
