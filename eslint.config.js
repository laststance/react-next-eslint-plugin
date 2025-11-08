import { defineConfig } from 'eslint/config'
import js from '@eslint/js'

export default defineConfig([
  // Global ignores
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.serena/**'],
  },

  // Recommended base configuration
  js.configs.recommended,

  // Main configuration for all JavaScript files
  {
    files: ['**/*.js'],
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
    },
  },
])
