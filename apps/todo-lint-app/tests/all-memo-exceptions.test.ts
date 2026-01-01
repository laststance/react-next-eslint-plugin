import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import laststancePlugin from '@laststance/react-next-eslint-plugin'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const eslint = new ESLint({
  cwd: projectRoot,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ['**/*.{ts,tsx}'],
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
      rules: {
        'laststance/all-memo': 'error',
      },
    },
  ],
})

const EXPECTED_MESSAGE_COUNT = 0
const SAMPLE_COMPONENT_SOURCE = `
  const Example = () => <div />;
  export default Example;
`
const LAYOUT_FILEPATH = path.join(projectRoot, 'src/app/layout.tsx')
const STORYBOOK_FILEPATH = path.join(
  projectRoot,
  'src/components/Button.stories.tsx',
)

describe('all-memo ignore cases', () => {
  it('does not report for Next.js layout.tsx', async () => {
    const [result] = await eslint.lintText(SAMPLE_COMPONENT_SOURCE, {
      filePath: LAYOUT_FILEPATH,
    })

    expect(result.messages).toHaveLength(EXPECTED_MESSAGE_COUNT)
  })

  it('does not report for Storybook stories', async () => {
    const [result] = await eslint.lintText(SAMPLE_COMPONENT_SOURCE, {
      filePath: STORYBOOK_FILEPATH,
    })

    expect(result.messages).toHaveLength(EXPECTED_MESSAGE_COUNT)
  })
})
