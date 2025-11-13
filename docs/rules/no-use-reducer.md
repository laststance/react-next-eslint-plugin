# no-use-reducer

Discourage using `useReducer` directly; prefer semantic custom hooks or Redux Toolkit.

🔧 [Rule Source](../../lib/rules/no-use-reducer.js)

## Rule Details

This rule discourages the use of React's `useReducer` hook in favor of more robust state management solutions like Redux Toolkit or semantic custom hooks. While `useReducer` can be useful, it can lead to bugs and maintainability issues in complex applications.

The rule flags:
- Direct `useReducer` calls
- `React.useReducer` member expression calls
- Import statements importing `useReducer` from React

### Why This Rule Exists

1. **Bug Prevention**: Hand-written reducers are prone to bugs (missing cases, incorrect state updates, mutating state)
2. **Boilerplate Reduction**: Redux Toolkit provides simpler APIs with less boilerplate than `useReducer`
3. **DevTools Integration**: Redux DevTools provide powerful debugging capabilities not available with `useReducer`
4. **Consistency**: Establishes a consistent state management approach across the application
5. **Type Safety**: Redux Toolkit has better TypeScript integration and type inference
6. **Testing**: Redux slices are easier to test than component-embedded reducers

### Recommended Alternatives

- **Redux Toolkit**: For complex state management with excellent DevTools
- **Zustand**: For simpler global state without Redux boilerplate
- **Jotai**: For atomic state management
- **Custom hooks with `useState`**: For simple local state with semantic names

## Examples

### ❌ Incorrect

```javascript
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

// Also flags React.useReducer
function AnotherCounter() {
  const [state, dispatch] = React.useReducer(reducer, { count: 0 });
  return <div>{state.count}</div>;
}
```

### ✅ Correct

```javascript
// Option 1: Redux Toolkit (recommended for complex state)
import { useSelector, useDispatch } from 'react-redux';
import { createSlice } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: {
    increment: (state) => {
      state.count += 1; // Immer makes this safe
    },
    decrement: (state) => {
      state.count -= 1;
    },
  },
});

function Counter() {
  const count = useSelector((state) => state.counter.count);
  const dispatch = useDispatch();

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => dispatch(counterSlice.actions.increment())}>
        +
      </button>
      <button onClick={() => dispatch(counterSlice.actions.decrement())}>
        -
      </button>
    </div>
  );
}

// Option 2: Zustand (simpler alternative)
import { create } from 'zustand';

const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

function Counter() {
  const { count, increment, decrement } = useCounterStore();

  return (
    <div>
      <span>{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}

// Option 3: Semantic custom hook with useState (for simple cases)
function useCounter(initialCount = 0) {
  const [count, setCount] = useState(initialCount);

  const increment = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount(c => c - 1);
  }, []);

  return { count, increment, decrement };
}

function Counter() {
  const { count, increment, decrement } = useCounter(0);

  return (
    <div>
      <span>{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}

// Option 4: Jotai (atomic state management)
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);

function Counter() {
  const [count, setCount] = useAtom(countAtom);

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <button onClick={() => setCount(c => c - 1)}>-</button>
    </div>
  );
}
```

## Options

This rule has no configuration options. All uses of `useReducer` are flagged.

## When Not To Use It

You might want to disable this rule if:

1. **React-only constraint**: You must use only React built-ins without external dependencies
2. **Very simple reducers**: You have trivial reducers that don't justify Redux Toolkit
3. **Form state**: You're using `useReducer` for complex form state where alternatives are worse
4. **Migration in progress**: You're gradually migrating from `useReducer` to Redux Toolkit
5. **Third-party hooks**: You're using libraries that internally use `useReducer` (though this rule only flags direct usage in your code)

### When useReducer Might Be Acceptable

- Extremely simple, one-off state machines
- Educational/learning contexts
- Prototypes or proof-of-concepts
- Libraries that need to avoid external dependencies

## Further Reading

- [Redux Toolkit Quick Start](https://redux-toolkit.js.org/tutorials/quick-start)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Jotai Documentation](https://jotai.org/docs/introduction)
- [You Might Not Need useReducer](https://kentcdodds.com/blog/should-i-usestate-or-usereducer)
- [React useReducer Hook](https://react.dev/reference/react/useReducer)
