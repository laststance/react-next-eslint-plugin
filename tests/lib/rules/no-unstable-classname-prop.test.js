import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-unstable-classname-prop.js'

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

ruleTester.run('no-unstable-classname-prop', rule, {
  valid: [
    { code: 'const C = () => <div className="foo bar"/>;' },
    {
      code: "const classes = ['a','b'].join(' '); const C = () => <div className={classes}/>;",
    },
    {
      code: `
        import { useMemo } from 'react';
        const C = ({ theme }) => {
          const stable = useMemo(() => ['btn', theme].join(' '), [theme]);
          return <div className={stable}/>;
        };
      `,
    },
    {
      code: `
        import { cn } from '@/lib/utils';
        const C = ({ active }) => <div className={cn('btn', active && 'is-active')}/>;
      `,
    },
    {
      code: `
        import { cva } from 'class-variance-authority';
        const C = () => <div className={cva('btn')({})}/>;
      `,
    },
    {
      code: `
        import clsx from 'clsx';
        const C = ({ active }) => <div className={clsx('btn', { active })}/>;
      `,
    },
    {
      code: `
        import classnames from 'classnames';
        const C = ({ active }) => <div className={classnames('btn', { active })}/>;
      `,
    },
  ],
  invalid: [
    {
      code: 'const C = () => <div className={{ a: true }}/>;',
      errors: [{ messageId: 'unstableClassName' }],
    },
    {
      code: "const C = () => <div className={[ 'a', 'b' ]}/>;",
      errors: [{ messageId: 'unstableClassName' }],
    },
    {
      code: "const makeClasses = () => 'btn'; const C = () => <div className={makeClasses()}/>;",
      errors: [{ messageId: 'unstableClassName' }],
    },
    {
      code: "const C = () => <div className={'a' + 'b'}/>;",
      errors: [{ messageId: 'unstableClassName' }],
    },
    {
      code: `
        const C = ({ theme }) => <div className={'btn-' + theme}/>;
      `,
      errors: [{ messageId: 'unstableClassName' }],
    },
  ],
})
