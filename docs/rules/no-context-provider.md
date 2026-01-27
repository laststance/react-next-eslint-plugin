# no-context-provider

This rule is imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.

🔧 [Rule Source](../../lib/rules/no-context-provider.js)

## Rule Details

In React 19, you can render `<Context>` as a provider instead of `<Context.Provider>`. This rule flags `<Context.Provider>` usage for migration.

### ❌ Incorrect

```javascript
const App = () => <ThemeContext.Provider value={value} />
```

### ✅ Correct

```javascript
const App = () => <ThemeContext value={value} />
```

## Options

This rule uses `settings['react-x'].version` to decide whether React 19 behavior applies.

## When Not To Use It

Do not enable this rule if your project targets React versions earlier than 19.
