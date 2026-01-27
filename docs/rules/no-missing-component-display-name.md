# no-missing-component-display-name

This rule is imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.

🔧 [Rule Source](../../lib/rules/no-missing-component-display-name.js)

## Rule Details

When a component is wrapped with `memo` or `forwardRef`, anonymous functions do not provide a useful `displayName` for DevTools. This rule requires a `displayName` assignment for anonymous memo/forwardRef components.

### ❌ Incorrect

```javascript
const App = React.memo(() => <div />)

const Button = React.forwardRef(() => <button />)
```

### ✅ Correct

```javascript
const App = React.memo(function App() {
  return <div />
})

const Button = React.forwardRef(function Button(props, ref) {
  return <button ref={ref} />
})

const Card = React.memo(() => <div />)
Card.displayName = 'Card'
```

## Options

This rule has no configuration options.
