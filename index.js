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
import preferStableContextValue from './lib/rules/prefer-stable-context-value.js'
import noUnstableClassnameProp from './lib/rules/no-unstable-classname-prop.js'
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
    'prefer-stable-context-value': preferStableContextValue,
    'no-unstable-classname-prop': noUnstableClassnameProp,
    'prefer-usecallback-might-work': usecallbackMightWork,
    'prefer-usecallback-for-memoized-component': usecallbackForMemoizedComponent,
    'prefer-usememo-for-memoized-component': usememoForMemoizedComponent,
    'prefer-usememo-might-work': usememoMightWork,
  },
}

export default plugin
