# no-single-use-hook-file

Require a custom Hook used by exactly one production component to live at module scope in that component's file.

## Rule Details

This opt-in architectural rule keeps component-specific logic visibly attached to its owner. A Hook may still organize a component's implementation and have its own name. A separate module becomes allowed when at least two component implementations actually use it. A generic name, a `shared/` directory, or planned future reuse does not grant an exemption.

## Configuration

Install `@typescript-eslint/parser` and TypeScript `~6.0.3`. TypeScript is an optional peer of the plugin: other rules work without it or with TypeScript 5.x. This rule requires TypeScript `>=6.0.3 <6.1.0`, the parser's typed services, and a complete application TSConfig. It has no options; enable it through flat config:

```js
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import tsParser from '@typescript-eslint/parser'
import laststancePlugin from '@laststance/react-next-eslint-plugin'

export default [
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
      },
    },
    plugins: { laststance: laststancePlugin },
    rules: { 'laststance/no-single-use-hook-file': 'error' },
  },
]
```

The TSConfig directory defines the application boundary. Include every production consumer in that single compiler program, including files not selected by the ESLint command. JavaScript/JSX needs `allowJs`. A dedicated lint TSConfig is acceptable if it preserves application resolution and includes all consumers. Project references and cross-application aggregation are not supported.

Run the complete definition set in CI with `eslint src --no-cache`. ESLint's file cache does not track reverse dependencies: removing a consumer can change a diagnostic in an otherwise unchanged Hook file. Editor diagnostics are advisory until a fresh full lint run. In VS Code, run **ESLint: Restart ESLint Server** after cross-file changes if diagnostics stay stale. [Typed linting and editor updates](https://typescript-eslint.io/troubleshooting/typed-linting/#editor-eslint-reports-become-out-of-date-after-file-changes)

## Examples

### ❌ Incorrect

One component owns the separately defined Hook.

```jsx
// useCart.js
export function useCart() {
  // Component-specific state and effects.
}

// CartPanel.jsx
import { useCart } from './useCart.js'

export function CartPanel() {
  useCart()
  return <div>Cart</div>
}
```

### ✅ Correct

The named Hook remains below its component at module scope.

```jsx
// CartPanel.jsx
export function CartPanel() {
  useCart()
  return <div>Cart</div>
}

function useCart() {
  // Component-specific state and effects.
}
```

Two components use the Hook, so a separate file is also allowed:

```jsx
import { useCart } from './useCart.js'

export function CartPanel() {
  useCart()
  return <div>Cart</div>
}

export function CheckoutPanel() {
  useCart()
  return <div>Checkout</div>
}
```

## What counts as reuse

The rule counts distinct component implementations, including two components in the same file. Repeated calls from one component, repeated renders, parent components, unused imports, type references, and re-export barrels do not add owners.

Ownership follows Hook calls transitively: if `CartPanel` calls `useCart` and `useCart` calls `useSelection`, both Hooks belong in `CartPanel`'s file unless another component also uses them. Sharing the inner Hook does not automatically make the outer Hook shared.

The compiler resolves named/default imports, aliases, static namespace access, re-export chains, and TSConfig paths to their declarations. Custom Hook names follow `^use[A-Z0-9]`. Components use PascalCase names or return JSX. React's `memo` and `forwardRef`, including aliases, preserve the wrapped implementation's identity. Calls in nested callbacks are not attributed to the outer component.

Test/story references do not create production owners. Excluded locations are `__tests__`, `__mocks__`, `.storybook`, and filenames ending in `.test`, `.spec`, `.stories`, or `.story` before their source extension. Production imports into these files remain uncertain production evidence.

## Incomplete analysis and boundaries

An unresolved ownership result never instructs you to move a Hook. The `incompleteAnalysis` diagnostic explains the reference or boundary that prevents a placement decision. Like other diagnostics, it uses your configured severity. It is unnecessary when the sole known owner already shares the Hook's file or two known owners already establish reuse.

Opaque Hook values, dynamic namespace access, CommonJS loads, unrecognized wrappers, and ownership crossing a package boundary can make analysis incomplete. Generated definitions are excluded as placement targets; available generated runtime consumers still count. Other workspace packages are outside the application's placement targets. Public package APIs may have unknown consumers, so their Hook chains are protected from a single-owner conclusion.

Missing typed services, project references, unreadable roots, unparseable runtime source, and detectable missing local runtime dependencies produce configuration errors. Common non-code imports such as CSS, images, fonts, and JSON do not require a runtime source body. Type-only imports and re-exports do not expose runtime Hook values. A mismatched editor/compiler source snapshot produces incomplete analysis. Fix the configuration or source error and rerun a complete lint.

Syntax validation includes external runtime sources present in the Program: malformed external code can hide a local Hook's consumers. Excluding an external definition from placement targets does not make its recovered syntax tree reliable ownership evidence.

The rule cannot prove that an unrelated consumer omitted from the TSConfig does not exist. Supplying a complete closed application is a configuration precondition. An internal `export` alone is not a public API exemption; public package entry metadata and package boundaries carry that meaning.

## Migration and exceptions

Move the Hook below its owning component, preserving its signature and calls. Adjust imports and preserve Next.js `'use client'`/`'use server'` boundaries. Keep exports required by direct tests. Inspect remaining exports before removing an emptied module.

The rule has no options, suggestions, or autofix; `--fix` does not move or delete source files. Use a standard ESLint disable comment with a reason for an intentional exception. It composes with [`no-direct-use-effect`](./no-direct-use-effect.md): extract an effect into a named Hook, then colocate the dedicated Hook.

See the [design and engineering decisions](../design/no-single-use-hook-file.md) for the ownership contract and acceptance criteria.

[Rule source](../../lib/rules/no-single-use-hook-file.js)
