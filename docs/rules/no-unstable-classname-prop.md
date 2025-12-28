# no-unstable-classname-prop

Avoid unstable `className` expressions that change identity every render.

🔧 [Rule Source](../../lib/rules/no-unstable-classname-prop.js)

## Rule Details

This rule prevents unstable `className` expressions that create new references on every render, which can cause performance issues in memoized components and unnecessary DOM updates.

The rule flags:

- **Object literals**: `className={{ active: isActive }}`
- **Array literals**: `className={['btn', isActive && 'active']}`
- **Function calls**: `className={buildClassName('btn', { active })}` (excluding `cn`, `cva`, `clsx`, `classnames`)
- **String concatenation**: `className={'btn ' + theme}`

These expressions create new values on every render, breaking referential equality and defeating React's optimization mechanisms.

### Why This Rule Exists

1. **Memoization Breakage**: Wrapped components with `React.memo` will re-render unnecessarily
2. **Performance Impact**: New className values trigger prop comparison overhead
3. **DOM Reconciliation**: May cause unnecessary DOM attribute updates
4. **Readability**: Simpler, stable className patterns are easier to understand
5. **Maintenance**: Memoized className logic is centralized and explicit

### What's Stable vs Unstable

**Stable** (allowed):

- String literals: `"btn primary"`
- Template literals: `` `btn ${theme}` ``
- Variables: `{buttonClass}`

**Unstable** (flagged):

- New objects/arrays each render
- Function calls creating new strings
- Binary concatenation operations

## Examples

### ❌ Incorrect

```javascript
function Component({ isActive, theme }) {
  return (
    <div>
      {/* Object literal - new object every render */}
      <button className={{ active: isActive, theme }}>Button 1</button>

      {/* Array literal - new array every render */}
      <button className={['btn', isActive && 'active']}>Button 2</button>

      {/* Function call - executes every render */}
      <button className={buildClassName('btn', { active: isActive })}>
        Button 3
      </button>

      {/* String concatenation - new string every render */}
      <button className={'btn ' + theme}>Button 4</button>

      {/* String concatenation that references props is also unstable */}
      <button className={'btn-' + theme}>Button 5</button>

      {/* Custom helpers are still function calls */}
      <button className={buildClassName('btn', { active: isActive })}>
        Button 6
      </button>

      {/* Multiple violations in one component */}
      <div>
        <span className={getClassNames(props)}>Span</span>
        <p className={'text-' + size}>Paragraph</p>
      </div>
    </div>
  )
}
```

### ✅ Correct

```javascript
import { useMemo } from 'react'
import classNames from 'classnames'

function Component({ isActive, theme }) {
  // Option 1: Memoize complex className logic
  const buttonClassName = useMemo(
    () => classNames('btn', { active: isActive }, theme),
    [isActive, theme],
  )

  // Option 1b: Memoize clsx usage once and reuse it
  const memoizedClsx = useMemo(
    () => classNames('btn', { active: isActive }),
    [isActive],
  )

  // Option 2: Memoize for each variant
  const primaryClass = useMemo(
    () => classNames('btn', 'primary', { active: isActive }),
    [isActive],
  )

  const secondaryClass = useMemo(() => `btn secondary ${theme}`, [theme])

  return (
    <div>
      {/* Static strings are fine */}
      <button className="btn primary">Static Button</button>

      {/* Template literals are stable references */}
      <button className={`btn ${theme}`}>Template Button</button>

      {/* Memoized complex logic */}
      <button className={buttonClassName}>Complex Button</button>

      {/* Variable holding memoized value */}
      <button className={primaryClass}>Primary Button</button>

      {/* clsx memoized once is stable */}
      <button className={memoizedClsx}>Memoized clsx</button>

      {/* Single variable is stable */}
      <button className={secondaryClass}>Secondary Button</button>
    </div>
  )
}

// Option 3: Compute className outside component (for static variants)
const BUTTON_CLASSES = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  danger: 'btn btn-danger',
}

function StaticButton({ variant = 'primary' }) {
  return <button className={BUTTON_CLASSES[variant]}>Button</button>
}

// Option 4: Extract to custom hook
function useButtonClasses({ variant, size, isActive }) {
  return useMemo(
    () =>
      classNames('btn', `btn-${variant}`, `btn-${size}`, { active: isActive }),
    [variant, size, isActive],
  )
}

function Button({ variant, size, isActive, children }) {
  const className = useButtonClasses({ variant, size, isActive })

  return <button className={className}>{children}</button>
}

// Option 5: Conditional className with stable values
function ConditionalButton({ isPrimary, isDisabled }) {
  // Pre-compute stable strings
  const baseClass = isPrimary ? 'btn btn-primary' : 'btn btn-secondary'
  const disabledClass = isDisabled ? `${baseClass} disabled` : baseClass

  return <button className={disabledClass}>Button</button>
}

// Option 6: For simple cases, template literals are fine
function SimpleButton({ theme, size }) {
  return <button className={`btn btn-${theme} btn-${size}`}>Button</button>
}
```

## Options

This rule has no configuration options. All unstable className expressions are flagged except calls to `cn`, `cva`, `clsx`, and `classnames`.

## When Not To Use It

You might want to disable this rule if:

1. **Simple components**: Your components are never memoized and performance doesn't matter
2. **Static site generation**: All rendering happens at build time
3. **Prototypes**: You're building a quick prototype where optimization is premature
4. **Incremental adoption**: You want to gradually optimize className usage
5. **Alternative solutions**: You're using CSS-in-JS solutions that handle stability differently

### Performance Reality Check

The cost of unstable className props:

- **Memoized components**: Will re-render even if other props are stable
- **Prop comparison**: React compares className on every render
- **DOM updates**: May trigger unnecessary attribute updates (though React optimizes this)

For components that don't use `React.memo`:

- Impact is minimal (just prop comparison overhead)
- Memoization might be overkill for simple cases

### Common Patterns

**CSS Modules** (stable by default):

```javascript
import styles from './Button.module.css'

// CSS module objects are stable
;<button className={styles.button}>Button</button>
```

**Tailwind CSS** (template literals work well):

```javascript
<button className={`px-4 py-2 ${isActive ? 'bg-blue-500' : 'bg-gray-300'}`}>
  Button
</button>
```

**clsx/classnames** (memoize the call):

```javascript
const className = useMemo(() => clsx('btn', { active: isActive }), [isActive])
```

## Further Reading

- [React Reconciliation](https://react.dev/learn/preserving-and-resetting-state)
- [React.memo API Reference](https://react.dev/reference/react/memo)
- [useMemo Hook](https://react.dev/reference/react/useMemo)
- [classnames library](https://github.com/JedWatson/classnames)
- [clsx library](https://github.com/lukeed/clsx)
- [CSS Modules](https://github.com/css-modules/css-modules)
