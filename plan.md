# ESLint Plugin npm Package Implementation Plan

## Overview

This document outlines a comprehensive plan for creating a professional ESLint plugin npm package by porting an existing project's specific ESLint rule. The plan follows ESLint's official documentation and best practices from successful plugins like `eslint-plugin-unicorn`.

## Phase 1: Project Setup and Structure

### 1.1 Initialize Project Structure

```
eslint-plugin-[name]/
├── package.json
├── README.md
├── LICENSE
├── .gitignore
├── .npmignore
├── index.js (plugin entry point)
├── lib/
│   └── rules/
│       └── [rule-name].js
├── docs/
│   └── rules/
│       └── [rule-name].md
├── tests/
│   └── lib/
│       └── rules/
│           └── [rule-name].test.js
├── eslint.config.js
└── .github/
    └── workflows/
        └── ci.yml
```

### 1.2 Package.json Configuration

```json
{
  "name": "eslint-plugin-[name]",
  "version": "1.0.0",
  "description": "ESLint plugin for [description]",
  "main": "index.js",
  "keywords": [
    "eslint",
    "eslintplugin",
    "eslint-plugin",
    "lint",
    "linter",
    "[specific-keywords]"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/[username]/eslint-plugin-[name].git"
  },
  "bugs": {
    "url": "https://github.com/[username]/eslint-plugin-[name]/issues"
  },
  "homepage": "https://github.com/[username]/eslint-plugin-[name]#readme",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "test": "mocha tests/**/*.test.js",
    "test:watch": "npm test -- --watch",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "release": "np",
    "prepublishOnly": "npm test && npm run lint"
  },
  "peerDependencies": {
    "eslint": ">=9.0.0"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "mocha": "^10.0.0",
    "prettier": "^3.0.0",
    "np": "^10.0.0"
  },
  "files": ["index.js", "lib/", "docs/", "README.md", "LICENSE"]
}
```

### 1.3 Plugin Entry Point (index.js)

```javascript
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
import ruleName from './lib/rules/rule-name.js'

const plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
    namespace: '[plugin-namespace]',
  },
  configs: {},
  rules: {
    '[rule-name]': ruleName,
  },
}

// Define configurations
Object.assign(plugin.configs, {
  recommended: [
    {
      plugins: {
        '[plugin-namespace]': plugin,
      },
      rules: {
        '[plugin-namespace]/[rule-name]': 'error',
      },
    },
  ],
  all: [
    {
      plugins: {
        '[plugin-namespace]': plugin,
      },
      rules: {
        '[plugin-namespace]/[rule-name]': 'error',
      },
    },
  ],
})

export default plugin
```

## Phase 2: Rule Development

### 2.1 Port Existing Rule

- **Extract rule logic** from existing project
- **Analyze AST patterns** the rule targets
- **Identify dependencies** and utilities needed
- **Map existing configuration options** to new plugin structure

### 2.2 Rule Structure (lib/rules/[rule-name].js)

```javascript
export default {
  meta: {
    type: 'problem', // 'problem', 'suggestion', or 'layout'
    docs: {
      description: 'Description of what the rule does',
      category: 'Possible Errors', // or appropriate category
      recommended: true,
      url: 'https://github.com/[username]/eslint-plugin-[name]/blob/main/docs/rules/[rule-name].md',
    },
    fixable: 'code', // 'code', 'whitespace', or null
    hasSuggestions: false, // true if rule provides suggestions
    schema: [
      // JSON Schema for rule options
      {
        type: 'object',
        properties: {
          // option definitions
        },
        additionalProperties: false,
      },
    ],
    messages: {
      // Define message IDs and templates
      defaultMessage: 'Default error message',
      customMessage: 'Custom message with {{placeholder}}',
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const sourceCode = context.sourceCode

    return {
      // AST visitor methods
      NodeType(node) {
        // Rule logic here
        if (conditionMet) {
          context.report({
            node,
            messageId: 'defaultMessage',
            data: {
              placeholder: 'value',
            },
            fix(fixer) {
              // Auto-fix logic if applicable
              return fixer.replaceText(node, 'replacement')
            },
            suggest: [
              // Suggestions if applicable
              {
                messageId: 'customMessage',
                fix(fixer) {
                  return fixer.replaceText(node, 'suggestion')
                },
              },
            ],
          })
        }
      },
    }
  },
}
```

### 2.3 Rule Options and Configuration

- **Define schema** for rule options validation
- **Implement default values** for options
- **Add option validation** and error handling
- **Document all options** with examples

## Phase 3: Testing Strategy

### 3.1 Unit Tests (tests/lib/rules/[rule-name].test.js)

```javascript
import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/rule-name.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
})

ruleTester.run('rule-name', rule, {
  valid: [
    // Valid code examples
    {
      code: 'const valid = "code";',
    },
    {
      code: 'const validWithOptions = "code";',
      options: [{ option: 'value' }],
    },
  ],

  invalid: [
    // Invalid code examples
    {
      code: 'const invalid = "code";',
      errors: [
        {
          messageId: 'defaultMessage',
          line: 1,
          column: 1,
        },
      ],
    },
    {
      code: 'const invalidWithFix = "code";',
      output: 'const validAfterFix = "code";',
      errors: [
        {
          messageId: 'defaultMessage',
          line: 1,
          column: 1,
        },
      ],
    },
    {
      code: 'const invalidWithSuggestions = "code";',
      errors: [
        {
          messageId: 'defaultMessage',
          line: 1,
          column: 1,
          suggestions: [
            {
              messageId: 'customMessage',
              output: 'const suggestedFix = "code";',
            },
          ],
        },
      ],
    },
  ],
})
```

### 3.2 Test Coverage Requirements

- **Valid cases**: Test all valid code patterns
- **Invalid cases**: Test all invalid code patterns
- **Options testing**: Test all configuration options
- **Edge cases**: Test boundary conditions
- **Autofix testing**: Test fix functionality
- **Suggestions testing**: Test suggestion functionality
- **Error messages**: Verify correct error messages

### 3.3 Integration Tests

- Test plugin integration with ESLint
- Test with different ESLint configurations
- Test with other plugins for compatibility

## Phase 4: Documentation

### 4.1 Rule Documentation (docs/rules/[rule-name].md)

````markdown
# rule-name

> Description of what the rule does

## Rule Details

This rule aims to [description].

## Examples

### ❌ Incorrect

```javascript
// Bad code examples
```
````

### ✅ Correct

```javascript
// Good code examples
```

## Options

### `option1` (default: `defaultValue`)

Description of option1.

### `option2` (default: `defaultValue`)

Description of option2.

## When Not To Use It

Explain when this rule should be disabled.

## Further Reading

- [Related documentation](link)

````

### 4.2 README.md
- **Installation instructions**
- **Usage examples**
- **Configuration options**
- **Rule documentation links**
- **Contributing guidelines**
- **License information**

### 4.3 CHANGELOG.md
- **Version history**
- **Breaking changes**
- **New features**
- **Bug fixes**

## Phase 5: Quality Assurance

### 5.1 Linting Setup
```javascript
// eslint.config.js
import js from '@eslint/js';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';

export default [
  js.configs.recommended,
  eslintPluginUnicorn.configs.recommended,
  {
    rules: {
      // Custom rule overrides
    },
  },
];
````

### 5.2 Code Formatting

- **Prettier configuration**
- **EditorConfig setup**
- **Consistent code style**

### 5.3 CI/CD Pipeline (.github/workflows/ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run format:check
```

## Phase 6: Publishing Preparation

### 6.1 Pre-publish Checklist

- [ ] All tests passing
- [ ] Linting passes
- [ ] Documentation complete
- [ ] CHANGELOG updated
- [ ] Version bumped appropriately
- [ ] README badges updated
- [ ] Examples tested

### 6.2 npm Package Configuration

- **Configure .npmignore**
- **Set up package.json files field**
- **Verify package size**
- **Test npm pack output**

### 6.3 Semantic Versioning

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

## Phase 7: Release and Maintenance

### 7.1 Publishing Process

```bash
# Test package locally first
npm pack
npm install -g ./eslint-plugin-[name]-1.0.0.tgz

# Test in another project
cd /path/to/test-project
npm install eslint-plugin-[name]

# Publish to npm
npm publish
```

### 7.2 Post-Release

- **Create GitHub release**
- **Update documentation**
- **Announce on relevant platforms**
- **Monitor for issues**

### 7.3 Maintenance Strategy

- **Issue triage process**
- **Security updates**
- **ESLint compatibility updates**
- **Community contributions**

## Phase 8: Advanced Features

### 8.1 Multiple Rules Support

- **Expand rule set** if needed
- **Organized rule categories**
- **Preset configurations**

### 8.2 Performance Optimization

- **Rule performance testing**
- **Memory usage optimization**
- **AST traversal efficiency**

### 8.3 Developer Experience

- **TypeScript support**
- **IDE integration guides**
- **Debug configuration**

## Best Practices Summary

### Rule Development

1. **Follow ESLint conventions** for rule structure
2. **Use messageId** instead of direct messages
3. **Provide comprehensive options** with validation
4. **Implement autofix** when possible
5. **Add suggestions** for complex fixes

### Testing

1. **Comprehensive test coverage** (>95%)
2. **Test edge cases** thoroughly
3. **Validate error messages** and positions
4. **Test with real-world code** examples

### Documentation

1. **Clear rule descriptions** with examples
2. **Document all options** with defaults
3. **Provide migration guides** if needed
4. **Keep README updated** with latest features

### Maintenance

1. **Semantic versioning** strictly followed
2. **Responsive issue handling**
3. **Regular dependency updates**
4. **ESLint compatibility** maintained

## Sequential Implementation Steps

### Step 1: Project Initialization (Day 1)

1. Create directory structure
2. Initialize npm project with `npm init`
3. Set up package.json with proper configuration
4. Create basic README and LICENSE files
5. Initialize Git repository

### Step 2: Core Plugin Structure (Day 1-2)

1. Create plugin entry point (index.js)
2. Set up meta information with package.json reading
3. Create basic rule structure template
4. Configure ESM exports

### Step 3: Rule Porting (Day 2-3)

1. Analyze existing rule's AST patterns
2. Extract rule logic and port to new structure
3. Implement meta information (type, docs, schema)
4. Add messageId-based error reporting
5. Port configuration options with validation

### Step 4: Testing Implementation (Day 3-4)

1. Set up RuleTester framework
2. Create comprehensive test cases
3. Test valid and invalid scenarios
4. Add edge case testing
5. Verify autofix functionality

### Step 5: Documentation (Day 4-5)

1. Write detailed rule documentation
2. Create usage examples
3. Document configuration options
4. Update README with installation/usage
5. Add contributing guidelines

### Step 6: Quality Assurance (Day 5-6)

1. Set up ESLint configuration for the plugin itself
2. Add Prettier for code formatting
3. Configure CI/CD pipeline
4. Run comprehensive testing suite
5. Performance optimization

### Step 7: Publishing Preparation (Day 6-7)

1. Configure .npmignore and package files
2. Test package locally with `npm pack`
3. Verify functionality in test project
4. Create release documentation
5. Set up semantic versioning

### Step 8: Release and Post-Release (Day 7)

1. Publish to npm registry
2. Create GitHub release
3. Update documentation
4. Monitor for initial feedback
5. Plan maintenance strategy

## Tools and Resources

### Essential Development Tools

- **ESLint**: Core linting engine (>=9.0.0)
- **RuleTester**: Official rule testing utility
- **AST Explorer**: For understanding AST structure
- **Mocha/Jest**: Testing framework
- **Prettier**: Code formatting

### Development Workflow Tools

- **np**: Automated release management
- **GitHub Actions**: CI/CD automation
- **semantic-release**: Version management
- **Codecov**: Test coverage reporting

### Documentation and Communication

- **Markdown**: Documentation format
- **GitHub Pages**: Documentation hosting
- **Shields.io**: Status badges
- **Twitter/Discord**: Community engagement

## Key Implementation Considerations

### ESLint Compatibility

- Support ESLint 9.x flat configuration format
- Maintain backward compatibility when possible
- Follow ESLint's plugin development guidelines
- Use official ESLint APIs and utilities

### Modern JavaScript Features

- Use ES modules (ESM) for plugin structure
- Leverage async/await for asynchronous operations
- Implement proper error handling
- Use modern Node.js features (>=18.0.0)

### Performance Optimization

- Minimize AST traversal overhead
- Use selective node visiting patterns
- Cache expensive computations
- Profile rule performance regularly

### User Experience

- Clear, actionable error messages
- Comprehensive autofix capabilities
- Intuitive configuration options
- Excellent documentation with examples

## Success Metrics

### Technical Metrics

- **Test Coverage**: >95%
- **Performance**: <10ms per rule execution
- **Compatibility**: ESLint 9.x+ support
- **Bundle Size**: <100KB total

### Community Metrics

- **Downloads**: Track npm download statistics
- **Issues**: Response time <48 hours
- **Stars**: GitHub repository engagement
- **Adoption**: Integration in popular projects

## Timeline Summary

**Phase 1-2 (Days 1-3)**: Project setup and rule porting
**Phase 3 (Days 3-4)**: Comprehensive testing
**Phase 4 (Days 4-5)**: Documentation
**Phase 5 (Days 5-6)**: Quality assurance
**Phase 6-7 (Days 6-7)**: Publishing and release
**Phase 8 (Ongoing)**: Maintenance and enhancements

**Total Initial Development**: 7 days
**Ongoing Maintenance**: 2-4 hours per month

This plan provides a structured, sequential approach to creating a professional ESLint plugin npm package that follows industry best practices and official ESLint guidelines.
