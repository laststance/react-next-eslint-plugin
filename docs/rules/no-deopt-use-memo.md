# no-deopt-use-memo

Flag meaningless `useMemo` usage, mirroring `no-deopt-use-callback` but for memoized values.

🔧 [Rule Source](../../lib/rules/no-deopt-use-memo.js)

## Rule Details

`useMemo` should stabilize expensive values for memoized components or hook dependencies. When you pass a memoized object to an intrinsic element (like `<div>`), the intrinsic re-renders anyway and the memo buys nothing. Similarly, grabbing the memoized value from a freshly created inline handler defeats the goal, because the inline wrapper still changes identity every render. This rule catches those “maybe-useful” `useMemo` calls and nudges you to inline the value instead.

### ❌ Incorrect

```javascript
import { useMemo } from 'react'

function Screen({ color }) {
  const style = useMemo(() => ({ color }), [color])
  return <div style={style} /> // div re-renders regardless
}
```

```javascript
import React, { useMemo } from 'react'

function Screen({ color }) {
  const style = useMemo(() => ({ color }), [color])
  return (
    <div
      onClick={() => {
        console.log(style.color)
      }}
    />
  )
}
```

```javascript
import { useMemo, createElement } from 'react'

function Screen({ color }) {
  const data = useMemo(() => ({ color }), [color])
  return createElement('section', { data })
}
```

### ✅ Correct

```javascript
import { memo, useMemo } from 'react'

const MemoCard = memo(({ style }) => <div style={style} />)

function Screen({ color }) {
  const style = useMemo(() => ({ color }), [color])
  return <MemoCard style={style} />
}
```

```javascript
import { useMemo } from 'react'

function Screen({ user }) {
  const contextValue = useMemo(() => ({ id: user.id }), [user.id])
  return <SomeContext.Provider value={contextValue} />
}
```

## Options

This rule has no configuration options.

## Known Limitations

- The rule assumes `useMemo` variables are identifiers; complex destructuring patterns are ignored.
- Only obvious intrinsic-element usages (`<div>`, `createElement('div', ...)`) are flagged. If you pass a memoized value to helper functions before reaching an intrinsic element, the rule cannot detect it.
- Inline handler analysis only reports when the handler references the memo variable somewhere inside; it does not reason about whether that usage truly causes re-renders.
