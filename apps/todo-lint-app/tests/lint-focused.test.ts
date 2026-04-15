import { describe, expect, it } from 'vitest'
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
  it('reports representative compatibility rules exactly once in the v10 fixture', async () => {
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
