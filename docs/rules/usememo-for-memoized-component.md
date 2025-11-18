# usememo-for-memoized-component

Require wrapping object/array props passed to memoized components with `useMemo`.

🔧 [Rule Source](../../lib/rules/usememo-for-memoized-component.js)

## Rule Details

`React.memo` relies on referential equality for props. If a parent recreates object or array props on every render, the memoized child re-renders anyway. This rule detects memoized components declared via `React.memo`/`memo` in the same file and ensures any object/array props they receive are either returned from `useMemo` or come from already stable sources (module scope constants, parent props, etc.).

Checks include JSX and `React.createElement` usage.

### ❌ Incorrect

```javascript
import { memo } from 'react'

const MemoCard = memo(function MemoCard({ config }) {
  return <pre>{JSON.stringify(config)}</pre>
})

function Screen({ color }) {
  return <MemoCard config={{ color }} />
}
```

```javascript
import { memo } from 'react'

const MemoCard = memo(() => null)

function Screen({ items }) {
  const list = items.map((item) => item.id)
  return React.createElement(MemoCard, { list })
}
```

### ✅ Correct

```javascript
import { memo, useMemo } from 'react'

const MemoCard = memo(({ config }) => <pre>{JSON.stringify(config)}</pre>)

function Screen({ color }) {
  const config = useMemo(() => ({ color }), [color])
  return <MemoCard config={config} />
}
```

```javascript
import { memo } from 'react'

const MemoCard = memo(({ options }) => null)
const sharedOptions = { color: 'red' }

function Screen(props) {
  return <MemoCard options={props.options ?? sharedOptions} />
}
```

## Options

This rule has no configuration options.

## Known Limitations

- Only memoized components defined in the same file are analyzed. Imported memoized components are skipped because their memoization status is unknown statically.
- The rule focuses on obvious literals (object/array expressions) or variables assigned to those literals within the current render scope. More advanced stability tricks (custom hooks returning stable objects) are assumed valid.
- Values other than object/array literals (e.g., numbers, strings) are ignored.
