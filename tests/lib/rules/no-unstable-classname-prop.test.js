import { RuleTester } from 'eslint';
import rule from '../../../lib/rules/no-unstable-classname-prop.js';

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
});

ruleTester.run('no-unstable-classname-prop', rule, {
  valid: [
    { code: `const C = () => <div className="foo bar"/>;` },
    { code: `const classes = ['a','b'].join(' '); const C = () => <div className={classes}/>;` },
  ],
  invalid: [
    { code: `const C = () => <div className={{ a: true }}/>;`, errors: [{ messageId: 'unstableClassName' }] },
    { code: `const C = () => <div className={[ 'a', 'b' ]}/>;`, errors: [{ messageId: 'unstableClassName' }] },
    { code: `import cx from 'classnames'; const C = () => <div className={cx('a', 'b')}/>;`, errors: [{ messageId: 'unstableClassName' }] },
    { code: `const C = () => <div className={'a' + 'b'}/>;`, errors: [{ messageId: 'unstableClassName' }] },
  ],
});
