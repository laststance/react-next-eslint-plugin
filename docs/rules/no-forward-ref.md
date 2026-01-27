# no-forward-ref

This rule is imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.

🔧 [Rule Source](../../lib/rules/no-forward-ref.js)

## Rule Details

In React 19, `forwardRef` is no longer required for function components. This rule flags `forwardRef` usage so you can pass `ref` as a regular prop instead.

### ❌ Incorrect

```javascript
const Button = React.forwardRef((props, ref) => {
  return <button ref={ref} />
})
```

### ✅ Correct

```javascript
const Button = ({ ref }) => {
  return <button ref={ref} />
}
```

## Options

This rule uses `settings['react-x'].version` to decide whether React 19 behavior applies.

## When Not To Use It

Do not enable this rule if your project targets React versions earlier than 19.
