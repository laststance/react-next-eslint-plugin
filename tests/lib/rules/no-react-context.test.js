import tsParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-react-context.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
})

ruleTester.run('no-react-context', rule, {
  valid: [
    {
      name: 'allows local functions that share React context API names',
      // Arrange & Act
      code: `
        function createContext() {
          return 'local factory'
        }

        function useContext() {
          return 'local reader'
        }

        createContext()
        useContext()
      `,
      // Assert: RuleTester expects no diagnostics.
    },
    {
      name: 'allows matching named imports from non-React modules',
      // Arrange & Act
      code: `
        import { createContext, useContext } from './custom-context.js'

        createContext()
        useContext()
      `,
      // Assert: RuleTester expects no diagnostics.
    },
    {
      name: 'allows unrelated object methods and shadowed React parameters',
      // Arrange & Act
      code: `
        import React from 'react'

        const contextFactory = {
          createContext() {},
          useContext() {},
        }

        function readLocalContext(React) {
          contextFactory.createContext()
          contextFactory.useContext()
          return React.useContext()
        }

        readLocalContext(contextFactory)
      `,
      // Assert: RuleTester expects no diagnostics.
    },
    {
      name: 'allows a locally shadowed require function that returns context-like APIs',
      // Arrange & Act
      code: `
        function require() {
          return {
            createContext() {},
            useContext() {},
          }
        }

        const ReactLibrary = require('react')
        ReactLibrary.createContext()
        ReactLibrary.useContext()
      `,
      // Assert: RuleTester expects no diagnostics.
    },
    {
      name: 'allows cyclic local aliases that do not originate from React',
      // Arrange & Act
      code: `
        const FirstAlias = SecondAlias
        const SecondAlias = FirstAlias

        FirstAlias.useContext()
      `,
      // Assert: RuleTester expects no diagnostics.
    },
  ],
  invalid: [
    {
      name: 'rejects React createContext and useContext named imports',
      // Arrange & Act
      code: `
        import { createContext, useContext } from 'react'

        const ThemeContext = createContext('light')
        const theme = useContext(ThemeContext)
      `,
      // Assert
      errors: [
        {
          messageId: 'noReactContext',
          data: { apiName: 'createContext' },
        },
        {
          messageId: 'noReactContext',
          data: { apiName: 'useContext' },
        },
      ],
    },
    {
      name: 'rejects aliased React context named imports',
      // Arrange & Act
      code: `
        import {
          createContext as makeContext,
          useContext as readContext,
        } from 'react'

        makeContext(null)
        readContext(null)
      `,
      // Assert
      errors: [
        {
          messageId: 'noReactContext',
          data: { apiName: 'createContext' },
        },
        {
          messageId: 'noReactContext',
          data: { apiName: 'useContext' },
        },
      ],
    },
    {
      name: 'rejects context APIs accessed through React import objects',
      // Arrange & Act
      code: `
        import React, * as ReactNamespace from 'react'

        React.createContext(null)
        ReactNamespace.useContext(null)
      `,
      // Assert
      errors: [
        {
          messageId: 'noReactContext',
          data: { apiName: 'createContext' },
        },
        {
          messageId: 'noReactContext',
          data: { apiName: 'useContext' },
        },
      ],
    },
    {
      name: 'rejects computed context API access through a React import alias',
      // Arrange & Act
      code: `
        import ReactLibrary from 'react'

        ReactLibrary['useContext'](null)
      `,
      // Assert
      errors: [
        {
          messageId: 'noReactContext',
          data: { apiName: 'useContext' },
        },
      ],
    },
    {
      name: 'rejects context APIs destructured from a React CommonJS require',
      // Arrange & Act
      code: `
        const {
          createContext: makeContext,
          useContext: readContext,
        } = require('react')

        makeContext(null)
        readContext(null)
      `,
      // Assert
      errors: [
        {
          messageId: 'noReactContext',
          data: { apiName: 'createContext' },
        },
        {
          messageId: 'noReactContext',
          data: { apiName: 'useContext' },
        },
      ],
    },
    {
      name: 'rejects context APIs accessed through React CommonJS objects',
      // Arrange & Act
      code: `
        const ReactLibrary = require('react')

        ReactLibrary.createContext(null)
        require('react').useContext(null)
      `,
      // Assert
      errors: [
        {
          messageId: 'noReactContext',
          data: { apiName: 'createContext' },
        },
        {
          messageId: 'noReactContext',
          data: { apiName: 'useContext' },
        },
      ],
    },
    {
      name: 'rejects context APIs destructured from a React namespace import',
      // Arrange & Act
      code: `
        import * as ReactLibrary from 'react'

        const { createContext, useContext: readContext } = ReactLibrary

        createContext(null)
        readContext(null)
      `,
      // Assert
      errors: [
        {
          messageId: 'noReactContext',
          data: { apiName: 'createContext' },
        },
        {
          messageId: 'noReactContext',
          data: { apiName: 'useContext' },
        },
      ],
    },
    {
      name: 'rejects context APIs accessed through chained React aliases',
      // Arrange & Act
      code: `
        import React from 'react'

        const ReactAlias = React
        const NestedReactAlias = ReactAlias

        ReactAlias.createContext(null)
        NestedReactAlias.useContext(null)
      `,
      // Assert
      errors: [
        {
          messageId: 'noReactContext',
          data: { apiName: 'createContext' },
        },
        {
          messageId: 'noReactContext',
          data: { apiName: 'useContext' },
        },
      ],
    },
    {
      name: 'rejects context APIs accessed through a TypeScript import-equals binding',
      // Arrange & Act
      code: `
        import React = require('react')

        React.createContext(null)
        React.useContext(null)
      `,
      languageOptions: {
        parser: tsParser,
      },
      // Assert
      errors: [
        {
          messageId: 'noReactContext',
          data: { apiName: 'createContext' },
        },
        {
          messageId: 'noReactContext',
          data: { apiName: 'useContext' },
        },
      ],
    },
  ],
})
