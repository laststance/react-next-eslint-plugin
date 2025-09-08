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
      laststance: lastStancePlugin,
    },
    rules: {
      // Opt-in per rule
      'laststance/no-jsx-without-return': 'error',
      'laststance/all-memo': 'warn',
      'laststance/no-use-effect': 'warn',
      'laststance/no-set-state-prop-drilling': 'warn',
      'laststance/no-deopt-use-callback': 'warn',
      'laststance/prefer-stable-context-value': 'warn',
      'laststance/no-unstable-classname-prop': 'warn',
      'laststance/no-client-fetch-in-server-components': 'error',
    },
  },
];
```

## Rules

These rules are provided by the plugin. Enable only those you need.

- `laststance/no-jsx-without-return`: Disallow JSX elements not returned or assigned
- `laststance/all-memo`: Enforce wrapping React function components with `React.memo`
- `laststance/no-use-effect`: Discourage using `useEffect` directly in components; prefer semantic custom hooks
- `laststance/no-set-state-prop-drilling`: Disallow passing `useState` setters via props; prefer semantic handlers or state management
- `laststance/no-deopt-use-callback`: Flag meaningless `useCallback` usage with intrinsic elements or inline calls
- `laststance/prefer-stable-context-value`: Prefer stable `Context.Provider` values (wrap with `useMemo`/`useCallback`)
- `laststance/no-unstable-classname-prop`: Avoid unstable `className` expressions that change identity every render
- `laststance/no-client-fetch-in-server-components`: Disallow client-only fetch libraries in Next.js Server Components

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

This plugin intentionally does not ship a bundled recommended config. Opt-in the rules that fit your codebase.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [laststance](https://github.com/laststance)