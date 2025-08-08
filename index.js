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
      },
    },
  ],
});

export default plugin;