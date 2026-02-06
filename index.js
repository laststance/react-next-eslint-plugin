import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read package.json for meta information
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'),
)

// Import rules
import noJsxWithoutReturn from './lib/rules/no-jsx-without-return.js'
import allMemo from './lib/rules/all-memo.js'
import noUseReducer from './lib/rules/no-use-reducer.js'
import noSetStatePropDrilling from './lib/rules/no-set-state-prop-drilling.js'
import noDeoptUseCallback from './lib/rules/no-deopt-use-callback.js'
import noDeoptUseMemo from './lib/rules/no-deopt-use-memo.js'
import noDirectUseEffect from './lib/rules/no-direct-use-effect.js'
import noForwardRef from './lib/rules/no-forward-ref.js'
import noContextProvider from './lib/rules/no-context-provider.js'
import noMissingKey from './lib/rules/no-missing-key.js'
import noDuplicateKey from './lib/rules/no-duplicate-key.js'
import noMissingComponentDisplayName from './lib/rules/no-missing-component-display-name.js'
import noNestedComponentDefinitions from './lib/rules/no-nested-component-definitions.js'
import noMissingButtonType from './lib/rules/no-missing-button-type.js'
import preferStableContextValue from './lib/rules/prefer-stable-context-value.js'
import usecallbackForMemoizedComponent from './lib/rules/prefer-usecallback-for-memoized-component.js'
import usecallbackMightWork from './lib/rules/prefer-usecallback-might-work.js'
import usememoForMemoizedComponent from './lib/rules/prefer-usememo-for-memoized-component.js'
import usememoMightWork from './lib/rules/prefer-usememo-might-work.js'

const plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
    namespace: 'laststance',
  },
  rules: {
    'no-jsx-without-return': noJsxWithoutReturn,
    'all-memo': allMemo,
    'no-use-reducer': noUseReducer,
    'no-set-state-prop-drilling': noSetStatePropDrilling,
    'no-deopt-use-callback': noDeoptUseCallback,
    'no-deopt-use-memo': noDeoptUseMemo,
    'no-direct-use-effect': noDirectUseEffect,
    'no-forward-ref': noForwardRef,
    'no-context-provider': noContextProvider,
    'no-missing-key': noMissingKey,
    'no-duplicate-key': noDuplicateKey,
    'no-missing-component-display-name': noMissingComponentDisplayName,
    'no-nested-component-definitions': noNestedComponentDefinitions,
    'no-missing-button-type': noMissingButtonType,
    'prefer-stable-context-value': preferStableContextValue,
    'prefer-usecallback-might-work': usecallbackMightWork,
    'prefer-usecallback-for-memoized-component': usecallbackForMemoizedComponent,
    'prefer-usememo-for-memoized-component': usememoForMemoizedComponent,
    'prefer-usememo-might-work': usememoMightWork,
  },
}

export default plugin
