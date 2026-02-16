import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import laststancePlugin from './index.js'

export default defineConfig([
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.serena/**',
      'apps/**',
    ],
  },

  // Recommended base configuration
  js.configs.recommended,

  // Main configuration for all JavaScript files
  {
    files: ['**/*.js'],
    plugins: {
      laststance: laststancePlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Code quality rules
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
      'no-var': 'error',

      // Allow console for debugging
      'no-console': 'off',

      // Consistency rules
      semi: ['warn', 'never'],
      quotes: ['warn', 'single', { avoidEscape: true }],

      // Dogfooding: Use our own plugin rules to validate the plugin works
      // While this codebase doesn't contain React components, enabling these
      // rules serves as:
      // - Living documentation of proper plugin configuration
      // - Validation that the plugin works when applied to a project
      // - Protection against accidental React code without proper patterns
      'laststance/no-jsx-without-return': 'warn',
      'laststance/all-memo': 'warn',
      'laststance/no-use-reducer': 'warn',
      'laststance/no-set-state-prop-drilling': 'warn',
      'laststance/no-deopt-use-callback': 'warn',
      'laststance/prefer-stable-context-value': 'warn',
    },
  },
])
