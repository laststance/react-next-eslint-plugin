# all-memo

Enforce wrapping React function components with `React.memo`.

🔧 [Rule Source](../../lib/rules/all-memo.js)

## Rule Details

This rule enforces that all React function components (PascalCase functions returning JSX) are wrapped with `React.memo` to prevent unnecessary re-renders and improve performance.

`React.memo` is a higher-order component that memoizes the result of a component render. When a component is wrapped with `memo`, React will skip re-rendering the component if its props haven't changed, which can significantly improve performance in larger applications.

### Why This Rule Exists

1. **Performance Optimization**: Prevents unnecessary re-renders when parent components update
2. **Consistent Pattern**: Establishes a consistent approach to component optimization across the codebase
3. **Proactive Optimization**: Encourages performance-conscious development from the start
4. **Referential Equality**: Works in conjunction with `useCallback` and `useMemo` for prop stability

### How It Works

The rule identifies React components by:

- PascalCase naming convention (e.g., `UserCard`, `ProductItem`)
- Functions that return JSX elements or fragments
- Both function declarations and arrow function expressions

It then verifies that these components are wrapped with:

- `memo(...)` (when imported from React)
- `React.memo(...)`
- Export statements like `export default memo(Component)`

## Ignored Files

This rule does not report in the following cases:

- Next.js `layout.tsx` (Server Components)
- Storybook stories that include `.stories.` in the filename

## Examples

### ❌ Incorrect

```javascript
// Function component without memo wrapping
const UserCard = ({ name, email }) => {
  return (
    <div>
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  )
}

// Function declaration without memo
function ProductItem({ title, price }) {
  return (
    <div>
      <h4>{title}</h4>
      <span>${price}</span>
    </div>
  )
}

// Named function expression without memo
const Header = function Header() {
  return <header>My App</header>
}

// Multiple components - all need memo
const ComponentA = () => <div>A</div>
const ComponentB = () => <div>B</div>

// Named exports also need memo wrapping
export const Sidebar = () => <aside>Sidebar</aside>

// Calling React.memo without reassigning keeps the component un-memoized
const InlineNotice = () => <div>Heads up</div>
React.memo(InlineNotice)
export default InlineNotice
```

### ✅ Correct

```javascript
import React, { memo } from 'react';

// Wrapped with memo (preferred style)
const UserCard = memo(({ name, email }) => {
  return (
    <div>
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  );
});

// Using React.memo
const ProductItem = React.memo(function ProductItem({ title, price }) {
  return (
    <div>
      <h4>{title}</h4>
      <span>${price}</span>
    </div>
  );
});

// Function declaration wrapped with memo
function Header() {
  return <header>My App</header>;
}
const MemoizedHeader = memo(Header);

// Export default with memo
function Footer() {
  return <footer>Footer</footer>;
}
export default memo(Footer);

// Assignment style wrapping
function BaseComponent({ children }) {
  return <div>{children}</div>;
}
BaseComponent = memo(BaseComponent);

// Inline export with memo is allowed
export default memo(function Banner() {
  return <div>Banner</div>;
});

// Memoized component can be re-exported under a new name
const BaseCard = () => <div>Base</div>;
const MemoCard = React.memo(BaseCard);
export { MemoCard as Card };

// Non-component functions are ignored (camelCase, non-JSX return)
const helper = () => 1;
const processData = (data) => data.map(x => x * 2);

// PascalCase but not returning JSX - ignored
const DataProcessor = () => ({ result: 42 });
```

## Options

This rule has no configuration options. All PascalCase functions returning JSX must be wrapped with `memo`.

## When Not To Use It

You might want to disable this rule if:

1. **Micro-optimizations aren't needed**: Your application is small and performance is not a concern
2. **Props change frequently**: Components that always receive different props won't benefit from memo
3. **Children as props**: Components that primarily receive `children` prop may re-render anyway
4. **Premature optimization**: You prefer to add `memo` only when profiling shows it's necessary
5. **Alternative optimization strategies**: You're using different performance optimization approaches

### Important Considerations

While `React.memo` can improve performance, it's not free:

- It adds a prop comparison overhead on every render
- It may prevent optimization in some cases if props include complex objects
- Over-memoization can sometimes hurt more than help

For best results with this rule:

- Use `useCallback` for function props
- Use `useMemo` for object/array props
- Keep prop values stable when possible
- Profile your application to verify memo is helping

## Further Reading

- [React.memo API Reference](https://react.dev/reference/react/memo)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback)
- [Before You memo()](https://overreacted.io/before-you-memo/)
