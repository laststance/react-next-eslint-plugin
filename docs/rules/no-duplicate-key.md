# no-duplicate-key

This rule is imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.

🔧 [Rule Source](../../lib/rules/no-duplicate-key.js)

## Rule Details

Duplicate `key` values among sibling elements cause React to mis-handle list updates. This rule warns when sibling keys are duplicated.

### ❌ Incorrect

```javascript
return [
  <Item key="a" />,
  <Item key="a" />,
]
```

### ✅ Correct

```javascript
return [
  <Item key="a" />,
  <Item key="b" />,
]
```

## Options

This rule has no configuration options.
