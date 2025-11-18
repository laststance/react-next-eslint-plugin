import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))

describe('ESLint integration snapshot', () => {
  it('captures plugin warnings for the demo app', async () => {
    const eslint = new ESLint({ cwd: projectRoot })
    const results = await eslint.lintFiles(['src'])
    const formatter = await eslint.loadFormatter('stylish')
    const output = formatter.format(results)

    expect(output).toMatchSnapshot()
  })
})
