# jsx-no-useless-fragment

This rule is imported and adapted from https://github.com/Rel1cx/eslint-react.

🔧 [Rule Source](../../lib/rules/jsx-no-useless-fragment.js)

## Rule Details

This rule disallows fragments that do not add structure and can be safely removed.
It also reports fragment wrappers nested directly in host elements like `div` and `p`.

### ❌ Incorrect

```jsx
<></>

<><Foo /></>

<p><>hello</></p>

<div>
  <Fragment>text</Fragment>
</div>
```

### ✅ Correct

```jsx
<>
  <Foo />
  <Bar />
</>

{value}

<SomeComponent>
  <>
    <Foo />
    <Bar />
  </>
</SomeComponent>

<Fragment key={item.id}>{item.value}</Fragment>
```

## Options

```js
{
  allowEmptyFragment: false, // default
  allowExpressions: true,    // default
}
```

- `allowEmptyFragment`: when `true`, allows `<></>`.
- `allowExpressions`: when `true`, allows fragments with a single expression child such as `<>{value}</>`.
