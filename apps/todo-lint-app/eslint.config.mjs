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
      'laststance/no-forward-ref': 'warn',
      'laststance/no-context-provider': 'warn',
      'laststance/no-missing-key': 'warn',
      'laststance/no-duplicate-key': 'warn',
      'laststance/no-missing-component-display-name': 'warn',
      'laststance/no-nested-component-definitions': 'warn',
      'laststance/no-missing-button-type': 'warn',
      'laststance/no-deopt-use-callback': 'warn',
      'laststance/no-deopt-use-memo': 'warn',
      'laststance/no-direct-use-effect': 'warn',
      'laststance/no-set-state-prop-drilling': ['warn', { depth: 1 }],
      'laststance/prefer-usecallback-might-work': 'warn',
      'laststance/prefer-usecallback-for-memoized-component': 'warn',
      'laststance/prefer-usememo-for-memoized-component': 'warn',
      'laststance/prefer-usememo-might-work': 'warn',
      'laststance/prefer-stable-context-value': 'warn',
    },
  },
])

export default eslintConfig
