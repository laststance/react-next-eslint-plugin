# no-deopt-use-callback

Flag meaningless `useCallback` usage with intrinsic elements or inline calls.

🔧 [Rule Source](../../lib/rules/no-deopt-use-callback.js)

## Rule Details

This rule detects meaningless uses of `useCallback` where the performance benefits are negated. `useCallback` should primarily stabilize function props for memoized components to preserve referential equality and prevent unnecessary re-renders.

The rule flags two anti-patterns:

1. **Passing to intrinsic elements**: `<div onClick={callback} />`

   - Intrinsic elements (div, button, span, etc.) are not memoized and re-render anyway
   - The `useCallback` overhead provides no benefit

2. **Called inside inline handlers**: `<div onClick={() => callback()} />`
   - Creating a new inline function defeats the referential stability purpose
   - The callback might as well be inlined directly

These checks work for every DOM event prop (`onClick`, `onMouseEnter`, `onBlur`, etc.), for both `useCallback(...)` and `React.useCallback(...)`, and for `React.createElement` (or `createElement`) factory calls.

### Why This Rule Exists

1. **False Sense of Optimization**: Developers think they're optimizing when they're not
2. **Code Complexity**: `useCallback` adds complexity without benefit in these cases
3. **Performance Overhead**: The memoization check itself has a small cost
4. **Maintenance Burden**: More code to maintain with no actual gain
5. **Misunderstanding**: Indicates misunderstanding of React optimization patterns

### When useCallback IS Useful

- Passing to memoized components (`React.memo`)
- Dependencies for other hooks (`useEffect`, `useMemo`)
- Preventing infinite loops in effect dependencies
- Optimizing expensive child re-renders

## Examples

### ❌ Incorrect

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

      {/* Also flags other intrinsic elements */}
      <div onClick={handleClick}>Clickable div</div>
      <span onClick={() => handleClick()}>Clickable span</span>
    </div>
  )
}

// React.createElement is also checked
function Component2() {
  const handleClick = useCallback(() => {
    console.log('clicked')
  }, [])

  return React.createElement(
    'button',
    {
      onClick: handleClick, // Flagged
    },
    'Click me',
  )
}

// Inline function calling callback
function Component3() {
  const process = useCallback((data) => {
    return data * 2
  }, [])

  return React.createElement('div', {
    onClick: () => process(42), // Flagged
  })
}

// React namespace usage and non-click events are also flagged
import React from 'react'
function Component4() {
  const handleHover = React.useCallback(() => {}, [])
  return <button onMouseEnter={handleHover}>Hover me</button>
}

// Inline handler blocks that call the callback still violate the rule
function Component5() {
  const handleClick = useCallback(() => console.log('click'), [])
  return (
    <div
      onClick={() => {
        handleClick()
        console.log('extra')
      }}
    />
  )
}

// createElement helper references inherit the same logic
import { createElement, useCallback } from 'react'
function Component6() {
  const handler = useCallback(() => {}, [])
  return createElement('section', { onClick: () => handler() })
}
```

### ✅ Correct

```javascript
import React, { useCallback, memo } from 'react'

// Option 1: Use useCallback with memoized components (correct usage)
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
    </div>
  )
}

// Option 2: Just use inline for intrinsic elements (simpler, clearer)
function Component() {
  return (
    <div>
      <button onClick={() => console.log('clicked')}>Click me</button>
      <button onClick={() => console.log('clicked again')}>Click again</button>
    </div>
  )
}

// Option 3: Plain function if no optimization needed
function Component() {
  function handleClick() {
    console.log('clicked')
  }

  return <button onClick={handleClick}>Click me</button>
}

// Option 4: useCallback for effect dependencies
function Component({ userId }) {
  const fetchUser = useCallback(async () => {
    const response = await fetch(`/api/users/${userId}`)
    return response.json()
  }, [userId])

  useEffect(() => {
    fetchUser().then(setUser)
  }, [fetchUser]) // Stable reference prevents infinite loops

  return <div>User data</div>
}

// Option 5: useCallback for expensive child renders
const ExpensiveList = memo(function ExpensiveList({ onItemClick }) {
  // Expensive rendering logic
  return <ul>{/* thousands of items */}</ul>
})

function Parent() {
  const [selected, setSelected] = useState(null)

  // Meaningful: prevents ExpensiveList re-render
  const handleItemClick = useCallback((id) => {
    setSelected(id)
  }, [])

  return <ExpensiveList onItemClick={handleItemClick} />
}
```

## Options

This rule has no configuration options. All meaningless `useCallback` usages are flagged.

## When Not To Use It

You might want to disable this rule if:

1. **Consistent patterns**: Your team prefers consistent `useCallback` usage everywhere for uniformity
2. **Future-proofing**: You always use `useCallback` anticipating future component memoization
3. **Learning phase**: You're learning React optimization and want to experiment freely
4. **Migration**: You're gradually refactoring and don't want immediate violations
5. **Code generation**: You have tools that automatically add `useCallback` everywhere

### Performance Reality Check

Using `useCallback` on intrinsic elements:

- **Cost**: Memory allocation, dependency comparison on every render
- **Benefit**: None (intrinsic elements always re-render with parent)
- **Net result**: Small performance penalty

For most applications, the overhead is negligible, but it's still code complexity without benefit.

## Further Reading

- [React useCallback Hook](https://react.dev/reference/react/useCallback)
- [React.memo API Reference](https://react.dev/reference/react/memo)
- [When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Before You memo()](https://overreacted.io/before-you-memo/)
- [useCallback Hell](https://medium.com/@sdolidze/react-usecallback-hell-81944a9f91c0)
