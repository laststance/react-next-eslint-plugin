# no-react-context

Disallow React's `createContext` and `useContext` APIs.

🔧 [Rule Source](../../lib/rules/no-react-context.js)

## Rule Details

This rule keeps data dependencies and update boundaries explicit by preventing application code from creating or consuming React Context. Prefer props and component composition for local data flow, or an external state store when state must be shared broadly.

The rule reports:

- Named imports, including aliases
- `React.createContext` and `React.useContext` member access
- Default, namespace, and chained React object aliases
- Static bracket access such as `React['useContext']`
- CommonJS `require('react')` member access and destructuring
- TypeScript `import React = require('react')` syntax

Matching local functions, imports from non-React modules, unrelated object methods, and shadowed identifiers are allowed.

## Examples

### ❌ Incorrect

```javascript
import { createContext, useContext } from 'react'

const ThemeContext = createContext('light')

function ThemeLabel() {
  const theme = useContext(ThemeContext)
  return <span>{theme}</span>
}
```

```javascript
import React, * as ReactNamespace from 'react'

React.createContext(null)
ReactNamespace.useContext(null)
```

```javascript
const { createContext } = require('react')
const ReactLibrary = require('react')

createContext(null)
ReactLibrary.useContext(null)
```

### ✅ Correct

```javascript
function ThemeLabel({ theme }) {
  return <span>{theme}</span>
}

function Page() {
  return <ThemeLabel theme="light" />
}
```

```javascript
import { useSelector } from 'react-redux'

function AccountName() {
  const accountName = useSelector((state) => state.account.name)
  return <span>{accountName}</span>
}
```

```javascript
import { createContext } from './custom-context.js'

createContext()
```

## Options

This rule has no configuration options.

## When Not To Use It

Do not enable this rule when React Context is an intentional part of the application's architecture, when a library API requires a Context provider, or while incrementally migrating existing Context usage.
