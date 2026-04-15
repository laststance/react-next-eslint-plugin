# no-jsx-iife

🔧 [Rule Source](../../lib/rules/no-jsx-iife.js)

## Rule Details

This rule disallows immediately invoked function expressions inside JSX.
Move the computation outside JSX, then reference the resulting value in the template.

### ❌ Incorrect

```jsx
<div>{(() => 'x')()}</div>

<Button label={(() => computeLabel())()} />
```

### ✅ Correct

```jsx
const label = computeLabel()

<div>{label}</div>

<Button label={label} />
```

## Options

This rule has no options.
