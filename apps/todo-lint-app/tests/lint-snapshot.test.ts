import { describe, expect, test } from 'vitest'
import {
  createNormalizedLintOutput,
  lintCurrentTargets,
  SNAPSHOT_FILE_PATH,
  SNAPSHOT_TEST_NAME,
} from './eslint-e2e-helpers'

describe('ESLint integration snapshot', () => {
  test(SNAPSHOT_TEST_NAME, async () => {
    const { eslint, results } = await lintCurrentTargets()
    const normalizedOutput = await createNormalizedLintOutput(eslint, results)

    await expect(normalizedOutput).toMatchFileSnapshot(SNAPSHOT_FILE_PATH)
  })
})
