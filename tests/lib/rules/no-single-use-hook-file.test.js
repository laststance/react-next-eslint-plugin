import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'
import { afterEach, describe, test } from 'mocha'
import { ESLint, Linter } from 'eslint'
import * as parser from '@typescript-eslint/parser'
import ts from 'typescript'
import rule from '../../../lib/rules/no-single-use-hook-file.js'
import effectRule from '../../../lib/rules/no-direct-use-effect.js'

const require = createRequire(import.meta.url)
const repositoryDirectory = fileURLToPath(new URL('../../../', import.meta.url))
const temporaryDirectories = new Set()
const ruleName = 'laststance/no-single-use-hook-file'
const cartHook = 'export function useCart() { return 1 }'
const cartPanel =
  'import { useCart } from "./useCart"; export function CartPanel() { useCart(); return null }'

// Each receiver form must independently preserve unknown ownership.
for (const indirectCall of [
  'useCart.call(null)',
  'useCart[method](null)',
  'useCart.bind(null)()',
]) {
  test(`does not issue a move when another caller uses ${indirectCall}`, () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/Other.tsx': `import { useCart } from './useCart'; declare const method: string; export function Other() { ${indirectCall}; return null }`,
    })
    // Act
    const messages = lintFile(app, 'src/useCart.ts')
    // Assert
    assertIncomplete(messages, 'useCart')
  })
}

test('does not invent a second owner from a reassigned Hook alias', () => {
  // Arrange
  const app = createApplication({
    'src/useCart.ts': cartHook,
    'src/CartPanel.tsx': cartPanel,
    'src/Other.tsx':
      "import { useCart } from './useCart'; let useSelected = useCart; useSelected = () => 2; export function Other() { useSelected(); return null }",
  })
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertIncomplete(messages, 'useCart')
})

test('recognizes an anonymous null-returning component inside a React wrapper', () => {
  // Arrange
  const app = createApplication({
    'src/useCart.ts': cartHook,
    'src/CartPanel.tsx':
      "import { memo as wrap } from 'react'; import { useCart } from './useCart'; export default wrap(() => { useCart(); return null })",
  })
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertPlacement(messages, 'useCart', 'default', 'src/CartPanel.tsx')
})

test('does not count a reassigned namespace receiver as a second Hook owner', () => {
  // Arrange
  const app = createApplication({
    'src/useCart.ts': cartHook,
    'src/CartPanel.tsx': cartPanel,
    'src/Other.tsx':
      "import * as original from './useCart'; let hooks = original; hooks = { useCart: () => 2 }; export function Other() { hooks.useCart(); return null }",
  })
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertIncomplete(messages, 'useCart')
})

test('analyzes a typed application that imports declared CSS assets', () => {
  // Arrange
  const app = createApplication({
    'src/useCart.ts': cartHook,
    'src/CartPanel.tsx': "import './styles.css'; " + cartPanel,
    'src/styles.css': '.cart { display: block; }',
    'src/assets.d.ts': "declare module '*.css' {}",
  })
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
})

// The wildcard is a fallback for both ESM and CommonJS external dependencies.
for (const importStatement of [
  "import vendor from 'untyped-vendor'",
  "declare function require(id: string): any; const vendor = require('untyped-vendor')",
]) {
  test(`accepts an untyped external dependency with wildcard paths: ${importStatement}`, () => {
    // Arrange
    const app = createApplication(
      {
        'src/useCart.ts': cartHook,
        'src/CartPanel.tsx': importStatement + '; ' + cartPanel,
        'node_modules/untyped-vendor/package.json':
          '{"name":"untyped-vendor","main":"index.js"}',
        'node_modules/untyped-vendor/index.js': 'module.exports = 1',
      },
      { compilerOptions: { allowJs: false, paths: { '*': ['./src/*'] } } },
    )
    // Act
    const messages = lintFile(app, 'src/useCart.ts')
    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })
}

test('ignores syntax errors in verification files without production importers', () => {
  // Arrange
  const app = createApplication({
    'src/useCart.ts': cartHook,
    'src/CartPanel.tsx': cartPanel,
    'src/Broken.test.tsx': 'export function Broken( {',
  })
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
})

test('rejects syntax errors in verification files imported by production', () => {
  // Arrange
  const app = createApplication({
    'src/useCart.ts': cartHook,
    'src/CartPanel.tsx': "import './Broken.test'; " + cartPanel,
    'src/Broken.test.tsx': 'export function Broken( {',
  })
  // Act / Assert
  assert.throws(
    () => lintFile(app, 'src/useCart.ts'),
    /no-single-use-hook-file cannot analyze unparseable source .*Broken[.]test[.]tsx; fix parser errors before linting/,
  )
})

test('counts a generic instantiation alias as the same shared Hook implementation', () => {
  // Arrange
  const app = createApplication({
    'src/useCart.ts': 'export function useCart<T>() { return 1 }',
    'src/CartPanel.tsx': cartPanel,
    'src/Other.tsx':
      "import { useCart } from './useCart'; const useSelected = useCart<number>; export function Other() { useSelected(); return null }",
  })
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assert.deepEqual(messages, [])
})

test('protects a Hook with opaque CommonJS consumers in the complete typed project', () => {
  // Arrange
  const app = createApplication({
    'src/useCart.ts': cartHook,
    'src/CartPanel.tsx': cartPanel,
    'src/Other.tsx':
      "declare function require(id: string): any; const { useCart } = require('./useCart'); export function Other() { useCart(); return null }",
  })
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertIncomplete(messages, 'useCart')
})

test('protects an internal Hook re-exported by an external public barrel', () => {
  // Arrange
  const app = createApplication(
    {
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      '../external/package.json':
        '{"name":"external","exports":"./public-api.ts"}',
      '../external/public-api.ts':
        "export { useCart } from '../app/src/useCart'",
    },
    { include: ['src/**/*', '../external/**/*.ts'] },
  )
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertIncomplete(messages, 'useCart')
})

test('ignores a type-only star export through an external barrel chain', () => {
  // Arrange
  const app = createApplication(
    {
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      '../external/package.json':
        '{"name":"external","exports":"./public-api.ts"}',
      '../external/types.ts': "export type * from '../app/src/useCart'",
      '../external/public-api.ts': "export * from './types'",
    },
    { include: ['src/**/*', '../external/**/*.ts'] },
  )
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
})

test('preserves runtime exposure when a barrel also has a type-only star path', () => {
  // Arrange
  const app = createApplication(
    {
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      '../external/package.json':
        '{"name":"external","exports":"./public-api.ts"}',
      '../external/types.ts': "export type * from '../app/src/useCart'",
      '../external/public-api.ts':
        "export * from './types'; export * from '../app/src/useCart'",
    },
    { include: ['src/**/*', '../external/**/*.ts'] },
  )
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertIncomplete(messages, 'useCart')
})

test('preserves a runtime star export alongside a direct type-only export', () => {
  // Arrange
  const app = createApplication(
    {
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      '../external/package.json':
        '{"name":"external","exports":"./public-api.ts"}',
      '../external/public-api.ts':
        "export type { useCart } from '../app/src/useCart'; export * from '../app/src/useCart'",
    },
    { include: ['src/**/*', '../external/**/*.ts'] },
  )
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertIncomplete(messages, 'useCart')
})

test('ignores a named external export forwarded from a type-only barrel', () => {
  // Arrange
  const app = createApplication(
    {
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/types.ts': "export type * from './useCart'",
      '../external/package.json':
        '{"name":"external","exports":"./public-api.ts"}',
      '../external/public-api.ts': "export { useCart } from '../app/src/types'",
    },
    { include: ['src/**/*', '../external/**/*.ts'] },
  )
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
})

test('protects the runtime Hook when a distinct same-named type export hides its symbol', () => {
  // Arrange
  const app = createApplication(
    {
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/types.ts': 'export type useCart = () => void',
      '../external/package.json':
        '{"name":"external","exports":"./public-api.ts"}',
      '../external/public-api.ts':
        "export type { useCart } from '../app/src/types'; export * from '../app/src/useCart'",
    },
    { include: ['src/**/*', '../external/**/*.ts'] },
  )
  // Act
  const messages = lintFile(app, 'src/useCart.ts')
  // Assert
  assertIncomplete(messages, 'useCart')
})

// Local re-exports must preserve type-only imports and type-only source modules.
for (const declaration of [
  "import type { useCart } from '../app/src/useCart'; export { useCart }",
  "import { useCart } from '../app/src/types'; export { useCart }",
]) {
  test(`ignores an erased external local export: ${declaration}`, () => {
    // Arrange
    const app = createApplication(
      {
        'src/useCart.ts': cartHook,
        'src/CartPanel.tsx': cartPanel,
        'src/types.ts': "export type * from './useCart'",
        '../external/package.json':
          '{"name":"external","exports":"./public-api.ts"}',
        '../external/public-api.ts': declaration,
      },
      { include: ['src/**/*', '../external/**/*.ts'] },
    )
    // Act
    const messages = lintFile(app, 'src/useCart.ts')
    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })
}

// Default exports must retain import type information until runtime exposure is resolved.
for (const declaration of [
  "import type useCart from '../app/src/useCart'; export default useCart",
  "import type { useCart } from '../app/src/useCart'; export default useCart",
  "import { useCart } from '../app/src/types'; export default useCart",
  "import type * as hooks from '../app/src/useCart'; export default hooks",
]) {
  test(`ignores an erased external default export: ${declaration}`, () => {
    // Arrange
    const app = createApplication(
      {
        'src/useCart.ts': cartHook + '; export default useCart',
        'src/CartPanel.tsx': cartPanel,
        'src/types.ts': "export type * from './useCart'",
        '../external/package.json':
          '{"name":"external","exports":"./public-api.ts"}',
        '../external/public-api.ts': declaration,
      },
      { include: ['src/**/*', '../external/**/*.ts'] },
    )
    // Act
    const messages = lintFile(app, 'src/useCart.ts')
    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })
}

/** Creates complete private application fixtures for ownership tests before the parser builds a real compiler program. @example const app = createApplication({ 'src/useCart.ts': cartHook }) */
function createApplication(files, config = {}) {
  const workspaceDirectory = realpathSync(
    mkdtempSync(join(tmpdir(), 'single-use-hook-')),
  )
  const directory = join(workspaceDirectory, 'app')
  temporaryDirectories.add(workspaceDirectory)
  const compilerOptions = {
    allowJs: true,
    jsx: 'preserve',
    module: 'esnext',
    moduleResolution: 'bundler',
    target: 'esnext',
    noEmit: true,
    noLib: true,
    types: [],
    ...config.compilerOptions,
  }
  const app = { directory }
  const fixtureFiles = {
    'package.json': JSON.stringify({ name: 'fixture-app', private: true }),
    'tsconfig.json': JSON.stringify({
      include: ['src/**/*'],
      ...config,
      compilerOptions,
    }),
    // Real declaration-module bindings let the checker distinguish React wrappers from shadowed names.
    'node_modules/react/package.json': JSON.stringify({
      name: 'react',
      types: 'index.d.ts',
    }),
    'node_modules/react/index.d.ts': [
      'export function memo<T>(component: T): T;',
      'export function forwardRef<T>(render: T): T;',
      'export function useEffect(effect: () => void, dependencies: unknown[]): void;',
      'declare const React: { memo: typeof memo; forwardRef: typeof forwardRef; useEffect: typeof useEffect };',
      'export default React;',
    ].join('\n'),
    ...files,
  }
  // Every source lives on disk; imports and package metadata use the compiler's real resolver.
  for (const [filename, source] of Object.entries(fixtureFiles)) {
    writeSource(app, filename, source)
  }
  return app
}

/** Writes production changes used by fresh-program regression tests before {@link lintFile} runs. @example writeSource(app, 'src/Other.tsx', 'export function Other() { return null }') */
function writeSource(app, filename, source) {
  const filePath = resolve(app.directory, filename)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, source)
}

/** Builds complete compiler snapshots, including project references, before the real parser reads each acceptance fixture. @example const program = buildProgram(app) */
function buildProgram(app) {
  const configFilePath = join(app.directory, 'tsconfig.json')
  const configuration = ts.readConfigFile(configFilePath, ts.sys.readFile)
  assert.equal(configuration.error, undefined)
  const parsed = ts.parseJsonConfigFileContent(
    configuration.config,
    ts.sys,
    app.directory,
    undefined,
    configFilePath,
  )
  return ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
    projectReferences: parsed.projectReferences,
    configFileParsingDiagnostics: parsed.errors,
  })
}

/** Supplies real parser services and both opt-in rules when ESLint evaluates an acceptance fixture. @example const config = lintConfiguration(app, buildProgram(app)) */
function lintConfiguration(app, program, extraRules = {}) {
  return [
    {
      files: ['**/*.{js,jsx,ts,tsx}'],
      languageOptions: {
        parser,
        parserOptions: {
          programs: [program],
          tsconfigRootDir: app.directory,
        },
      },
      plugins: {
        laststance: {
          rules: {
            'no-single-use-hook-file': rule,
            'no-direct-use-effect': effectRule,
          },
        },
      },
      rules: { [ruleName]: 'error', ...extraRules },
    },
  ]
}

/** Lints one requested definition while its whole compiler program remains available to the rule. @example lintFile(app, 'src/useCart.ts') */
function lintFile(app, filename, options = {}) {
  const filePath = resolve(app.directory, filename)
  return new Linter({ cwd: app.directory }).verify(
    options.source ?? readFileSync(filePath, 'utf8'),
    lintConfiguration(
      app,
      options.program ?? buildProgram(app),
      options.extraRules,
    ),
    { filename: filePath },
  )
}

/** Writes a real flat config for worker and CLI acceptance runs that cannot receive in-memory rule objects. @example const configPath = writeCliConfiguration(app) */
function writeCliConfiguration(app) {
  const parserUrl = pathToFileURL(
    require.resolve('@typescript-eslint/parser'),
  ).href
  const ruleUrl = pathToFileURL(
    join(repositoryDirectory, 'lib/rules/no-single-use-hook-file.js'),
  ).href
  writeSource(
    app,
    'eslint.config.mjs',
    [
      'import parser from ' + JSON.stringify(parserUrl),
      'import rule from ' + JSON.stringify(ruleUrl),
      'export default [{',
      '  files: ["src/**/*.{ts,tsx}"],',
      '  languageOptions: { parser, parserOptions: { project: "./tsconfig.json", tsconfigRootDir: ' +
        JSON.stringify(app.directory) +
        ' } },',
      '  plugins: { laststance: { rules: { "no-single-use-hook-file": rule } } },',
      '  rules: { "laststance/no-single-use-hook-file": "error" }',
      '}]',
    ].join('\n'),
  )
  return join(app.directory, 'eslint.config.mjs')
}

/** Verifies a concrete relocation without coupling acceptance tests to the diagnostic prose. @example assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx') */
function assertPlacement(messages, hookName, componentName, componentFile) {
  assert.deepEqual(
    messages.map(({ messageId }) => messageId),
    ['colocateWithComponent'],
    JSON.stringify(messages),
  )
  assert.ok(messages[0].message.includes(hookName), messages[0].message)
  assert.ok(messages[0].message.includes(componentName), messages[0].message)
  assert.ok(messages[0].message.includes(componentFile), messages[0].message)
  assert.equal(messages[0].severity, 2)
  assert.equal(messages[0].fix, undefined)
  assert.equal(messages[0].suggestions, undefined)
}

/** Ensures uncertain ownership remains an explicit failure instead of an unsafe move instruction. @example assertIncomplete(messages, 'useCart') */
function assertIncomplete(messages, hookName) {
  assert.deepEqual(
    messages.map(({ messageId }) => messageId),
    ['incompleteAnalysis'],
    JSON.stringify(messages),
  )
  assert.ok(messages[0].message.includes(hookName), messages[0].message)
  assert.equal(messages[0].severity, 2)
  assert.equal(messages[0].fix, undefined)
}

afterEach(() => {
  // Cleanup is restricted to directories this test process created.
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true })
  }
  temporaryDirectories.clear()
})

describe('no-single-use-hook-file: component ownership', () => {
  test('reports a separate Hook once at its definition with the sole owner destination', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
    assert.equal(messages[0].line, 1)
    assert.equal(messages[0].column, 17)
    assert.deepEqual(lintFile(app, 'src/CartPanel.tsx'), [])
  })

  test('accepts the exported Hook after its definition moves below its sole component', () => {
    // Arrange
    const app = createApplication({
      'src/CartPanel.tsx':
        'export function CartPanel() { useCart(); return null }\n' + cartHook,
      'src/CartPanel.test.tsx':
        'import { useCart } from "./CartPanel"; function TestHarness() { useCart(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/CartPanel.tsx')

    // Assert
    assert.deepEqual(messages, [])
  })

  test('requires the component file even when a generic Hook is in a neighboring shared directory', () => {
    // Arrange
    const app = createApplication({
      'src/shared/useData.ts': 'export const useData = () => 1',
      'src/CartPanel.tsx':
        'import { useData } from "./shared/useData"; export function CartPanel() { useData(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/shared/useData.ts')

    // Assert
    assertPlacement(messages, 'useData', 'CartPanel', 'src/CartPanel.tsx')
  })

  test('counts repeated calls and multiple rendering parents as one component owner', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import { useCart } from "./useCart"; export function CartPanel() { useCart(); useCart(); return null }',
      'src/Routes.tsx':
        'import { CartPanel } from "./CartPanel"; export function Home() { return <CartPanel /> } export function Search() { return <CartPanel /> }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })

  test('allows a separate Hook shared by two components defined in the same file', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/Panels.tsx':
        'import { useCart } from "./useCart"; export function CartPanel() { useCart(); return null } export function CheckoutPanel() { useCart(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assert.deepEqual(messages, [])
  })

  test('allows a separate Hook shared by two components in different files', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/CheckoutPanel.tsx':
        'import { useCart } from "./useCart"; export const CheckoutPanel = () => { useCart(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assert.deepEqual(messages, [])
  })

  test('does not count tests, stories, or type-only references as production reuse', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/CartPanel.test.tsx':
        'import { useCart } from "./useCart"; function TestHarness() { useCart(); return null }',
      'src/CartPanel.stories.tsx':
        'import { useCart } from "./useCart"; export const Story = () => { useCart(); return null }',
      'src/__tests__/Harness.tsx':
        'import { useCart } from "../useCart"; function TestHarness() { useCart(); return null }',
      'src/contract.ts':
        'import type { useCart } from "./useCart"; export type CartFactory = typeof useCart',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })

  test('does not invent a destination for a Hook used only by a test component', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/useCart.spec.tsx':
        'import { useCart } from "./useCart"; function Harness() { useCart(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assert.deepEqual(messages, [])
  })

  test('does not treat inline type-only imports and re-exports as opaque runtime dependencies', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/types.d.ts': 'export interface Cart { total: number }',
      'src/contract.ts':
        'import { type Cart } from "./types"; export type CartSummary = Cart',
      'src/publicTypes.ts': 'export { type Cart } from "./types"',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })

  test('does not count unused imports or re-export barrels as additional owners', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/Unused.tsx':
        'import { useCart } from "./useCart"; export function Unused() { return null }',
      'src/barrel.ts': 'export { useCart } from "./useCart"',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })

  test('leaves unused Hook exports to unused-code rules', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/barrel.ts': 'export * from "./useCart"',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assert.deepEqual(messages, [])
  })

  test('resolves aliases, default imports, static namespace access, and re-export chains once', () => {
    // Arrange
    const app = createApplication(
      {
        'src/useCart.ts': cartHook + '\nexport default useCart',
        'src/first.ts':
          'export * from "./useCart"; export { default } from "./useCart"',
        'src/second.ts':
          'export { useCart as useSelection, default } from "./first"',
        'src/CartPanel.tsx':
          'import useDefaultCart, { useSelection as useSelected } from "@app/second"; import * as cart from "./first"; const useAlias = useSelected; export function CartPanel() { useDefaultCart(); useSelected(); useAlias(); cart.useCart(); cart["useCart"](); return null }',
      },
      { compilerOptions: { paths: { '@app/*': ['./src/*'] } } },
    )

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })

  test('keeps same-named and shadowed Hooks attached to their own declarations', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/Other.tsx':
        'import { useCart } from "./useCart"; export function Other() { function useCart() { return 2 } useCart(); return null }',
      'src/Separate.tsx':
        'export function Separate() { useCart(); return null } function useCart() { return 3 }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
    assert.deepEqual(lintFile(app, 'src/Separate.tsx'), [])
  })

  test('counts two component owners importing canonical and symlink paths to the same Hook', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/CheckoutPanel.tsx':
        'import { useCart } from "../linked/useCart"; export function CheckoutPanel() { useCart(); return null }',
    })
    symlinkSync(
      join(app.directory, 'src'),
      join(app.directory, 'linked'),
      'dir',
    )
    const program = buildProgram(app)

    // Act
    const messages = lintFile(app, 'src/useCart.ts', { program })

    // Assert
    assert.equal(
      program
        .getSourceFiles()
        .filter((source) => source.fileName.endsWith('/useCart.ts')).length,
      2,
    )
    assert.deepEqual(messages, [])
  })

  test('reports a canonical Hook definition whose sole owner imports its symlink alias', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import { useCart } from "../linked/useCart"; export function CartPanel() { useCart(); return null }',
    })
    symlinkSync(
      join(app.directory, 'src'),
      join(app.directory, 'linked'),
      'dir',
    )

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })

  test('recognizes static Hook calls through assertions, non-null expressions, and satisfies', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import { useCart } from "./useCart"; export function CartPanel() { (useCart as typeof useCart)(); useCart!(); (useCart satisfies (() => number))(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })

  test('finds anonymous default Hook implementations through a Hook-named import', () => {
    // Arrange
    const app = createApplication({
      'src/selection.ts': 'export default function () { return 1 }',
      'src/CartPanel.tsx':
        'import useSelection from "./selection"; export function CartPanel() { useSelection(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/selection.ts')

    // Assert
    assertPlacement(messages, 'useSelection', 'CartPanel', 'src/CartPanel.tsx')
  })

  test('colocates every dedicated Hook in a transitive call chain', () => {
    // Arrange
    const app = createApplication({
      'src/useSelection.ts': 'export const useSelection = () => 1',
      'src/useCart.ts':
        'import { useSelection } from "./useSelection"; export function useCart() { return useSelection() }',
      'src/CartPanel.tsx': cartPanel,
    })

    // Act
    const outerMessages = lintFile(app, 'src/useCart.ts')
    const innerMessages = lintFile(app, 'src/useSelection.ts')

    // Assert
    assertPlacement(outerMessages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
    assertPlacement(
      innerMessages,
      'useSelection',
      'CartPanel',
      'src/CartPanel.tsx',
    )
  })

  test('allows the shared inner Hook while still colocating its dedicated outer Hook', () => {
    // Arrange
    const app = createApplication({
      'src/useSelection.ts': 'export const useSelection = () => 1',
      'src/useCart.ts':
        'import { useSelection } from "./useSelection"; export function useCart() { return useSelection() }',
      'src/CartPanel.tsx': cartPanel,
      'src/CheckoutPanel.tsx':
        'import { useSelection } from "./useSelection"; export function CheckoutPanel() { useSelection(); return null }',
    })

    // Act
    const outerMessages = lintFile(app, 'src/useCart.ts')
    const innerMessages = lintFile(app, 'src/useSelection.ts')

    // Assert
    assertPlacement(outerMessages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
    assert.deepEqual(innerMessages, [])
  })

  test('normalizes memo and forwardRef import aliases to one wrapped implementation', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import { memo as cache, forwardRef as withRef } from "react"; import { useCart } from "./useCart"; export const CartPanel = cache(withRef(() => { useCart(); return null })); export const Again = cache(CartPanel)',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })

  test('recognizes React namespace wrappers around named null-returning components', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import React from "react"; import { useCart } from "./useCart"; function CartPanel() { useCart(); return null } export default React.memo(React.forwardRef(CartPanel))',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })

  test('recognizes an anonymous default component from its returned JSX', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import { useCart } from "./useCart"; export default function () { useCart(); return <section /> }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assert.deepEqual(
      messages.map(({ messageId }) => messageId),
      ['colocateWithComponent'],
    )
    assert.ok(messages[0].message.includes('src/CartPanel.tsx'))
  })

  test('reports each misplaced export despite an unrelated component in the Hook file', () => {
    // Arrange
    const app = createApplication({
      'src/hooks.tsx':
        'export function Unrelated() { return null }\nexport function useCart() { return 1 }\nexport const useCheckout = () => 2',
      'src/CartPanel.tsx':
        'import { useCart } from "./hooks"; export function CartPanel() { useCart(); return null }',
      'src/CheckoutPanel.tsx':
        'import { useCheckout } from "./hooks"; export function CheckoutPanel() { useCheckout(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/hooks.tsx')

    // Assert
    assert.equal(messages.length, 2)
    assertPlacement([messages[0]], 'useCart', 'CartPanel', 'src/CartPanel.tsx')
    assertPlacement(
      [messages[1]],
      'useCheckout',
      'CheckoutPanel',
      'src/CheckoutPanel.tsx',
    )
  })

  test('terminates cyclic Hook calls without duplicate ownership or reports', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts':
        'import { useSelection } from "./useSelection"; export function useCart() { return useSelection() }',
      'src/useSelection.ts':
        'import { useCart as useFirst, useCart as useAgain } from "./useCart"; export function useSelection() { useFirst(); return useAgain() }',
      'src/CartPanel.tsx': cartPanel,
    })

    // Act
    const outerMessages = lintFile(app, 'src/useCart.ts')
    const innerMessages = lintFile(app, 'src/useSelection.ts')

    // Assert
    assertPlacement(outerMessages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
    assertPlacement(
      innerMessages,
      'useSelection',
      'CartPanel',
      'src/CartPanel.tsx',
    )
  })

  test('analyzes JavaScript and JSX included by allowJs', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.js': cartHook,
      'src/CartPanel.jsx': cartPanel,
    })

    // Act
    const messages = lintFile(app, 'src/useCart.js')

    // Assert
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.jsx')
  })
})

describe('no-single-use-hook-file: uncertain ownership and application boundaries', () => {
  test('reports incomplete analysis when a Hook value escapes to arbitrary production code', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/register.ts':
        'import { useCart } from "./useCart"; declare function register(value: unknown): void; register(useCart)',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
    assert.ok(messages[0].message.includes('register.ts'), messages[0].message)
  })

  test('protects Hooks reachable through dynamic namespace access', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/register.ts':
        'import * as cart from "./useCart"; declare const selected: keyof typeof cart; declare function register(value: unknown): void; register(cart[selected])',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('preserves uncertain consumers reached through a dynamic import callback', () => {
    // Arrange
    const app = createApplication(
      {
        'src/useCart.ts': cartHook,
        'src/CartPanel.tsx': cartPanel,
        'src/lazy.ts': 'import("./useCart").then(module => module.useCart())',
      },
      // Promise declarations preserve the actual dynamic import callback's module type.
      { compilerOptions: { noLib: false } },
    )

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('protects a Hook called through a destructured dynamic import callback', () => {
    // Arrange
    const app = createApplication(
      {
        'src/useCart.ts': cartHook,
        'src/CartPanel.tsx': cartPanel,
        'src/lazy.ts': 'import("./useCart").then(({ useCart }) => useCart())',
      },
      { compilerOptions: { noLib: false } },
    )

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('preserves namespace uncertainty after a static namespace alias is introduced', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/register.ts':
        'import * as hooks from "./useCart"; const alias = hooks; declare const selected: keyof typeof hooks; alias[selected]()',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('protects all exported Hooks when their namespace escapes as a whole value', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/register.ts':
        'import * as hooks from "./useCart"; declare function consume(value: unknown): void; consume(hooks)',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('does not infer a component owner through an unknown higher-order wrapper', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import { useCart } from "./useCart"; declare function observe<T>(render: T): T; export const CartPanel = observe(() => { useCart(); return null })',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('does not mistake a local memo function for React memo', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import { useCart } from "./useCart"; function memo<T>(render: T): T { return render } export const CartPanel = memo(() => { useCart(); return null })',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('preserves uncertainty when an unknown wrapper receives a parenthesized named component', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import { useCart } from "./useCart"; declare function wrap<T>(render: T): T; function CartPanel() { useCart(); return null } export default wrap((CartPanel))',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('does not attribute a nested callback Hook call to its enclosing component', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import { useCart } from "./useCart"; export function CartPanel() { const onClick = () => useCart(); return <button onClick={onClick} /> }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('protects a Hook whose callable alias can be reassigned', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import { useCart } from "./useCart"; let useSelected = useCart; useSelected = () => 2; export function CartPanel() { useSelected(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('propagates an escaped outer Hook to its otherwise dedicated inner Hook', () => {
    // Arrange
    const app = createApplication({
      'src/useSelection.ts': 'export function useSelection() { return 1 }',
      'src/useCart.ts':
        'import { useSelection } from "./useSelection"; export function useCart() { return useSelection() }',
      'src/CartPanel.tsx': cartPanel,
      'src/register.ts':
        'import { useCart } from "./useCart"; declare function register(value: unknown): void; register(useCart)',
    })

    // Act
    const outerMessages = lintFile(app, 'src/useCart.ts')
    const innerMessages = lintFile(app, 'src/useSelection.ts')

    // Assert
    assertIncomplete(outerMessages, 'useCart')
    assertIncomplete(innerMessages, 'useSelection')
  })

  test('accepts a colocated Hook when unknown uses cannot invalidate its placement', () => {
    // Arrange
    const app = createApplication({
      'src/CartPanel.tsx':
        'export function CartPanel() { useCart(); return null }\n' + cartHook,
      'src/register.ts':
        'import { useCart } from "./CartPanel"; declare function register(value: unknown): void; register(useCart)',
    })

    // Act
    const messages = lintFile(app, 'src/CartPanel.tsx')

    // Assert
    assert.deepEqual(messages, [])
  })

  test('accepts confirmed reuse even when an additional use is opaque', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/CheckoutPanel.tsx':
        'import { useCart } from "./useCart"; export function CheckoutPanel() { useCart(); return null }',
      'src/register.ts':
        'import { useCart } from "./useCart"; declare function register(value: unknown): void; register(useCart)',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assert.deepEqual(messages, [])
  })

  test('protects ownership when production imports a conventionally excluded test module', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/Harness.test.tsx':
        'import { useCart } from "./useCart"; export function Harness() { useCart(); return null }',
      'src/Other.tsx':
        'import { Harness } from "./Harness.test"; export function Other() { return <Harness /> }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('preserves generated runtime consumers as evidence of real reuse', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/generated/GeneratedPanel.tsx':
        '// @generated\nimport { useCart } from "../useCart"; export function GeneratedPanel() { useCart(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assert.deepEqual(messages, [])
  })

  test('does not instruct users to move generated Hook definitions', () => {
    // Arrange
    const app = createApplication({
      'src/generated/useCart.ts': '// @generated\n' + cartHook,
      'src/CartPanel.tsx':
        'import { useCart } from "./generated/useCart"; export function CartPanel() { useCart(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/generated/useCart.ts')

    // Assert
    assert.deepEqual(messages, [])
  })

  test('protects internal Hooks reachable through an exposed package entry point', () => {
    // Arrange
    const app = createApplication({
      'package.json': JSON.stringify({
        name: 'public-fixture',
        private: false,
        exports: './src/public.ts',
      }),
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/public.ts':
        'import { useCart } from "./useCart"; export function usePublicCart() { return useCart() }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })

  test('protects local Hook chains exposed by another workspace package', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx':
        'import { useSharedCart } from "../../shared/useSharedCart"; export function CartPanel() { useSharedCart(); return null }',
      '../shared/package.json': JSON.stringify({
        name: 'shared-fixture',
        exports: './useSharedCart.ts',
      }),
      '../shared/useSharedCart.ts':
        'import { useCart } from "../app/src/useCart"; export function useSharedCart() { return useCart() }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assertIncomplete(messages, 'useCart')
  })
})

describe('no-single-use-hook-file: complete compiler snapshots', () => {
  test('fails configuration clearly when the parser has no typed program', () => {
    // Arrange
    const app = createApplication({ 'src/useCart.ts': cartHook })
    const configuration = lintConfiguration(app, buildProgram(app))
    delete configuration[0].languageOptions.parserOptions

    // Act / Assert
    assert.throws(
      () =>
        new Linter({ cwd: app.directory }).verify(cartHook, configuration, {
          filename: join(app.directory, 'src/useCart.ts'),
        }),
      /no-single-use-hook-file requires @typescript-eslint\/parser with a complete typed application project/,
    )
  })

  test('rejects a compiler program without a configured application TSConfig', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
    })
    const configuredProgram = buildProgram(app)
    const program = ts.createProgram(configuredProgram.getRootFileNames(), {
      ...configuredProgram.getCompilerOptions(),
      configFilePath: undefined,
    })

    // Act / Assert
    assert.throws(
      () => lintFile(app, 'src/useCart.ts', { program }),
      /no-single-use-hook-file requires one complete application Program with a configured tsconfig[.]json/,
    )
  })

  test('rejects a configured source that cannot be read instead of assuming it has no consumers', () => {
    // Arrange
    const app = createApplication(
      {
        'src/useCart.ts': cartHook,
        'src/CartPanel.tsx': cartPanel,
      },
      { files: ['src/useCart.ts', 'src/CartPanel.tsx', 'src/Missing.tsx'] },
    )

    // Act / Assert
    assert.throws(
      () => lintFile(app, 'src/useCart.ts'),
      /no-single-use-hook-file cannot analyze missing project source .*Missing[.]tsx[.]/,
    )
  })

  test('rejects unparseable production source before making a placement decision', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/Broken.tsx': 'import "./Missing"; export function Broken( {',
    })

    // Act / Assert
    assert.throws(
      () => lintFile(app, 'src/useCart.ts'),
      /no-single-use-hook-file cannot analyze unparseable source .*Broken[.]tsx; fix parser errors before linting/,
    )
  })

  test('rejects malformed external runtime source that can hide local Hook consumers', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': "import '../../shared/Broken'; " + cartPanel,
      '../shared/package.json':
        '{"name":"shared-fixture","exports":"./Broken.ts"}',
      '../shared/Broken.ts': "export { useCart from '../app/src/useCart';",
    })

    // Act / Assert
    assert.throws(
      () => lintFile(app, 'src/useCart.ts'),
      /no-single-use-hook-file cannot analyze unparseable source .*shared\/Broken[.]ts; fix parser errors before linting/,
    )
  })

  test('rejects unresolved local runtime imports that can hide consumers', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/Other.tsx':
        'import { Other } from "./Missing"; export function Page() { return <Other /> }',
    })

    // Act / Assert
    assert.throws(
      () => lintFile(app, 'src/useCart.ts'),
      /no-single-use-hook-file needs complete runtime source for [.]\/Missing imported by .*Other[.]tsx/,
    )
  })

  test('rejects local runtime implementations represented only by declarations', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/runtime.d.ts': 'export declare function useRuntime(): number',
      'src/Other.tsx':
        'import { useRuntime } from "./runtime"; export function Other() { useRuntime(); return null }',
    })

    // Act / Assert
    assert.throws(
      () => lintFile(app, 'src/useCart.ts'),
      /no-single-use-hook-file needs complete runtime source for [.]\/runtime imported by .*Other[.]tsx/,
    )
  })

  test('rejects malformed package metadata instead of assuming a private application boundary', () => {
    // Arrange
    const app = createApplication({
      'package.json': '{ "private": true,',
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
    })

    // Act / Assert
    assert.throws(
      () => lintFile(app, 'src/useCart.ts'),
      /no-single-use-hook-file cannot read package boundary .*package[.]json[.]/,
    )
  })

  test('rejects project references that do not establish complete application ownership', () => {
    // Arrange
    const app = createApplication(
      {
        'src/useCart.ts': cartHook,
        'src/CartPanel.tsx': cartPanel,
        '../shared/tsconfig.json': JSON.stringify({
          compilerOptions: { composite: true },
          files: ['empty.ts'],
        }),
        '../shared/empty.ts': 'export {}',
      },
      { references: [{ path: '../shared' }] },
    )

    // Act / Assert
    assert.throws(
      () => lintFile(app, 'src/useCart.ts'),
      /no-single-use-hook-file requires one complete application Program with a configured tsconfig[.]json and no project references/,
    )
  })

  test('fails when the linted component is missing from the configured compiler program', () => {
    // Arrange
    const app = createApplication(
      {
        'src/useCart.ts': cartHook,
        'src/CartPanel.tsx': cartPanel,
      },
      { include: ['src/useCart.ts'] },
    )

    // Act
    const messages = lintFile(app, 'src/CartPanel.tsx')

    // Assert
    assert.equal(messages.length, 1)
    assert.equal(messages[0].fatal, true)
    assert.match(
      messages[0].message,
      /not found.*program|program[\s\S]*CartPanel/i,
    )
    assert.equal(messages[0].messageId, undefined)
  })

  test('reports stale current-file text instead of a move based on the previous snapshot', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
    })
    const program = buildProgram(app)

    // Act
    const messages = lintFile(app, 'src/useCart.ts', {
      program,
      source: 'export function useCart() { return 2 }',
    })

    // Assert
    assert.deepEqual(
      messages.map(({ messageId }) => messageId),
      ['incompleteAnalysis'],
    )
    assert.match(messages[0].message, /text|snapshot|source/i)
  })

  test('counts consumers omitted from the lint file list even when their rule is disabled', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/CheckoutPanel.tsx':
        '/* eslint-disable laststance/no-single-use-hook-file */\nimport { useCart } from "./useCart"; export function CheckoutPanel() { useCart(); return null }',
    })

    // Act
    const messages = lintFile(app, 'src/useCart.ts')

    // Assert
    assert.deepEqual(messages, [])
  })

  test('updates ownership after a second consumer is added, changed, and removed between runs', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
    })

    // Act / Assert: each lint creates a fresh configured compiler snapshot.
    assertPlacement(
      lintFile(app, 'src/useCart.ts'),
      'useCart',
      'CartPanel',
      'src/CartPanel.tsx',
    )
    writeSource(
      app,
      'src/CheckoutPanel.tsx',
      'import { useCart } from "./useCart"; export function CheckoutPanel() { useCart(); return null }',
    )
    assert.deepEqual(lintFile(app, 'src/useCart.ts'), [])
    writeSource(
      app,
      'src/CheckoutPanel.tsx',
      'export function CheckoutPanel() { return null }',
    )
    assertPlacement(
      lintFile(app, 'src/useCart.ts'),
      'useCart',
      'CartPanel',
      'src/CartPanel.tsx',
    )
    rmSync(join(app.directory, 'src/CheckoutPanel.tsx'))
    assertPlacement(
      lintFile(app, 'src/useCart.ts'),
      'useCart',
      'CartPanel',
      'src/CartPanel.tsx',
    )
  })

  test('updates the suggested destination after the sole component file is renamed', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
    })
    const before = lintFile(app, 'src/useCart.ts')
    renameSync(
      join(app.directory, 'src/CartPanel.tsx'),
      join(app.directory, 'src/BasketPanel.tsx'),
    )

    // Act
    const after = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(before, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
    assertPlacement(after, 'useCart', 'CartPanel', 'src/BasketPanel.tsx')
  })

  test('refreshes cached package boundaries when a public manifest is added and removed', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
    })
    const program = buildProgram(app)
    const before = lintFile(app, 'src/useCart.ts', { program })

    // Act: the same compiler snapshot must observe a newly created package boundary.
    writeSource(
      app,
      'src/package.json',
      JSON.stringify({
        name: 'public-cart-package',
        private: false,
        exports: './useCart.ts',
      }),
    )
    const cachedWithBoundary = lintFile(app, 'src/useCart.ts', { program })
    const freshWithBoundary = lintFile(app, 'src/useCart.ts')
    rmSync(join(app.directory, 'src/package.json'))
    const cachedAfterRemoval = lintFile(app, 'src/useCart.ts', { program })
    const freshAfterRemoval = lintFile(app, 'src/useCart.ts')

    // Assert
    assertPlacement(before, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
    assert.deepEqual(cachedWithBoundary, [])
    assert.deepEqual(freshWithBoundary, [])
    assertPlacement(
      cachedAfterRemoval,
      'useCart',
      'CartPanel',
      'src/CartPanel.tsx',
    )
    assertPlacement(
      freshAfterRemoval,
      'useCart',
      'CartPanel',
      'src/CartPanel.tsx',
    )
  })

  test('keeps results independent of lint order and other application snapshots', () => {
    // Arrange
    const dedicatedApp = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
    })
    const sharedApp = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
      'src/CheckoutPanel.tsx':
        'import { useCart } from "./useCart"; export function CheckoutPanel() { useCart(); return null }',
    })
    const dedicatedProgram = buildProgram(dedicatedApp)
    const sharedProgram = buildProgram(sharedApp)

    // Act
    const forward = lintFile(dedicatedApp, 'src/useCart.ts', {
      program: dedicatedProgram,
    })
    lintFile(dedicatedApp, 'src/CartPanel.tsx', { program: dedicatedProgram })
    const shared = lintFile(sharedApp, 'src/useCart.ts', {
      program: sharedProgram,
    })
    const reversed = lintFile(dedicatedApp, 'src/useCart.ts', {
      program: dedicatedProgram,
    })

    // Assert
    assertPlacement(forward, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
    assert.deepEqual(shared, [])
    assert.deepEqual(reversed, forward)
  })
})

describe('no-single-use-hook-file: consumer integration', function () {
  this.timeout(15000)

  test('produces the same concrete relocation with sequential and concurrent ESLint workers', async () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/useSharedCart.ts': 'export function useSharedCart() { return 1 }',
      'src/CartPanel.tsx':
        'import { useCart } from "./useCart"; import { useSharedCart } from "./useSharedCart"; export function CartPanel() { useCart(); useSharedCart(); return null }',
      'src/CheckoutPanel.tsx':
        'import { useSharedCart } from "./useSharedCart"; export function CheckoutPanel() { useSharedCart(); return null }',
    })
    const options = {
      cwd: app.directory,
      overrideConfigFile: writeCliConfiguration(app),
      cache: false,
    }

    // Act
    const sequential = await new ESLint({
      ...options,
      concurrency: 'off',
    }).lintFiles(['src/**/*.{ts,tsx}'])
    const concurrent = await new ESLint({
      ...options,
      concurrency: 2,
    }).lintFiles(['src/**/*.{ts,tsx}'])

    // Assert
    assert.deepEqual(
      sequential.map(({ filePath, messages }) => ({ filePath, messages })),
      concurrent.map(({ filePath, messages }) => ({ filePath, messages })),
    )
    assert.equal(concurrent.flatMap(({ messages }) => messages).length, 1)
    const hookResult = concurrent.find(({ filePath }) =>
      filePath.endsWith('/src/useCart.ts'),
    )
    assertPlacement(
      hookResult.messages,
      'useCart',
      'CartPanel',
      'src/CartPanel.tsx',
    )
  })

  test('accepts colocation together with the no-direct-use-effect rule', () => {
    // Arrange
    const app = createApplication({
      'src/CartPanel.tsx':
        'import { useEffect } from "react"; export function CartPanel() { useCart(); return null } function useCart() { useEffect(() => {}, []); return 1 }',
    })

    // Act
    const messages = lintFile(app, 'src/CartPanel.tsx', {
      extraRules: { 'laststance/no-direct-use-effect': 'error' },
    })

    // Assert
    assert.deepEqual(messages, [])
  })

  test('keeps existing rules usable while missing or unsupported compiler peers fail clearly', () => {
    // Arrange
    const app = createApplication({ 'src/empty.ts': 'export {}' })
    const publishedDirectory = join(app.directory, 'published-plugin')
    mkdirSync(publishedDirectory)
    cpSync(
      join(repositoryDirectory, 'index.js'),
      join(publishedDirectory, 'index.js'),
    )
    cpSync(
      join(repositoryDirectory, 'package.json'),
      join(publishedDirectory, 'package.json'),
    )
    cpSync(join(repositoryDirectory, 'lib'), join(publishedDirectory, 'lib'), {
      recursive: true,
    })
    const entryUrl = pathToFileURL(join(publishedDirectory, 'index.js')).href
    const eslintUrl = pathToFileURL(require.resolve('eslint')).href
    const parserUrl = pathToFileURL(
      require.resolve('@typescript-eslint/parser'),
    ).href
    const script = [
      'import assert from "node:assert/strict"',
      'import { mkdirSync, writeFileSync } from "node:fs"',
      'import { createRequire } from "node:module"',
      'import { Linter } from ' + JSON.stringify(eslintUrl),
      'import parser from ' + JSON.stringify(parserUrl),
      'const entryUrl = ' + JSON.stringify(entryUrl),
      'const packageRequire = createRequire(entryUrl)',
      'assert.throws(() => packageRequire.resolve("typescript"), { code: "MODULE_NOT_FOUND" })',
      'const { default: plugin } = await import(entryUrl)',
      'assert.ok(plugin.rules["no-single-use-hook-file"])',
      'const messages = new Linter().verify("function CartPanel() { useEffect(() => {}, []); return null }", [{',
      '  plugins: { laststance: plugin },',
      '  rules: { "laststance/no-direct-use-effect": "error" }',
      '}])',
      'assert.deepEqual(messages.map(({ messageId }) => messageId), ["noDirectUseEffect"])',
      'const program = parser.createProgram(' +
        JSON.stringify(join(app.directory, 'tsconfig.json')) +
        ')',
      'const typedConfiguration = [{',
      '  files: ["**/*.ts"],',
      '  languageOptions: { parser, parserOptions: { programs: [program] } },',
      '  plugins: { laststance: plugin },',
      '  rules: { "laststance/no-single-use-hook-file": "error" }',
      '}]',
      'const linter = new Linter({ cwd: ' +
        JSON.stringify(app.directory) +
        ' })',
      'const lintOptions = { filename: ' +
        JSON.stringify(join(app.directory, 'src/empty.ts')) +
        ' }',
      'assert.throws(() => linter.verify("export {}", typedConfiguration, lintOptions), /no-single-use-hook-file requires the optional TypeScript ~6[.]0[.]3 peer/)',
      // Only dependency rejection uses a version-only package; ownership still receives a real Program.
      'const compilerDirectory = ' +
        JSON.stringify(join(publishedDirectory, 'node_modules/typescript')),
      'mkdirSync(compilerDirectory, { recursive: true })',
      'writeFileSync(compilerDirectory + "/package.json", JSON.stringify({ name: "typescript", version: "5.9.3", main: "index.js" }))',
      'writeFileSync(compilerDirectory + "/index.js", "module.exports = { version: \'5.9.3\' }")',
      'for (const version of ["5.9.3", "6.0.0", "6.0.1", "6.0.2", "6.1.0", "6.0.3-beta.1"]) {',
      '  packageRequire("typescript").version = version',
      '  assert.throws(() => linter.verify("export {}", typedConfiguration, lintOptions), /no-single-use-hook-file currently supports TypeScript >=6[.]0[.]3 <6[.]1[.]0/)',
      '}',
      'process.stdout.write("existing rules work; missing and unsupported peers fail clearly")',
    ].join('\n')

    // Act
    const output = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', script],
      {
        cwd: app.directory,
        encoding: 'utf8',
        env: { ...process.env, NODE_PATH: '' },
      },
    )

    // Assert
    assert.equal(
      output,
      'existing rules work; missing and unsupported peers fail clearly',
    )
  })

  test('leaves every source file unchanged when the CLI receives --fix', () => {
    // Arrange
    const app = createApplication({
      'src/useCart.ts': cartHook,
      'src/CartPanel.tsx': cartPanel,
    })
    const configurationPath = writeCliConfiguration(app)
    const eslintPath = join(
      dirname(require.resolve('eslint/package.json')),
      'bin/eslint.js',
    )

    // Act
    const result = spawnSync(
      process.execPath,
      [
        eslintPath,
        '--config',
        configurationPath,
        '--no-cache',
        '--fix',
        '--format',
        'json',
        'src/**/*.{ts,tsx}',
      ],
      {
        cwd: app.directory,
        encoding: 'utf8',
      },
    )

    // Assert
    assert.equal(result.status, 1, result.stderr)
    const messages = JSON.parse(result.stdout).flatMap(
      ({ messages }) => messages,
    )
    assert.equal(
      messages.some(({ fatal }) => fatal),
      false,
      JSON.stringify(messages),
    )
    assert.equal(
      readFileSync(join(app.directory, 'src/useCart.ts'), 'utf8'),
      'export function useCart() { return 1 }',
    )
    assert.equal(
      readFileSync(join(app.directory, 'src/CartPanel.tsx'), 'utf8'),
      'import { useCart } from "./useCart"; export function CartPanel() { useCart(); return null }',
    )
    assertPlacement(messages, 'useCart', 'CartPanel', 'src/CartPanel.tsx')
  })
})
