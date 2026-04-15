# no-jsx-iife

🔧 [Rule Source](../../lib/rules/no-jsx-iife.js)

## Rule Details

This rule disallows immediately invoked function expressions inside JSX.
Move the computation outside JSX, then reference the resulting value in the template.

### ❌ Incorrect

```jsx
// Inline IIFE inside JSX — harder to read and re-evaluates on every render.
<div>{(() => 'x')()}</div>

// Wrapping a call in an IIFE hides the real computation behind an extra closure.
<Button label={(() => computeLabel())()} />
```

### ✅ Correct

```jsx
// Extract the value once outside JSX so the template only references it.
const label = computeLabel()

<div>{label}</div>

<Button label={label} />
```

## Options

This rule has no options.
