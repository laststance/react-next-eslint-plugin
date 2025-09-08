import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-client-fetch-in-server-components.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
})

ruleTester.run('no-client-fetch-in-server-components', rule, {
  valid: [
    {
      code: `
        async function Page(){
          const res = await fetch('https://example.com');
          return res.ok;
        }
      `,
    },
    {
      code: `
        'use client';
        import axios from 'axios';
        const C = () => { axios.get('/api'); return null };
      `,
    },
  ],
  invalid: [
    {
      code: `
        import axios from 'axios';
        export default async function Page(){
          const res = await axios.get('/api');
          return res.status;
        }
      `,
      errors: [{ messageId: 'noClientFetch' }],
    },
    {
      code: `
        export default async function Page(){
          const res = await $fetch('/api');
          return res.status;
        }
      `,
      errors: [{ messageId: 'noClientFetch' }],
    },
  ],
})
