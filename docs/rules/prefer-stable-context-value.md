# prefer-stable-context-value

Prefer stable `Context.Provider` values; wrap with `useMemo`/`useCallback`.

🔧 [Rule Source](../../lib/rules/prefer-stable-context-value.js)

## Rule Details

This rule prevents passing new object/array/function literals to `Context.Provider` values on each render, which causes unnecessary re-renders of all context consumers. Values should be wrapped with `useMemo` or `useCallback` to provide stable references.

The rule flags:

- Inline object literals: `value={{ user, setUser }}`
- Inline array literals: `value={[user, setUser]}`
- Inline function expressions: `value={() => doSomething()}`

### Why This Rule Exists

1. **Performance Impact**: Every context consumer re-renders when the provider value changes
2. **Cascading Re-renders**: Context changes can trigger re-renders deep in the component tree
3. **Memoization Breakage**: Child components wrapped in `memo()` will still re-render
4. **Debugging Difficulty**: Performance issues from context are hard to trace
5. **Optimization Defeat**: Negates benefits of `React.memo`, `useCallback`, and `useMemo` in consumers

### How Context Value Changes Work

```javascript
// Parent re-renders → new object created → all consumers re-render
<UserContext.Provider value={{ user, setUser }}>
```

Even if `user` and `setUser` haven't changed, the object literal creates a new reference, triggering all consumers to update.

## Examples

### ❌ Incorrect

```javascript
import React, { createContext, useState } from 'react'

const UserContext = createContext(null)

// Object literal - new reference every render!
function UserProvider({ children }) {
  const [user, setUser] = useState(null)

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

// Array literal - new reference every render!
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  return (
    <ThemeContext.Provider value={[theme, setTheme]}>
      {children}
    </ThemeContext.Provider>
  )
}

// Function literal - new reference every render!
function ConfigProvider({ children }) {
  const config = getConfig()

  return (
    <ConfigContext.Provider value={() => config}>
      {children}
    </ConfigContext.Provider>
  )
}

// Even a named function expression is still a new reference
function InlineProvider({ children }) {
  return (
    <ConfigContext.Provider
      value={function build() {
        return {}
      }}
    >
      {children}
    </ConfigContext.Provider>
  )
}

// Spreading into a fresh object recreates the value every time
const base = { lang: 'en' }
function ThemeProviderWithSpread({ children, theme }) {
  return (
    <ThemeContext.Provider value={{ ...base, theme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Complex object with computed values
function DataProvider({ children }) {
  const [items, setItems] = useState([])
  const count = items.length

  return (
    <DataContext.Provider
      value={{
        items,
        count,
        addItem: (item) => setItems([...items, item]),
      }}
    >
      {children}
    </DataContext.Provider>
  )
}
```

### ✅ Correct

```javascript
import React, { createContext, useState, useMemo, useCallback } from 'react'

const UserContext = createContext(null)

// Option 1: useMemo for object values (preferred)
function UserProvider({ children }) {
  const [user, setUser] = useState(null)

  // Stable reference - only changes when dependencies change
  const contextValue = useMemo(
    () => ({
      user,
      setUser,
    }),
    [user], // setUser is stable, only user changes
  )

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  )
}

// Option 2: useMemo with computed values
function DataProvider({ children }) {
  const [items, setItems] = useState([])

  const addItem = useCallback((item) => {
    setItems((prev) => [...prev, item])
  }, [])

  const contextValue = useMemo(
    () => ({
      items,
      count: items.length,
      addItem,
    }),
    [items, addItem],
  )

  return (
    <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
  )
}

// Option 3: Separate memoization for complex values
function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light')
  const [primaryColor, setPrimaryColor] = useState('#007bff')

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  const theme = useMemo(
    () => ({
      mode,
      primaryColor,
      colors: mode === 'light' ? lightColors : darkColors,
    }),
    [mode, primaryColor],
  )

  const actions = useMemo(
    () => ({
      toggleMode,
      setPrimaryColor,
    }),
    [toggleMode],
  )

  const contextValue = useMemo(
    () => ({
      theme,
      actions,
    }),
    [theme, actions],
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// Option 4: Single stable value (primitive or pre-memoized)
function SimpleProvider({ children }) {
  const [count, setCount] = useState(0)

  // If passing single primitive, it's already stable
  return <CountContext.Provider value={count}>{children}</CountContext.Provider>
}

// Option 5: Pre-computed stable value outside component
const STATIC_CONFIG = { apiUrl: '/api', timeout: 5000 }

function ConfigProvider({ children }) {
  return (
    <ConfigContext.Provider value={STATIC_CONFIG}>
      {children}
    </ConfigContext.Provider>
  )
}

// Option 6: Memoized arrays stay stable as well
function ArrayProvider({ children, theme }) {
  const value = useMemo(() => [theme], [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
```

## Options

This rule has no configuration options. All inline object/array/function literals in Context.Provider values are flagged.

## When Not To Use It

You might want to disable this rule if:

1. **No consumers**: The context has no actual consumers (rare)
2. **Intentional re-renders**: You want consumers to always re-render with the provider
3. **Static values**: Your context value is truly static (though you could define it outside)
4. **Prototypes**: You're building a quick prototype where performance doesn't matter
5. **Migration**: You're gradually optimizing and want to address this incrementally

### Important Considerations

**Dependencies matter**: Only include values that actually change in `useMemo` dependencies:

```javascript
// ✅ Correct: setUser is stable, don't include it
const value = useMemo(() => ({ user, setUser }), [user])

// ❌ Unnecessary: setUser never changes
const value = useMemo(() => ({ user, setUser }), [user, setUser])
```

**Don't over-optimize**: If your context updates frequently anyway, memoization won't help:

```javascript
// If userId changes constantly, memoization overhead might not be worth it
const value = useMemo(() => ({ userId, fetchUser }), [userId, fetchUser])
```

## Further Reading

- [React Context Performance](https://react.dev/reference/react/useContext#optimizing-re-renders-when-passing-objects-and-functions)
- [useMemo Hook](https://react.dev/reference/react/useMemo)
- [useCallback Hook](https://react.dev/reference/react/useCallback)
- [Context API Best Practices](https://kentcdodds.com/blog/how-to-use-react-context-effectively)
- [Preventing Context Re-renders](https://blog.logrocket.com/solve-react-usecontext-performance-issue/)
