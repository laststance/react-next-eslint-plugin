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
import preferStableContextValue from './lib/rules/prefer-stable-context-value.js'
import noUnstableClassnameProp from './lib/rules/no-unstable-classname-prop.js'
import noClientFetchInServerComponents from './lib/rules/no-client-fetch-in-server-components.js'

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
    'prefer-stable-context-value': preferStableContextValue,
    'no-unstable-classname-prop': noUnstableClassnameProp,
    'no-client-fetch-in-server-components': noClientFetchInServerComponents,
  },
}

export default plugin
