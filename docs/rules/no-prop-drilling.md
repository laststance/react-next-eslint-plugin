# no-prop-drilling

Disallow forwarding received props through two or more same-file component levels.

🔧 [Rule Source](../../lib/rules/no-prop-drilling.js)

## Rule Details

This rule allows a component to pass a received prop to one same-file child component. It reports the next pass, and every later pass, when that child forwards the prop to another component defined in the same file.

The rule tracks:

- Parameter/body destructuring, rest props, and static `props.value` access
- Renamed receiving props and simple local aliases
- JSX prop spreads
- Property reads such as `user.name`
- `memo` and `React.memo` wrappers
- `createElement` and `React.createElement`
- JSX returned from conditional and logical expressions

Intrinsic elements and imported components stop the graph naturally. The rule therefore does not need a library allowlist, but it also does not follow local components imported from another file.

## Examples

### ❌ Incorrect

```javascript
function Parent({ value }) {
  return <Child value={value} />
}

function Child({ value }) {
  return <Grandchild value={value} /> // Reported at depth 2
}

function Grandchild({ value }) {
  return <GreatGrandchild value={value} /> // Also reported after depth 2
}

function GreatGrandchild({ value }) {
  return <span>{value}</span>
}
```

### ✅ Correct

```javascript
function Parent({ value }) {
  return <Child value={value} />
}

function Child({ value }) {
  return <div data-value={value}>{value}</div>
}
```

An imported target also ends the known same-file chain:

```javascript
import { LibraryWidget } from 'library'

function Parent({ value }) {
  return <Child value={value} />
}

function Child({ value }) {
  return <LibraryWidget value={value} />
}
```

## Options

This rule has no options. One component level is always allowed, and forwarding at depth 2 or greater is reported.

## Known Limitations

- Components imported from other files are not followed.
- Dynamic component targets and computed prop names are not followed.
- Complex runtime data flow is outside the rule's static same-file analysis.
