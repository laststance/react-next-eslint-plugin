import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import laststancePlugin from '@laststance/react-next-eslint-plugin'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const ANSI_ESCAPE_SEQUENCE_PATTERN = /\u001b\[[0-9;]*m/g
const ESLINT_VERSION = ESLint.version ?? '0.0.0'
const ESLINT_MAJOR_VERSION = ESLINT_VERSION.split('.')[0] ?? 'unknown'
const ESLINT_V10_MAJOR = '10'
const APP_SOURCE_GLOB = 'src'
const V10_COMPAT_FIXTURE_GLOB = 'tests/fixtures/eslint-v10'
const SNAPSHOT_TEST_NAME = `captures plugin warnings for the demo app (eslint v${ESLINT_MAJOR_VERSION})`
const SNAPSHOT_DIRECTORY = path.join(projectRoot, 'tests', '__snapshots__')
const SNAPSHOT_FILE_PATH = path.join(
  SNAPSHOT_DIRECTORY,
  `lint-snapshot.eslint-v${ESLINT_MAJOR_VERSION}.snap`,
)
const V10_COMPAT_RULES = {
  'laststance/no-forward-ref': 'warn',
  'laststance/no-context-provider': 'warn',
  'laststance/no-missing-button-type': 'warn',
  'laststance/no-direct-use-effect': 'warn',
  'laststance/prefer-stable-context-value': 'warn',
}

describe('ESLint integration snapshot', () => {
  it(SNAPSHOT_TEST_NAME, async () => {
    const eslint = createEslintForCurrentMajor()
    const results = await eslint.lintFiles(getLintTargets())
    const formatter = await eslint.loadFormatter('stylish')
    const output = formatter.format(results)
    const projectRootNoTrailingSep = projectRoot.endsWith(path.sep)
      ? projectRoot.slice(0, -path.sep.length)
      : projectRoot

    const normalizedOutput = stripAnsiSequences(
      output
        .split(`${projectRootNoTrailingSep}${path.sep}`)
        .join('<projectRoot>/')
        .split(projectRootNoTrailingSep)
        .join('<projectRoot>'),
    )

    await expect(normalizedOutput).toMatchFileSnapshot(SNAPSHOT_FILE_PATH)
  })
})

/**
 * Removes ANSI escape sequences from terminal output.
 * @param value - The text to sanitize.
 * @returns
 * - When ANSI sequences exist: cleaned text without color/format codes
 * - When none exist: original text
 * @example
 * stripAnsiSequences('\u001b[31mred\u001b[0m') // => 'red'
 */
function stripAnsiSequences(value: string) {
  return value.replace(ANSI_ESCAPE_SEQUENCE_PATTERN, '')
}

/**
 * Creates an ESLint instance for the currently installed major version.
 * @returns
 * - ESLint v9: project-level config (Next.js + plugin) linting `src/`
 * - ESLint v10: compatibility config linting JS fixtures only
 * @example
 * createEslintForCurrentMajor() // => ESLint instance bound to current major
 */
function createEslintForCurrentMajor() {
  if (ESLINT_MAJOR_VERSION === ESLINT_V10_MAJOR) {
    return new ESLint({
      cwd: projectRoot,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ['tests/fixtures/eslint-v10/**/*.jsx'],
          languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
              ecmaFeatures: {
                jsx: true,
              },
            },
          },
          plugins: {
            laststance: laststancePlugin,
          },
          rules: V10_COMPAT_RULES,
        },
      ],
    })
  }

  return new ESLint({ cwd: projectRoot })
}

/**
 * Returns lint target globs for the current ESLint major version.
 * @returns
 * - ESLint v9: `['src']`
 * - ESLint v10: `['tests/fixtures/eslint-v10']`
 * @example
 * getLintTargets() // => ['src']
 */
function getLintTargets() {
  if (ESLINT_MAJOR_VERSION === ESLINT_V10_MAJOR) {
    return [V10_COMPAT_FIXTURE_GLOB]
  }
  return [APP_SOURCE_GLOB]
}
