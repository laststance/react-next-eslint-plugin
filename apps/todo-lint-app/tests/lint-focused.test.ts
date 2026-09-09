import { ESLint, Linter } from 'eslint'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'
import { describe, expect, test } from 'vitest'
import laststancePlugin from '@laststance/react-next-eslint-plugin'
import {
  createEslintForCurrentMajor,
  ESLINT_MAJOR_VERSION,
  ESLINT_V10_MAJOR,
  V10_COMPAT_FIXTURE_FILE_PATH,
  V10_COMPAT_FIXTURE_GLOB,
} from './eslint-e2e-helpers'

const EXPECTED_RESULT_COUNT = 1
const EXPECTED_MESSAGE_COUNT = 1
const describeWhenEslintV10 =
  ESLINT_MAJOR_VERSION === ESLINT_V10_MAJOR ? describe : describe.skip
const REPRESENTATIVE_RULE_ASSERTIONS = [
  {
    ruleId: 'laststance/no-react-context',
    messageFragment: 'Do not use React.createContext.',
  },
  {
    ruleId: 'laststance/no-prop-drilling',
    messageFragment: 'through two or more component levels',
  },
  {
    ruleId: 'laststance/no-jsx-iife',
    messageFragment:
      'Do not use immediately invoked function expressions inside JSX.',
  },
  {
    ruleId: 'laststance/no-missing-button-type',
    messageFragment: 'Missing an explicit type attribute for button.',
  },
  {
    ruleId: 'laststance/jsx-no-useless-fragment',
    messageFragment: 'A fragment placed inside a host component is useless',
  },
] as const

describeWhenEslintV10('ESLint focused integration assertions', () => {
  test('reports representative compatibility rules exactly once in the v10 fixture', async () => {
    const eslint = createEslintForCurrentMajor()
    const results = await eslint.lintFiles([V10_COMPAT_FIXTURE_GLOB])

    expect(results).toHaveLength(EXPECTED_RESULT_COUNT)
    expect(results[0]?.filePath).toBe(V10_COMPAT_FIXTURE_FILE_PATH)

    for (const ruleAssertion of REPRESENTATIVE_RULE_ASSERTIONS) {
      const matchingMessages =
        results[0]?.messages.filter(
          (message) => message.ruleId === ruleAssertion.ruleId,
        ) ?? []

      expect(matchingMessages).toHaveLength(EXPECTED_MESSAGE_COUNT)
      expect(matchingMessages[0]?.message).toContain(
        ruleAssertion.messageFragment,
      )
    }
  })
})

describe('no-react-context TypeScript compatibility', () => {
  test('reports context APIs accessed through TypeScript import-equals syntax', () => {
    // Arrange
    const linter = new Linter()
    const code = `
      import React = require('react')

      React.useContext(null)
    `

    // Act
    const messages = linter.verify(
      code,
      [
        {
          files: ['**/*.ts'],
          languageOptions: {
            parser: tseslint.parser,
            parserOptions: { sourceType: 'module' },
          },
          plugins: { laststance: laststancePlugin },
          rules: { 'laststance/no-react-context': 'error' },
        },
      ],
      { filename: 'context.ts' },
    )

    // Assert
    expect(messages).toHaveLength(1)
    expect(messages[0]?.ruleId).toBe('laststance/no-react-context')
    expect(messages[0]?.message).toContain('Do not use React.useContext.')
  })
})

describe('single-use Hook placement in a typed consumer', () => {
  test('identifies the owner through the public plugin and accepts a colocated effect Hook', async () => {
    // Arrange
    const fixtureDirectory = fileURLToPath(
      new URL('./fixtures/hook-ownership/', import.meta.url),
    )
    const eslint = new ESLint({
      cwd: fixtureDirectory,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ['**/*.{ts,tsx}'],
          languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
              project: './tsconfig.json',
              tsconfigRootDir: fixtureDirectory,
            },
          },
          plugins: { laststance: laststancePlugin },
          rules: {
            'laststance/no-single-use-hook-file': 'error',
            'laststance/no-direct-use-effect': 'error',
          },
        },
      ],
    })

    // Act
    const results = await eslint.lintFiles(['*.ts', '*.tsx'])

    // Assert
    expect(results).toHaveLength(3)
    const messages = results.flatMap((result) => result.messages)
    expect(messages).toHaveLength(1)
    expect(messages[0]?.messageId).toBe('colocateWithComponent')
    expect(messages[0]?.message).toContain('"CartPanel.tsx"')
    expect(messages[0]?.severity).toBe(2)
  })
})
