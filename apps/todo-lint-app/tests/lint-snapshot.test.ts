import { describe, expect, it } from 'vitest'
import {
  createNormalizedLintOutput,
  lintCurrentTargets,
  SNAPSHOT_FILE_PATH,
  SNAPSHOT_TEST_NAME,
} from './eslint-e2e-helpers'

describe('ESLint integration snapshot', () => {
  it(SNAPSHOT_TEST_NAME, async () => {
    const { eslint, results } = await lintCurrentTargets()
    const normalizedOutput = await createNormalizedLintOutput(eslint, results)

    await expect(normalizedOutput).toMatchFileSnapshot(SNAPSHOT_FILE_PATH)
  })
})
