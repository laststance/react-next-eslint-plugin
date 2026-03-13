import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'
import { fileURLToPath } from 'node:url'
import laststancePlugin from '@laststance/react-next-eslint-plugin'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))

/**
 * Creates an ESLint instance configured with only the all-memo rule and fix enabled.
 *
 * @example
 *   const eslint = createFixEslint()
 *   const [result] = await eslint.lintText(code, { filePath })
 */
function createFixEslint() {
  return new ESLint({
    cwd: projectRoot,
    fix: true,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          parserOptions: {
            ecmaFeatures: { jsx: true },
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
}

const COMPONENT_FILEPATH = `${projectRoot}/src/app/test-component.tsx`

describe('all-memo --fix', () => {
  const eslint = createFixEslint()

  it('should wrap arrow function components with memo and add import', async () => {
    const input = [
      'const Arrow = () => {',
      '  return <div>Arrow Component</div>;',
      '};',
      '',
      'const ArrowWithProps = (props) => {',
      '  return <span>{props.name}</span>;',
      '};',
      '',
      'export { Arrow, ArrowWithProps };',
      '',
    ].join('\n')

    const [result] = await eslint.lintText(input, {
      filePath: COMPONENT_FILEPATH,
    })

    expect(result.output).toBeDefined()
    expect(result.output).toContain("import { memo } from 'react'")
    expect(result.output).toContain('memo(() => {')
    expect(result.output).toMatchSnapshot()
  })

  it('should not duplicate memo import when already imported as named', async () => {
    const input = [
      'import { memo } from "react";',
      '',
      'const Comp = () => {',
      '  return <div>Hello</div>;',
      '};',
      '',
      'export { Comp };',
      '',
    ].join('\n')

    const [result] = await eslint.lintText(input, {
      filePath: COMPONENT_FILEPATH,
    })

    expect(result.output).toBeDefined()
    expect(result.output).toContain('memo(() => {')
    // Should NOT add a second import
    const importMatches = result.output!.match(/import.*memo.*from/g)
    expect(importMatches).toHaveLength(1)
    expect(result.output).toMatchSnapshot()
  })

  it('should use React.memo when React is imported as default', async () => {
    const input = [
      'import React from "react";',
      '',
      'const Comp = () => {',
      '  return <div>Hello</div>;',
      '};',
      '',
      'export default Comp;',
      '',
    ].join('\n')

    const [result] = await eslint.lintText(input, {
      filePath: COMPONENT_FILEPATH,
    })

    expect(result.output).toBeDefined()
    expect(result.output).toContain('React.memo(')
    // Should NOT add additional import since React is already imported
    expect(result.output).not.toContain('import { memo }')
    expect(result.output).toMatchSnapshot()
  })

  it('should augment existing named react import with memo', async () => {
    const input = [
      'import { useState } from "react";',
      '',
      'const Comp = () => {',
      '  return <div>Hello</div>;',
      '};',
      '',
      'export { Comp };',
      '',
    ].join('\n')

    const [result] = await eslint.lintText(input, {
      filePath: COMPONENT_FILEPATH,
    })

    expect(result.output).toBeDefined()
    expect(result.output).toContain('memo, useState')
    expect(result.output).toContain('memo(() => {')
    expect(result.output).toMatchSnapshot()
  })

  it('should not autofix function declarations (only report)', async () => {
    const input = [
      'function MyComponent() {',
      '  return <div>Hello</div>;',
      '}',
      '',
      'export default MyComponent;',
      '',
    ].join('\n')

    const [result] = await eslint.lintText(input, {
      filePath: COMPONENT_FILEPATH,
    })

    // Function declarations cannot be auto-fixed; output should be undefined
    expect(result.output).toBeUndefined()
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].messageId).toBe('notMemoized')
  })

  it('should fix multiple components in a single file', async () => {
    const input = [
      'const First = () => <div>First</div>;',
      'const Second = () => <span>Second</span>;',
      'const Third = () => <p>Third</p>;',
      '',
      'export { First, Second, Third };',
      '',
    ].join('\n')

    const [result] = await eslint.lintText(input, {
      filePath: COMPONENT_FILEPATH,
    })

    expect(result.output).toBeDefined()
    expect(result.output).toContain("import { memo } from 'react'")
    // All three should be wrapped
    const memoMatches = result.output!.match(/memo\(/g)
    expect(memoMatches).toHaveLength(3)
    expect(result.output).toMatchSnapshot()
  })

  it('should skip already memoized components', async () => {
    const input = [
      'import { memo } from "react";',
      '',
      'const Memoized = memo(() => <div>Memoized</div>);',
      'const NotMemoized = () => <span>Not memoized</span>;',
      '',
      'export { Memoized, NotMemoized };',
      '',
    ].join('\n')

    const [result] = await eslint.lintText(input, {
      filePath: COMPONENT_FILEPATH,
    })

    expect(result.output).toBeDefined()
    // The already-memoized component should remain as-is
    expect(result.output).toContain(
      'const Memoized = memo(() => <div>Memoized</div>)',
    )
    // The not-memoized component should be wrapped
    expect(result.output).toContain(
      'const NotMemoized = memo(() => <span>Not memoized</span>)',
    )
    expect(result.output).toMatchSnapshot()
  })
})
