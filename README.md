# @laststance/react-next-eslint-plugin

ESLint plugin for React and Next.js projects with rules to improve code quality and catch common mistakes.

## Installation

```bash
npm install --save-dev @laststance/react-next-eslint-plugin
```

```bash
yarn add --dev @laststance/react-next-eslint-plugin
```

```bash
pnpm add --save-dev @laststance/react-next-eslint-plugin
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
      'laststance/no-use-effect': 'warn',
      'laststance/no-use-reducer': 'warn',
      'laststance/no-set-state-prop-drilling': 'warn',
      'laststance/no-deopt-use-callback': 'warn',
      'laststance/prefer-stable-context-value': 'warn',
      'laststance/no-unstable-classname-prop': 'warn',
      'laststance/no-client-fetch-in-server-components': 'error',
    },
  },
]
```

## Rules

These rules are provided by the plugin. Enable only those you need.

- `laststance/no-jsx-without-return`: Disallow JSX elements not returned or assigned
- `laststance/all-memo`: Enforce wrapping React function components with `React.memo`
- `laststance/no-use-effect`: Discourage using `useEffect` directly in components; prefer semantic custom hooks
- `laststance/no-use-reducer`: Disallow `useReducer` hook in favor of Redux Toolkit to eliminate bugs
- `laststance/no-set-state-prop-drilling`: Disallow passing `useState` setters via props; prefer semantic handlers or state management
- `laststance/no-deopt-use-callback`: Flag meaningless `useCallback` usage with intrinsic elements or inline calls
- `laststance/prefer-stable-context-value`: Prefer stable `Context.Provider` values (wrap with `useMemo`/`useCallback`)
- `laststance/no-unstable-classname-prop`: Avoid unstable `className` expressions that change identity every render
- `laststance/no-client-fetch-in-server-components`: Disallow client-only fetch libraries in Next.js Server Components

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

### `no-use-effect`

This rule discourages using `useEffect` directly inside React components and promotes creating semantic custom hooks instead. This improves code organization, reusability, and testability.

**❌ Incorrect**

```javascript
import { useEffect, useState } from 'react'

function UserProfile({ userId }) {
  const [user, setUser] = useState(null)

  // Direct useEffect usage in component
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then(setUser)
  }, [userId])

  return <div>{user?.name}</div>
}
```

**✅ Correct**

```javascript
import { useEffect, useState } from 'react'

// Custom hook with semantic meaning
function useUser(userId) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then(setUser)
  }, [userId])

  return user
}

function UserProfile({ userId }) {
  const user = useUser(userId) // Clean, semantic usage
  return <div>{user?.name}</div>
}
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

### `no-client-fetch-in-server-components`

This rule prevents using client-side fetch libraries (like `axios` or `$fetch`) in Next.js Server Components. Server Components should use the native Web Fetch API or move client-side data fetching to Client Components.

**❌ Incorrect**

```javascript
import axios from 'axios'

// Server Component (no "use client") using client-side library
export default async function UserPage({ params }) {
  const response = await axios.get(`/api/users/${params.id}`)
  return <div>{response.data.name}</div>
}
```

**✅ Correct**

```javascript
// Option 1: Use native fetch in Server Component
export default async function UserPage({ params }) {
  const response = await fetch(`${process.env.API_URL}/users/${params.id}`)
  const user = await response.json()
  return <div>{user.name}</div>
}

// Option 2: Move to Client Component for client-side libraries
'use client'
import axios from 'axios'
import { useEffect, useState } from 'react'

export default function UserPage({ params }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    axios.get(`/api/users/${params.id}`)
      .then(response => setUser(response.data))
  }, [params.id])

  return <div>{user?.name}</div>
}
```

## Configuration

This plugin intentionally does not ship a bundled recommended config. Opt-in the rules that fit your codebase.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [laststance](https://github.com/laststance)
