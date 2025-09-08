# no-jsx-without-return

> Disallow JSX elements not returned or assigned

## Rule Details

This rule aims to prevent JSX elements that are not properly returned or assigned, which typically indicates a missing `return` statement or improper JSX usage in React components.

JSX elements should either be:

- Returned from a function
- Assigned to a variable
- Wrapped in a block statement

## Examples

### ❌ Incorrect

```javascript
function Component() {
  // JSX expression statement without return
  ;<div>Hello World</div>
}

function Component() {
  // JSX fragment without return
  ;<>Hello World</>
}

function Component() {
  // JSX in if statement without return or block
  if (condition) <div>Hello</div>
}

function Component() {
  if (condition) {
    return <div>Hello</div>
  } else <div>Goodbye</div> // Missing return or block
}
```

### ✅ Correct

```javascript
function Component() {
  // JSX returned from function
  return <div>Hello World</div>
}

function Component() {
  // JSX assigned to variable
  const element = <div>Hello World</div>
  return element
}

function Component() {
  // JSX fragment returned
  return <>Hello World</>
}

function Component() {
  // JSX in if statement with return
  if (condition) {
    return <div>Hello</div>
  }
}

function Component() {
  // JSX in if statement wrapped in block
  if (condition) {
    const element = <div>Hello</div>
    doSomething(element)
    return element
  }
}

function Component() {
  // Proper if-else with returns
  if (condition) {
    return <div>Hello</div>
  } else {
    return <div>Goodbye</div>
  }
}
```

## When Not To Use It

This rule should not be disabled in React projects as standalone JSX expressions are almost always a bug indicating missing return statements. However, you might want to disable it if you're using JSX in non-React contexts where standalone JSX expressions are intentional.

## Further Reading

- [React JSX Documentation](https://react.dev/learn/writing-markup-with-jsx)
- [ESLint Rule Development Guide](https://eslint.org/docs/developer-guide/working-with-rules)
