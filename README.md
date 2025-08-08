# @laststance/react-next-eslint-plugin

ESLint plugin for React and Next.js projects with rules to improve code quality and catch common mistakes.

## Installation

```bash
npm install --save-dev @laststance/react-next-eslint-plugin
```

```bash
yarn add --dev @laststance/react-next-eslint-plugin
```

```bash
pnpm add --save-dev @laststance/react-next-eslint-plugin
```

## Usage

### Flat Config (ESLint 9.0+)

```javascript
import lastStancePlugin from '@laststance/react-next-eslint-plugin';

export default [
  {
    plugins: {
      'laststance': lastStancePlugin,
    },
    rules: {
      'laststance/no-jsx-without-return': 'error',
    },
  },
];
```

### Using Recommended Configuration

```javascript
import lastStancePlugin from '@laststance/react-next-eslint-plugin';

export default [
  ...lastStancePlugin.configs.recommended,
];
```

## Rules

<!-- begin auto-generated rules list -->

| Rule | Description | Recommended |
| ---- | ----------- | ----------- |
| [no-jsx-without-return](docs/rules/no-jsx-without-return.md) | Disallow JSX elements not returned or assigned | ✅ |

<!-- end auto-generated rules list -->

## Rule Details

### `no-jsx-without-return`

This rule prevents JSX elements that are not properly returned or assigned, which typically indicates a missing `return` statement.

**❌ Incorrect**
```javascript
function Component() {
  <div>Hello World</div>; // Missing return statement
}
```

**✅ Correct**
```javascript
function Component() {
  return <div>Hello World</div>;
}
```

## Configuration

### Recommended Configuration

The recommended configuration enables the `no-jsx-without-return` rule with error level.

```javascript
{
  "laststance/no-jsx-without-return": "error"
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [laststance](https://github.com/laststance)