# usememo-might-work

Require wrapping object/array props passed to custom (non-intrinsic) components with `useMemo`.

🔧 [Rule Source](../../lib/rules/usememo-might-work.js)

## Rule Details

Even if a child component is not memoized today, stabilizing expensive object/array props avoids downstream churn (and prepares you for memoization later). This rule flags inline object/array literals or locally created objects/arrays that are handed to custom components. Use `useMemo` to produce a stable reference or move the value outside the render scope.

### ❌ Incorrect

```javascript
const Panel = ({ style }) => <section style={style} />

function Screen() {
  return <Panel style={{ color: 'red' }} />
}
```

```javascript
const Panel = ({ config }) => <section />

function Screen(props) {
  const config = { color: props.color }
  return <Panel config={config} />
}
```

### ✅ Correct

```javascript
import { useMemo } from 'react'

const Panel = ({ style }) => <section style={style} />

function Screen({ color }) {
  const style = useMemo(() => ({ color }), [color])
  return <Panel style={style} />
}
```

```javascript
const Panel = ({ style }) => <section style={style} />
const baseStyle = { color: 'red' }

function Screen({ style }) {
  return <Panel style={style || baseStyle} />
}
```

## Options

This rule has no configuration options.

## Known Limitations

- Only JSX identifiers starting with an uppercase character (e.g., `Panel`) are considered custom components.
- The rule treats any object/array created inside the current render function as unstable. If you have a custom hook that already memoizes a value, return it directly to avoid warnings.
- Values created outside the module scope (e.g., within closures in other modules) are not analyzed.
