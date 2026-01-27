# no-nested-component-definitions

This rule is imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.

🔧 [Rule Source](../../lib/rules/no-nested-component-definitions.js)

## Rule Details

Defining components inside other components recreates them on every render and can reset state. This rule warns when components are defined inside other components.

### ❌ Incorrect

```javascript
function Parent() {
  function Child() {
    return <div />
  }

  return <Child />
}
```

### ✅ Correct

```javascript
function Child() {
  return <div />
}

function Parent() {
  return <Child />
}
```

## Options

This rule has no configuration options.
