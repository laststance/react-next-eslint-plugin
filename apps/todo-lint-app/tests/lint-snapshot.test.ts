import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const ANSI_ESCAPE_SEQUENCE_PATTERN = /\u001b\[[0-9;]*m/g

describe('ESLint integration snapshot', () => {
  it('captures plugin warnings for the demo app', async () => {
    const eslint = new ESLint({ cwd: projectRoot })
    const results = await eslint.lintFiles(['src'])
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

    expect(normalizedOutput).toMatchSnapshot()
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
