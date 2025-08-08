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

const plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
    namespace: 'laststance',
  },
  configs: {},
  rules: {
    'no-jsx-without-return': noJsxWithoutReturn,
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
      },
    },
  ],
});

export default plugin;