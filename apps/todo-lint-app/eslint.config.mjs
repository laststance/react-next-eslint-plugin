import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import laststancePlugin from '@laststance/react-next-eslint-plugin'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      laststance: laststancePlugin,
    },
    rules: {
      'laststance/no-deopt-use-callback': 'warn',
      'laststance/no-deopt-use-memo': 'warn',
      'laststance/usecallback-might-work': 'warn',
      'laststance/usecallback-for-memoized-component': 'warn',
      'laststance/usememo-for-memoized-component': 'warn',
      'laststance/usememo-might-work': 'warn',
      'laststance/prefer-stable-context-value': 'warn',
      'laststance/no-unstable-classname-prop': 'warn',
    },
  },
])

export default eslintConfig
