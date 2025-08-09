import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json for meta information
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
);

// Import rules
import noJsxWithoutReturn from './lib/rules/no-jsx-without-return.js';
import allMemo from './lib/rules/all-memo.js';
import noUseEffect from './lib/rules/no-use-effect.js';
import noSetStatePropDrilling from './lib/rules/no-set-state-prop-drilling.js';
import noDeoptUseCallback from './lib/rules/no-deopt-use-callback.js';

const plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
    namespace: 'laststance',
  },
  configs: {},
  rules: {
    'no-jsx-without-return': noJsxWithoutReturn,
    'all-memo': allMemo,
    'no-use-effect': noUseEffect,
    'no-set-state-prop-drilling': noSetStatePropDrilling,
    'no-deopt-use-callback': noDeoptUseCallback,
  },
};

// Define configurations
Object.assign(plugin.configs, {
  recommended: [
    {
      plugins: {
        'laststance': plugin,
      },
      rules: {
        'laststance/no-jsx-without-return': 'error',
        'laststance/all-memo': 'warn',
        'laststance/no-use-effect': 'warn',
        'laststance/no-set-state-prop-drilling': 'warn',
        'laststance/no-deopt-use-callback': 'warn',
      },
    },
  ],
  all: [
    {
      plugins: {
        'laststance': plugin,
      },
      rules: {
        'laststance/no-jsx-without-return': 'error',
        'laststance/all-memo': 'warn',
        'laststance/no-use-effect': 'warn',
        'laststance/no-set-state-prop-drilling': 'warn',
        'laststance/no-deopt-use-callback': 'warn',
      },
    },
  ],
});

export default plugin;