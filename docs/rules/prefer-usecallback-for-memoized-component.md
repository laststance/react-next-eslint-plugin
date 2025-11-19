# prefer-usecallback-for-memoized-component

Require wrapping function props sent to memoized components with `useCallback` so their references stay stable across renders.

🔧 [Rule Source](../../lib/rules/prefer-usecallback-for-memoized-component.js)

## Rule Details

`React.memo` (and friends) only prevents child re-renders when the props you pass retain referential equality. If a parent recreates handlers every render, memoization is defeated. This rule detects memoized components created with `React.memo`/`memo` in the same file and verifies that any functions passed to them are stabilized via `useCallback` (or come from outside the render scope).

What the rule enforces:

- Inline arrow/function expressions inside JSX or `React.createElement` props for memoized components must be replaced with a `useCallback` result.
- Locally declared handler functions (function declarations or `const handler = () => {}` inside the component body) must also be wrapped with `useCallback` before being passed along.
- Module-scope helpers, imported handlers, or props coming from parents are considered stable and are allowed as-is.

This rule complements `laststance/no-deopt-use-callback`: that rule prevents meaningless `useCallback` usage, while this one ensures `useCallback` is used where it actually matters.

### ❌ Incorrect

```javascript
import { memo } from 'react'

const MemoButton = memo(function MemoButton({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>
})

function Parent({ label }) {
  // Inline function recreates every render -> memo loses effectiveness
  return <MemoButton onClick={() => console.log('clicked', label)} />
}
```

```javascript
import React, { memo } from 'react'

const MemoList = memo(() => null)

function Parent() {
  function handleSelect(id) {
    // recreated on every render
    console.log('select', id)
  }
  return <MemoList onSelect={handleSelect} />
}
```

```javascript
import React, { memo } from 'react'

const MemoItem = memo(() => null)

function Parent() {
  const handleRemove = () => console.log('remove')
  return React.createElement(MemoItem, { onRemove: handleRemove })
}
```

### ✅ Correct

```javascript
import { memo, useCallback } from 'react'

const MemoButton = memo(function MemoButton({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>
})

function Parent({ label }) {
  const handleClick = useCallback(() => {
    console.log('clicked', label)
  }, [label])

  return <MemoButton onClick={handleClick} />
}
```

```javascript
import React from 'react'

const memoize = React.memo
const MemoList = memoize(() => null)

const stableOutside = () => console.log('stable once')

function Parent({ onSelect }) {
  // Handlers from props or module scope are already stable
  return (
    <>
      <MemoList onSelect={onSelect} />
      <MemoList onSelect={stableOutside} />
    </>
  )
}
```

```javascript
import React, { memo, useCallback, createElement } from 'react'

const MemoItem = memo(() => null)

function Parent() {
  const handleRemove = useCallback(() => console.log('remove'), [])
  return createElement(MemoItem, { onRemove: handleRemove })
}
```

## Options

This rule has no configuration options.

## Known Limitations

- Only memoized components created within the same file via `React.memo`/`memo` can be detected. Imported memoized components are assumed unknown and are skipped.
- The rule focuses on obvious inline functions or handlers declared within the current render scope. Helpers defined at module scope, values returned from custom hooks, or props passed from parents are treated as already stable.
- Function stability (dependency arrays, custom memoization hooks, etc.) is not analyzed—only the presence of a `useCallback` call (or an already-stable reference) is required.
