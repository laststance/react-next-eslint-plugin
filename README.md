# @laststance/react-next-eslint-plugin

ESLint plugin for React and Next.js projects that includes one rule for my personal use and a rule to prevent infinite re-renders during Vibe Coding.

<p align="center">
  <img src="./image.png" alt="ESLint plugin preview" />
</p>

## Installation

```bash
npm install --save-dev @laststance/react-next-eslint-plugin@latest
```

```bash
yarn add --dev @laststance/react-next-eslint-plugin@latest
```

```bash
pnpm add --save-dev @laststance/react-next-eslint-plugin@latest
```

## Usage

### Flat Config (ESLint 9.0+)

```javascript
import lastStanceReactNextPlugin from '@laststance/react-next-eslint-plugin'

export default [
  {
    plugins: {
      '@laststance/react-next': lastStanceReactNextPlugin,
    },
    rules: {
      '@laststance/react-next/no-jsx-without-return': 'error',
      '@laststance/react-next/all-memo': 'error',
      '@laststance/react-next/no-use-reducer': 'error',
      '@laststance/react-next/no-set-state-prop-drilling': [
        'error',
        { depth: 1 },
      ],
      '@laststance/react-next/no-deopt-use-callback': 'error',
      '@laststance/react-next/no-deopt-use-memo': 'error',
      '@laststance/react-next/no-direct-use-effect': 'error',
      '@laststance/react-next/no-forward-ref': 'error',
      '@laststance/react-next/no-context-provider': 'error',
      '@laststance/react-next/no-missing-key': 'error',
      '@laststance/react-next/no-duplicate-key': 'error',
      '@laststance/react-next/no-missing-component-display-name': 'error',
      '@laststance/react-next/no-nested-component-definitions': 'error',
      '@laststance/react-next/no-missing-button-type': 'error',
      '@laststance/react-next/prefer-stable-context-value': 'error',
      '@laststance/react-next/prefer-usecallback-might-work': 'error',
      '@laststance/react-next/prefer-usecallback-for-memoized-component': 'error',
      '@laststance/react-next/prefer-usememo-for-memoized-component': 'error',
      '@laststance/react-next/prefer-usememo-might-work': 'error',
    },
  },
]
```

## Rules

These rules are provided by the plugin. Enable only those you need. Click on each rule for detailed documentation.
Some rules are imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.

- [`laststance/no-jsx-without-return`](docs/rules/no-jsx-without-return.md): Disallow JSX elements not returned or assigned
- [`laststance/all-memo`](docs/rules/all-memo.md): Enforce wrapping React function components with `React.memo`
- [`laststance/no-use-reducer`](docs/rules/no-use-reducer.md): Disallow `useReducer` hook in favor of Redux Toolkit to eliminate bugs
- [`laststance/no-set-state-prop-drilling`](docs/rules/no-set-state-prop-drilling.md): Disallow passing `useState` setters via props; prefer semantic handlers or state management
- [`laststance/no-deopt-use-callback`](docs/rules/no-deopt-use-callback.md): Flag meaningless `useCallback` usage with intrinsic elements or inline calls
- [`laststance/no-deopt-use-memo`](docs/rules/no-deopt-use-memo.md): Flag meaningless `useMemo` usage with intrinsic elements or inline handlers
- [`laststance/no-direct-use-effect`](docs/rules/no-direct-use-effect.md): Disallow calling `useEffect` directly inside React components; extract to custom hooks
- [`laststance/no-forward-ref`](docs/rules/no-forward-ref.md): Prefer passing `ref` as a prop instead of `forwardRef` (React 19)
- [`laststance/no-context-provider`](docs/rules/no-context-provider.md): Prefer rendering `<Context>` instead of `<Context.Provider>` (React 19)
- [`laststance/no-missing-key`](docs/rules/no-missing-key.md): Disallow list items without `key`
- [`laststance/no-duplicate-key`](docs/rules/no-duplicate-key.md): Disallow duplicate `key` values among siblings
- [`laststance/no-missing-component-display-name`](docs/rules/no-missing-component-display-name.md): Require `displayName` for anonymous memo/forwardRef components
- [`laststance/no-nested-component-definitions`](docs/rules/no-nested-component-definitions.md): Disallow defining components inside other components
- [`laststance/no-missing-button-type`](docs/rules/no-missing-button-type.md): Require explicit `type` for button elements
- [`laststance/prefer-stable-context-value`](docs/rules/prefer-stable-context-value.md): Prefer stable `Context.Provider` values (wrap with `useMemo`/`useCallback`)
- [`laststance/prefer-usecallback-might-work`](docs/rules/prefer-usecallback-might-work.md): Ensure custom components receive `useCallback`-stable function props
- [`laststance/prefer-usecallback-for-memoized-component`](docs/rules/prefer-usecallback-for-memoized-component.md): Ensure function props sent to memoized components are wrapped in `useCallback`
- [`laststance/prefer-usememo-for-memoized-component`](docs/rules/prefer-usememo-for-memoized-component.md): Ensure object/array props to memoized components are wrapped in `useMemo`
- [`laststance/prefer-usememo-might-work`](docs/rules/prefer-usememo-might-work.md): Ensure custom components receive `useMemo`-stable object/array props

## Monorepo Workspace & Demo App

The repository now uses a pnpm workspace (`pnpm-workspace.yaml`). In addition to the plugin package located at the root, there is a Next.js TODO playground under `apps/todo-lint-app` that intentionally mixes code which should pass/fail the custom rules.

- `apps/todo-lint-app`: Generated with `create-next-app`, wired to consume the local plugin, and equipped with Vitest snapshot tests that execute ESLint and capture its output.

See [`docs/demo-playground.md`](docs/demo-playground.md) for detailed guidance on when and how to refresh the playground snapshot.

Useful commands:

```bash
# Run Vitest snapshot tests inside the demo app
pnpm --filter todo-lint-app test

# Update the stored ESLint snapshot after rule/message changes
pnpm --filter todo-lint-app test -- --update

# Lint only the demo app using the workspace plugin build
pnpm --filter todo-lint-app lint
```

### TypeScript Support

The published package ships `index.d.ts` typings so flat-config files can import the plugin with autocomplete. Run `pnpm typecheck` to ensure the declaration files stay in sync when adding new rules.

## Rule Details

### `no-jsx-without-return`

This rule prevents JSX elements that are not properly returned or assigned, which typically indicates a missing `return` statement. It specifically catches standalone JSX expressions and JSX in if/else statements without proper return handling.

**❌ Incorrect**

```javascript
function Component() {
  ;<div>Hello World</div> // Missing return statement
}

function Component() {
  if (condition) <div>Hello</div> // Missing return or block wrapping
}

function Component() {
  if (condition) {
    return <div>Hello</div>
  } else <div>Goodbye</div> // Missing return or block wrapping
}
```

**✅ Correct**

```javascript
function Component() {
  return <div>Hello World</div>
}

function Component() {
  if (condition) {
    return <div>Hello</div>
  }
}

function Component() {
  if (condition) {
    return <div>Hello</div>
  } else {
    return <div>Goodbye</div>
  }
}
```

### `all-memo`

This rule enforces that all React function components (PascalCase functions returning JSX) are wrapped with `React.memo` to prevent unnecessary re-renders and improve performance.

This rule ignores the following files:

- Next.js `layout.tsx` (Server Components)
- Storybook stories that include `.stories.` in the filename

**❌ Incorrect**

```javascript
// Function component without memo wrapping
const UserCard = ({ name, email }) => {
  return (
    <div>
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  )
}

function ProductItem({ title, price }) {
  return (
    <div>
      <h4>{title}</h4>
      <span>${price}</span>
    </div>
  )
}
```

**✅ Correct**

```javascript
import React, { memo } from 'react'

// Wrapped with memo
const UserCard = memo(({ name, email }) => {
  return (
    <div>
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  )
})

const ProductItem = memo(function ProductItem({ title, price }) {
  return (
    <div>
      <h4>{title}</h4>
      <span>${price}</span>
    </div>
  )
})

// Assignment style also works
function ProductItemBase({ title, price }) {
  return (
    <div>
      {title}: ${price}
    </div>
  )
}
const ProductItem = memo(ProductItemBase)
```

### `no-use-reducer`

This rule discourages the use of `useReducer` hook in favor of Redux Toolkit to eliminate the possibility of introducing bugs through complex state management logic and provide better developer experience.

**❌ Incorrect**

```javascript
import { useReducer } from 'react'

const reducer = (state, action) => {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 }
    case 'decrement':
      return { count: state.count - 1 }
    default:
      return state
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 })

  return (
    <div>
      <span>{state.count}</span>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </div>
  )
}
```

**✅ Correct**

```javascript
import { useSelector, useDispatch } from 'react-redux'
import { createSlice } from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: {
    increment: (state) => {
      state.count += 1
    },
    decrement: (state) => {
      state.count -= 1
    },
  },
})

function Counter() {
  const count = useSelector((state) => state.counter.count)
  const dispatch = useDispatch()

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
  )
}
```

### `no-set-state-prop-drilling`

This rule prevents passing `useState` setter functions directly through props, which creates tight coupling and can cause unnecessary re-renders due to unstable function identity. Instead, it promotes semantic handlers or proper state management.

**❌ Incorrect**

```javascript
import { useState } from 'react'

function Parent() {
  const [count, setCount] = useState(0)

  // Passing setter directly creates tight coupling
  return <Child setCount={setCount} count={count} />
}

function Child({ setCount, count }) {
  return <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>
}
```

**✅ Correct**

```javascript
import { useState, useCallback } from 'react'

function Parent() {
  const [count, setCount] = useState(0)

  // Semantic handler with clear intent
  const handleIncrement = useCallback(() => {
    setCount((c) => c + 1)
  }, [])

  return <Child onIncrement={handleIncrement} count={count} />
}

function Child({ onIncrement, count }) {
  return <button onClick={onIncrement}>Count: {count}</button>
}
```

**Options**

- `depth` (number, default: `0`): allows passing a setter through up to N component levels **within the same file**. Imported components stop depth propagation.

### `no-deopt-use-callback`

This rule detects meaningless uses of `useCallback` where the function is passed to intrinsic elements (like `div`, `button`) or called inside inline handlers. `useCallback` should primarily stabilize function props for memoized components to preserve referential equality.

**❌ Incorrect**

```javascript
import { useCallback } from 'react'

function Component() {
  const handleClick = useCallback(() => {
    console.log('clicked')
  }, [])

  return (
    <div>
      {/* Meaningless: intrinsic elements don't benefit from useCallback */}
      <button onClick={handleClick}>Click me</button>

      {/* Meaningless: calling inside inline handler defeats the purpose */}
      <button onClick={() => handleClick()}>Click me too</button>
    </div>
  )
}
```

**✅ Correct**

```javascript
import React, { useCallback, memo } from 'react'

const MemoizedButton = memo(function MemoizedButton({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>
})

function Component() {
  // Meaningful: stabilizes prop for memoized component
  const handleClick = useCallback(() => {
    console.log('clicked')
  }, [])

  return (
    <div>
      <MemoizedButton onClick={handleClick}>Click me</MemoizedButton>

      {/* Or just use inline for intrinsic elements */}
      <button onClick={() => console.log('clicked')}>Simple click</button>
    </div>
  )
}
```

### `no-direct-use-effect`

This rule discourages calling `useEffect` directly inside React components so that side effects live in focused custom hooks. Keeping components declarative makes them easier to test and reuse.

**❌ Incorrect**

```javascript
import { useEffect } from 'react'

function Dashboard() {
  useEffect(() => {
    trackPageView('dashboard')
  }, [])

  return <main>Dashboard</main>
}
```

**✅ Correct**

```javascript
import { useEffect } from 'react'

function useDashboardTracking() {
  useEffect(() => {
    trackPageView('dashboard')
  }, [])
}

function Dashboard() {
  useDashboardTracking()
  return <main>Dashboard</main>
}
```

### `prefer-stable-context-value`

This rule prevents passing new object/array/function literals to `Context.Provider` values on each render, which causes unnecessary re-renders of all context consumers. Values should be wrapped with `useMemo` or `useCallback`.

**❌ Incorrect**

```javascript
import React, { createContext, useState } from 'react'

const UserContext = createContext(null)

function UserProvider({ children }) {
  const [user, setUser] = useState(null)

  return (
    <UserContext.Provider
      value={{ user, setUser }} // New object on every render!
    >
      {children}
    </UserContext.Provider>
  )
}
```

**✅ Correct**

```javascript
import React, { createContext, useState, useMemo } from 'react'

const UserContext = createContext(null)

function UserProvider({ children }) {
  const [user, setUser] = useState(null)

  // Stable reference prevents unnecessary consumer re-renders
  const contextValue = useMemo(
    () => ({
      user,
      setUser,
    }),
    [user],
  )

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  )
}
```

### `no-forward-ref`

In React 19, `forwardRef` is no longer required for function components. This rule flags `forwardRef` usage so you can pass `ref` as a prop instead.

**❌ Incorrect**

```javascript
const Button = React.forwardRef((props, ref) => {
  return <button ref={ref} />
})
```

**✅ Correct**

```javascript
const Button = ({ ref }) => {
  return <button ref={ref} />
}
```

### `no-context-provider`

In React 19, `<Context>` can be used directly as a provider. This rule warns on `<Context.Provider>`.

**❌ Incorrect**

```javascript
const App = () => <ThemeContext.Provider value={value} />
```

**✅ Correct**

```javascript
const App = () => <ThemeContext value={value} />
```

### `no-missing-key`

This rule requires `key` when rendering lists and discourages fragment shorthand in list items.

**❌ Incorrect**

```javascript
items.map((item) => <Item />)

items.map((item) => <>{item}</>)
```

**✅ Correct**

```javascript
items.map((item) => <Item key={item.id} />)

items.map((item) => <React.Fragment key={item.id}>{item}</React.Fragment>)
```

### `no-duplicate-key`

This rule requires sibling elements to have unique `key` values.

**❌ Incorrect**

```javascript
return [
  <Item key="a" />,
  <Item key="a" />,
]
```

**✅ Correct**

```javascript
return [
  <Item key="a" />,
  <Item key="b" />,
]
```

### `no-missing-component-display-name`

Anonymous components wrapped with `memo` or `forwardRef` should have an explicit `displayName`.

**❌ Incorrect**

```javascript
const App = React.memo(() => <div />)
```

**✅ Correct**

```javascript
const App = React.memo(function App() {
  return <div />
})

App.displayName = 'App'
```

### `no-nested-component-definitions`

Defining components inside other components recreates them on each render. This rule flags nested component definitions.

**❌ Incorrect**

```javascript
function Parent() {
  function Child() {
    return <div />
  }
  return <Child />
}
```

**✅ Correct**

```javascript
function Child() {
  return <div />
}

function Parent() {
  return <Child />
}
```

### `no-missing-button-type`

Buttons should have an explicit `type` attribute to avoid implicit submit behavior.

**❌ Incorrect**

```javascript
<button />
```

**✅ Correct**

```javascript
<button type="button" />
```

## Configuration

This plugin intentionally does not ship a bundled recommended config. Opt-in the rules that fit your codebase.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [laststance](https://github.com/laststance)
