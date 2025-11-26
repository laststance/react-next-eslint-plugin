import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-direct-use-effect.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
})

ruleTester.run('no-direct-use-effect', rule, {
  valid: [
    {
      code: `
        import { useEffect, useState } from 'react'

        function useDataLoader() {
          const [value, setValue] = useState(null)
          useEffect(() => {
            setValue('ready')
          }, [])
          return value
        }

        function Component() {
          const value = useDataLoader()
          return <div>{value}</div>
        }
      `,
    },
    {
      code: `
        import { useEffect } from 'react'

        function helper() {
          useEffect(() => {}, [])
        }
      `,
    },
    {
      code: `
        import { useEffect } from 'react'

        const useFeatureFlag = () => {
          useEffect(() => {}, [])
        }

        const Page = () => {
          useFeatureFlag()
          return <section>ok</section>
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { useEffect } from 'react'

        function Component() {
          useEffect(() => {
            console.log('fire')
          }, [])
          return <div />
        }
      `,
      errors: [{ messageId: 'noDirectUseEffect', type: 'CallExpression' }],
    },
    {
      code: `
        import React from 'react'

        const Page = () => {
          React.useEffect(() => {}, [])
          return <main>hello</main>
        }
      `,
      errors: [{ messageId: 'noDirectUseEffect', type: 'CallExpression' }],
    },
    {
      code: `
        import { useEffect } from 'react'

        export default function () {
          useEffect(() => {}, [])
          return <span>anon</span>
        }
      `,
      errors: [{ messageId: 'noDirectUseEffect', type: 'CallExpression' }],
    },
  ],
})
