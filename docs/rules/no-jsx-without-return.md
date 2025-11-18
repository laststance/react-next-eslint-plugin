# no-jsx-without-return

Disallow JSX elements not returned or assigned.

🔧 [Rule Source](../../lib/rules/no-jsx-without-return.js)

## Rule Details

This rule prevents JSX elements that are not properly returned or assigned, which typically indicates a missing `return` statement. This is a common mistake that can lead to silent errors where components render nothing without any indication of what went wrong.

The rule specifically catches:

- Standalone JSX expressions that are neither returned nor assigned
- JSX in if/else statements without proper return handling or block wrapping
- JSX fragments that are written but not utilized

### Why This Rule Exists

When JSX is written but not returned or assigned, it serves no purpose and indicates a likely coding error:

1. **Silent Failures**: The component will render nothing without any error message
2. **Debugging Difficulty**: Missing return statements can be hard to spot in larger components
3. **Intent Clarity**: If JSX is written, it should be clear what happens to it

## Examples

### ❌ Incorrect

```javascript
// Standalone JSX expression - missing return
function Component() {
  ;<div>Hello World</div>
}

// JSX fragment without return
function Component() {
  ;<>Hello</>
}

// JSX in if statement without return or block wrapping
function Component() {
  if (condition) <div>Hello</div>
}

// JSX in else statement without return or block wrapping
function Component() {
  if (condition) {
    return <div>Hello</div>
  } else <div>Goodbye</div>
}

// Multiple standalone JSX expressions
function Component() {
  ;<div>Hello</div>
  ;<div>World</div>
}

// JSX inside a block still needs a return statement
function Component() {
  if (condition) {
    ;<div>Hi</div>
  }
}

// Else-if branches can't leave bare JSX either
function Component() {
  if (primary) {
    return <div />
  } else if (secondary) <>Fallback</>
}
```

### ✅ Correct

```javascript
// JSX returned from function
function Component() {
  return <div>Hello World</div>
}

// JSX assigned to variable
function Component() {
  const element = <div>Hello</div>
  return element
}

// JSX fragment returned
function Component() {
  return <>Hello</>
}

// JSX in if statement with return
function Component() {
  if (condition) {
    return <div>Hello</div>
  }
}

// JSX in if statement wrapped in block
function Component() {
  if (condition) {
    const element = <div>Hello</div>
    return element
  }
}

// JSX in both if and else with proper returns
function Component() {
  if (condition) {
    return <div>Hello</div>
  } else {
    return <div>Goodbye</div>
  }
}

// Nested if-else with proper returns
function Component() {
  if (condition1) {
    return <div>Hello</div>
  } else if (condition2) {
    return <div>World</div>
  }
}

// Non-JSX expressions are allowed
function Component() {
  console.log('Hello')
  return <div>Hello</div>
}
```

## Options

This rule has no configuration options.

## When Not To Use It

This rule should generally always be enabled for React/JSX codebases, as JSX without return or assignment is almost always a bug. However, you might disable it if:

- You have non-React JSX code with different semantics
- You're in a gradual migration process and want to address these issues later
- You have code generation tools that intentionally create unused JSX for some reason

## Further Reading

- [React Components and Props](https://react.dev/learn/your-first-component)
- [Conditional Rendering in React](https://react.dev/learn/conditional-rendering)
- [ESLint: no-unused-expressions](https://eslint.org/docs/latest/rules/no-unused-expressions)
