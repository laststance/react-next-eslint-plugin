import { ESLint, type LintResult } from 'eslint'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import laststancePlugin from '@laststance/react-next-eslint-plugin'

export const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const ANSI_ESCAPE_SEQUENCE_PATTERN = /\u001b\[[0-9;]*m/g
const ESLINT_VERSION = ESLint.version ?? '0.0.0'
export const ESLINT_MAJOR_VERSION = ESLINT_VERSION.split('.')[0] ?? 'unknown'
export const ESLINT_V10_MAJOR = '10'
export const APP_SOURCE_GLOB = 'src'
export const V10_COMPAT_FIXTURE_GLOB = 'tests/fixtures/eslint-v10'
export const V10_COMPAT_FIXTURE_FILE_PATH = path.join(
  projectRoot,
  'tests/fixtures/eslint-v10/page.jsx',
)
export const SNAPSHOT_TEST_NAME = `captures plugin warnings for the demo app (eslint v${ESLINT_MAJOR_VERSION})`
export const SNAPSHOT_DIRECTORY = path.join(
  projectRoot,
  'tests',
  '__snapshots__',
)
export const SNAPSHOT_FILE_PATH = path.join(
  SNAPSHOT_DIRECTORY,
  `lint-snapshot.eslint-v${ESLINT_MAJOR_VERSION}.snap`,
)
export const V10_COMPAT_RULES = {
  'laststance/no-forward-ref': 'warn',
  'laststance/no-context-provider': 'warn',
  'laststance/jsx-no-useless-fragment': 'warn',
  'laststance/no-jsx-iife': 'warn',
  'laststance/no-missing-button-type': 'warn',
  'laststance/no-direct-use-effect': 'warn',
  'laststance/prefer-stable-context-value': 'warn',
}

/**
 * Removes ANSI escape sequences from terminal output.
 * @param value - The text to sanitize.
 * @returns
 * - When ANSI sequences exist: cleaned text without color/format codes
 * - When none exist: original text
 * @example
 * stripAnsiSequences('\u001b[31mred\u001b[0m') // => 'red'
 */
export function stripAnsiSequences(value: string) {
  return value.replace(ANSI_ESCAPE_SEQUENCE_PATTERN, '')
}

/**
 * Creates an ESLint instance for the currently installed major version.
 * @returns
 * - ESLint v9: project-level config linting `src/`
 * - ESLint v10: compatibility config linting the `tests/fixtures/eslint-v10` JSX fixture set
 * @example
 * createEslintForCurrentMajor() // => ESLint instance bound to current major
 */
export function createEslintForCurrentMajor() {
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
export function getLintTargets() {
  if (ESLINT_MAJOR_VERSION === ESLINT_V10_MAJOR) {
    return [V10_COMPAT_FIXTURE_GLOB]
  }
  return [APP_SOURCE_GLOB]
}

/**
 * Lints the current major-version targets using the shared ESLint configuration.
 * @returns
 * - `eslint`: the ESLint instance used for linting
 * - `results`: lint results for the current target set
 * @example
 * const { results } = await lintCurrentTargets()
 */
export async function lintCurrentTargets(): Promise<{
  eslint: ESLint
  results: LintResult[]
}> {
  const eslint = createEslintForCurrentMajor()
  const results = await eslint.lintFiles(getLintTargets())

  return { eslint, results }
}

/**
 * Formats lint results and normalizes absolute paths and ANSI sequences.
 * @param eslint - ESLint instance used to produce the formatter.
 * @param results - Lint results to format.
 * @returns
 * - Formatted output with project-root placeholders and no ANSI codes
 * @example
 * const output = await createNormalizedLintOutput(eslint, results)
 */
export async function createNormalizedLintOutput(
  eslint: ESLint,
  results: LintResult[],
) {
  const formatter = await eslint.loadFormatter('stylish')
  const output = formatter.format(results)
  const projectRootNoTrailingSep = projectRoot.endsWith(path.sep)
    ? projectRoot.slice(0, -path.sep.length)
    : projectRoot

  return stripAnsiSequences(
    output
      .split(`${projectRootNoTrailingSep}${path.sep}`)
      .join('<projectRoot>/')
      .split(projectRootNoTrailingSep)
      .join('<projectRoot>'),
  )
}
