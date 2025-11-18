# usecallback-might-work

Require wrapping function props passed to custom (non-intrinsic) components with `useCallback`.

🔧 [Rule Source](../../lib/rules/usecallback-might-work.js)

## Rule Details

Whenever you pass a freshly created function prop to a React component, that component will re-render on every parent render because the prop's reference changes. Intrinsic elements (div, span, etc.) re-render anyway, but custom components can preserve work if you keep their function props stable. This rule enforces using `useCallback` (or an already stable reference coming from props/module scope) whenever a function prop flows into a custom component.

What triggers a violation:

- Inline arrow/function expressions inside JSX props for custom components.
- Functions declared inside the component body and passed via props.
- Inline functions within `React.createElement`/`createElement` for custom components.

Allowed patterns:

- Functions returned from `useCallback`.
- Functions defined outside the rendering component (module scope constants, imports).
- Functions received through props (already controlled by the parent).

### ❌ Incorrect

```javascript
const UserList = ({ onSelect }) => <button onClick={onSelect}>Pick</button>

function Screen() {
  return <UserList onSelect={() => console.log('select')} />
}
```

```javascript
import { createElement } from 'react'

const UserList = ({ onSelect }) => null

function Screen() {
  const handle = (user) => console.log(user)
  return createElement(UserList, { onSelect: handle })
}
```

### ✅ Correct

```javascript
import { useCallback } from 'react'

const UserList = ({ onSelect }) => <button onClick={onSelect}>Pick</button>

function Screen({ onSelect }) {
  const stableSelect = useCallback(() => {
    onSelect()
  }, [onSelect])

  return <UserList onSelect={stableSelect} />
}
```

```javascript
const UserList = ({ onSelect }) => <button onClick={onSelect}>Pick</button>
const stableOutside = () => console.log('stable once')

function Screen({ onSelect }) {
  return (
    <>
      <UserList onSelect={onSelect} />
      <UserList onSelect={stableOutside} />
    </>
  )
}
```

## Options

This rule has no configuration options.

## Known Limitations

- Only JSX identifiers starting with an uppercase character are treated as custom components. Member expressions (`Foo.Bar`) are currently ignored.
- The rule does not inspect whether the receiving component is memoized; it simply enforces best practices for all custom components.
- Functions returned from custom hooks are considered already stable and therefore exempt.
