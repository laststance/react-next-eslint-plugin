# no-set-state-prop-drilling

Disallow passing `useState` setters via props; prefer semantic handlers or state management.

🔧 [Rule Source](../../lib/rules/no-set-state-prop-drilling.js)

## Rule Details

This rule prevents passing `useState` setter functions directly through component props. Passing raw setters creates tight coupling between components and can cause unnecessary re-renders due to unstable function identity.

The rule flags:

- Direct setter prop drilling in JSX: `<Child setState={setState} />`
- Setter in React.createElement props: `createElement(Child, { setState })`
- Setters passed within object literals to intrinsic elements

**Note**: The rule allows wrapping setters in arrow functions or named functions, as these create semantic handlers. You can also allow limited prop depth via the `depth` option.

### Why This Rule Exists

1. **Tight Coupling**: Child components become tightly coupled to parent state implementation
2. **Unstable References**: Setter functions change identity on each render, breaking memoization
3. **Poor API Design**: Component APIs should be semantic (e.g., `onIncrement`) not implementation-focused (`setCount`)
4. **Maintenance Issues**: Changing parent state structure requires updating all child components
5. **Testing Difficulty**: Testing components with raw setters is harder than testing semantic handlers
6. **Intent Clarity**: Semantic handlers make component behavior clear at a glance

### Recommended Alternatives

- **Semantic event handlers**: `onIncrement`, `onToggle`, `onUserSelect`
- **State management libraries**: Zustand, Redux, Jotai
- **Composition patterns**: Render props, compound components
- **Context API**: For deeply nested state sharing

## Examples

### ❌ Incorrect

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

// Also flags React.createElement with setter in props
function Parent2() {
  const [isOpen, setIsOpen] = useState(false)

  return React.createElement(Modal, {
    isOpen,
    setIsOpen, // Flagged
  })
}

// Setter passed in object literal to intrinsic element
function Parent3() {
  const [value, setValue] = useState('')

  return <div someProps={{ setValue }}>Content</div>
}

// React namespace imports behave the same way
import React from 'react'
function Parent4() {
  const [value, setValue] = React.useState('')
  return <Child onUpdate={setValue} />
}

// Nested object literals are still raw setters
function Parent5() {
  const [value, setValue] = useState('')
  return <Child handlers={{ onChange: setValue }} />
}
```

### ✅ Correct

```javascript
import { useState, useCallback } from 'react'

// Option 1: Semantic handler with clear intent (preferred)
function Parent() {
  const [count, setCount] = useState(0)

  const handleIncrement = useCallback(() => {
    setCount((c) => c + 1)
  }, [])

  return <Child onIncrement={handleIncrement} count={count} />
}

function Child({ onIncrement, count }) {
  return <button onClick={onIncrement}>Count: {count}</button>
}

// Option 2: Inline arrow function (allowed - creates semantic wrapper)
function Parent() {
  const [count, setCount] = useState(0)

  return <Child onIncrement={() => setCount((c) => c + 1)} count={count} />
}

// Option 3: State management library (Zustand)
import { create } from 'zustand'

const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))

function Parent() {
  return <Child />
}

function Child() {
  const { count, increment } = useCounterStore()
  return <button onClick={increment}>Count: {count}</button>
}

// Option 4: Multiple semantic handlers
function Form() {
  const [formData, setFormData] = useState({ name: '', email: '' })

  const handleNameChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }))
  }, [])

  const handleEmailChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, email: e.target.value }))
  }, [])

  return (
    <FormFields
      name={formData.name}
      email={formData.email}
      onNameChange={handleNameChange}
      onEmailChange={handleEmailChange}
    />
  )
}

// Option 5: Context for deeply nested components
const CounterContext = createContext()

function CounterProvider({ children }) {
  const [count, setCount] = useState(0)

  const value = useMemo(
    () => ({
      count,
      increment: () => setCount((c) => c + 1),
      decrement: () => setCount((c) => c - 1),
    }),
    [count],
  )

  return (
    <CounterContext.Provider value={value}>{children}</CounterContext.Provider>
  )
}
```

## Options

This rule accepts an options object:

- `depth` (number, default: `0`): allows passing a setter through up to N component levels **within the same file**.

**Important behaviors**

- Only components defined in the same file are tracked for depth propagation.
- Imported/unknown components stop the depth chain (no extra warnings beyond the allowed depth).
- Intrinsic elements like `div` or `button` are still flagged when the setter originates in the same component, or when the depth already exceeds the allowed limit.

### Example

```javascript
// eslint config
'@laststance/react-next/no-set-state-prop-drilling': ['error', { depth: 1 }]
```

## When Not To Use It

You might want to disable this rule if:

1. **Simple forms**: You have very simple form components where wrapper functions are overkill
2. **Prototypes**: You're building a quick prototype and coupling is acceptable
3. **Single-component apps**: Your app is so small that coupling doesn't matter
4. **Migration phase**: You're gradually refactoring and want to address this incrementally
5. **Generic form libraries**: You're building a form library that intentionally exposes setters

### Trade-offs to Consider

Creating semantic handlers has costs:

- Slightly more boilerplate code
- Additional function allocations (mitigated by `useCallback`)
- More lines of code in parent components

Benefits usually outweigh costs in any non-trivial application.

## Further Reading

- [React State Management](https://react.dev/learn/managing-state)
- [useCallback Hook](https://react.dev/reference/react/useCallback)
- [Lifting State Up](https://react.dev/learn/sharing-state-between-components)
- [Zustand State Management](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Prop Drilling Problem](https://kentcdodds.com/blog/prop-drilling)
