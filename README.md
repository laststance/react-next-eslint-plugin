# @laststance/react-next-eslint-plugin

ESLint plugin for React and Next.js projects with rules to improve code quality and catch common mistakes.

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
import lastStancePlugin from '@laststance/react-next-eslint-plugin'

export default [
  {
    plugins: {
      laststance: lastStancePlugin,
    },
    rules: {
      // Opt-in per rule
      'laststance/no-jsx-without-return': 'error',
      'laststance/all-memo': 'warn',
      'laststance/no-use-reducer': 'warn',
      'laststance/no-set-state-prop-drilling': 'warn',
      'laststance/no-deopt-use-callback': 'warn',
      'laststance/no-deopt-use-memo': 'warn',
      'laststance/prefer-stable-context-value': 'warn',
      'laststance/no-unstable-classname-prop': 'warn',
      'laststance/usecallback-might-work': 'warn',
      'laststance/usecallback-for-memoized-component': 'warn',
      'laststance/usememo-for-memoized-component': 'warn',
      'laststance/usememo-might-work': 'warn',
    },
  },
]
```

## Rules

These rules are provided by the plugin. Enable only those you need. Click on each rule for detailed documentation.

- [`laststance/no-jsx-without-return`](docs/rules/no-jsx-without-return.md): Disallow JSX elements not returned or assigned
- [`laststance/all-memo`](docs/rules/all-memo.md): Enforce wrapping React function components with `React.memo`
- [`laststance/no-use-reducer`](docs/rules/no-use-reducer.md): Disallow `useReducer` hook in favor of Redux Toolkit to eliminate bugs
- [`laststance/no-set-state-prop-drilling`](docs/rules/no-set-state-prop-drilling.md): Disallow passing `useState` setters via props; prefer semantic handlers or state management
- [`laststance/no-deopt-use-callback`](docs/rules/no-deopt-use-callback.md): Flag meaningless `useCallback` usage with intrinsic elements or inline calls
- [`laststance/no-deopt-use-memo`](docs/rules/no-deopt-use-memo.md): Flag meaningless `useMemo` usage with intrinsic elements or inline handlers
- [`laststance/prefer-stable-context-value`](docs/rules/prefer-stable-context-value.md): Prefer stable `Context.Provider` values (wrap with `useMemo`/`useCallback`)
- [`laststance/no-unstable-classname-prop`](docs/rules/no-unstable-classname-prop.md): Avoid unstable `className` expressions that change identity every render
- [`laststance/usecallback-might-work`](docs/rules/usecallback-might-work.md): Ensure custom components receive `useCallback`-stable function props
- [`laststance/usecallback-for-memoized-component`](docs/rules/usecallback-for-memoized-component.md): Ensure function props sent to memoized components are wrapped in `useCallback`
- [`laststance/usememo-for-memoized-component`](docs/rules/usememo-for-memoized-component.md): Ensure object/array props to memoized components are wrapped in `useMemo`
- [`laststance/usememo-might-work`](docs/rules/usememo-might-work.md): Ensure custom components receive `useMemo`-stable object/array props

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

### `no-unstable-classname-prop`

This rule prevents unstable `className` expressions that change identity on every render, which can cause performance issues in memoized components. It flags inline objects, arrays, function calls, and string concatenations.

**❌ Incorrect**

```javascript
function Component({ isActive, theme }) {
  return (
    <div>
      {/* Object literal creates new reference each render */}
      <button className={{ active: isActive, theme }}>Button 1</button>

      {/* Array literal creates new reference each render */}
      <button className={['btn', isActive && 'active']}>Button 2</button>

      {/* Function call executes each render */}
      <button className={classNames('btn', { active: isActive })}>
        Button 3
      </button>

      {/* String concatenation creates new string each render */}
      <button className={'btn ' + theme}>Button 4</button>
    </div>
  )
}
```

**✅ Correct**

```javascript
import { useMemo } from 'react'
import classNames from 'classnames'

function Component({ isActive, theme }) {
  // Memoize complex className logic
  const buttonClassName = useMemo(
    () => classNames('btn', { active: isActive }, theme),
    [isActive, theme],
  )

  return (
    <div>
      {/* Static strings are fine */}
      <button className="btn primary">Static Button</button>

      {/* Template literals with stable references */}
      <button className={`btn ${theme}`}>Template Button</button>

      {/* Memoized complex logic */}
      <button className={buttonClassName}>Complex Button</button>
    </div>
  )
}
```

## Configuration

This plugin intentionally does not ship a bundled recommended config. Opt-in the rules that fit your codebase.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [laststance](https://github.com/laststance)
