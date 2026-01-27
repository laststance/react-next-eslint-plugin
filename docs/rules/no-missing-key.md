# no-missing-key

This rule is imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.

🔧 [Rule Source](../../lib/rules/no-missing-key.js)

## Rule Details

When rendering lists, each element needs a stable `key` prop. This rule flags list items without a `key` and discourages fragment shorthand (`<>...</>`) in list contexts because it cannot carry a key.

### ❌ Incorrect

```javascript
items.map((item) => <Item />)

[<Item />]

items.map((item) => <>{item}</>)
```

### ✅ Correct

```javascript
items.map((item) => <Item key={item.id} />)

[<Item key="a" />]

items.map((item) => <React.Fragment key={item.id}>{item}</React.Fragment>)
```

## Options

This rule has no configuration options.
