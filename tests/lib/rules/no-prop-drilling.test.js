import { RuleTester } from 'eslint'
import rule from '../../../lib/rules/no-prop-drilling.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
})

ruleTester.run('no-prop-drilling', rule, {
  valid: [
    {
      name: 'allows rendering a received prop after one same-file component boundary',
      // Arrange: a received prop crosses one component boundary and is rendered by the child.
      code: `
        function Parent({ value }) {
          return <Child value={value} />;
        }
        function Child({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester runs the rule with its fixed one-level allowance.
      // Assert: rendering after one component boundary produces no error.
    },
    {
      name: 'allows consuming a received prop in an intrinsic element',
      // Arrange: the child consumes the received prop in an intrinsic element attribute.
      code: `
        function Parent({ value }) {
          return <Child value={value} />;
        }
        function Child({ value }) {
          return <div data-value={value} />;
        }
      `,
      // Act: RuleTester sees the intrinsic JSX target without adding a component edge.
      // Assert: DOM consumption is naturally outside the component-depth graph.
    },
    {
      name: 'allows an imported component to end the known same-file chain',
      // Arrange: a received prop leaves the known graph through an imported component.
      code: `
        import { LibraryWidget } from 'library';
        function Parent({ value }) {
          return <Child value={value} />;
        }
        function Child({ value }) {
          return <LibraryWidget value={value} />;
        }
      `,
      // Act: RuleTester cannot connect the imported target to a same-file definition.
      // Assert: no library allowlist is required and the unknown edge is not reported.
    },
    {
      name: 'allows a local value to cross two components before it becomes a drilled prop',
      // Arrange: a locally created value, rather than a received prop, crosses two components.
      code: `
        function Parent() {
          const value = 'local';
          return <Child value={value} />;
        }
        function Child({ value }) {
          return <Grandchild value={value} />;
        }
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester looks for a received-prop source at the first component edge.
      // Assert: local values are outside this rule's prop-drilling contract.
    },
    {
      name: 'allows an imported target when an unrelated nested component has the same name',
      // Arrange: an import and a nested same-file component share one PascalCase name.
      code: `
        import { Child } from './child.js';
        function Parent({ value }) {
          return <Child value={value} />;
        }
        function UnrelatedWrapper() {
          function Child({ value }) {
            return <Grandchild value={value} />;
          }
          return <Child value="local" />;
        }
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester resolves each Child reference from its lexical scope.
      // Assert: the imported edge does not connect to the unrelated nested definition.
    },
    {
      name: 'allows a callback-local value that shadows a received prop',
      // Arrange: a nested callback shadows the prop name before rendering another component.
      code: `
        function Parent({ value }) {
          return <Child value={value} />;
        }
        function Child({ value }) {
          const renderLocalValue = () => {
            const value = 'local';
            return <Grandchild value={value} />;
          };
          return <section>{renderLocalValue()}</section>;
        }
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester resolves the JSX identifier to the callback-local binding.
      // Assert: a shadowed local value is not treated as the outer received prop.
    },
    {
      name: 'allows local createElement and memo helpers that do not come from React',
      // Arrange: local helpers share React API names but have no React binding.
      code: `
        function createElement(target, props) {
          return { target, props };
        }
        function memo(component) {
          return component;
        }
        function Parent({ value }) {
          return createElement(Child, { value });
        }
        const Child = memo(({ value }) => createElement(Grandchild, { value }));
        function Grandchild({ value }) {
          return createElement('span', { value });
        }
      `,
      // Act: RuleTester resolves both helper callees from lexical imports.
      // Assert: matching local names are not treated as React component syntax.
    },
  ],
  invalid: [
    {
      name: 'reports the second same-file component boundary for a received prop',
      // Arrange: a received prop is forwarded through two component boundaries.
      code: `
        function Parent({ value }) {
          return <Child value={value} />;
        }
        function Child({ value }) {
          return <Grandchild value={value} />;
        }
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester runs the rule with its fixed one-level allowance.
      // Assert: only the second component boundary is rejected.
      errors: [{ messageId: 'noPropDrilling' }],
    },
    {
      name: 'reports every same-file forwarding boundary from depth two onward',
      // Arrange: the same received prop is forwarded across three component boundaries.
      code: `
        function Parent({ value }) {
          return <Child value={value} />;
        }
        function Child({ value }) {
          return <Grandchild value={value} />;
        }
        function Grandchild({ value }) {
          return <GreatGrandchild value={value} />;
        }
        function GreatGrandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester evaluates every same-file component edge.
      // Assert: both the second and third forwarding levels are rejected.
      errors: [
        { messageId: 'noPropDrilling' },
        { messageId: 'noPropDrilling' },
      ],
    },
    {
      name: 'reports the second boundary after a received prop is aliased',
      // Arrange: the child renames a received prop before forwarding it again.
      code: `
        function Parent({ value }) {
          return <Child value={value} />;
        }
        function Child({ value }) {
          const forwardedValue = value;
          return <Grandchild value={forwardedValue} />;
        }
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester evaluates the alias used by the second component edge.
      // Assert: renaming the value does not bypass the depth restriction.
      errors: [{ messageId: 'noPropDrilling' }],
    },
    {
      name: 'reports the second boundary when props objects and receiving names differ',
      // Arrange: props objects and different receiving prop names form the same two-level chain.
      code: `
        function Parent(props) {
          return <Child currentValue={props.value} />;
        }
        function Child(props) {
          return <Grandchild displayValue={props.currentValue} />;
        }
        function Grandchild({ displayValue }) {
          return <span>{displayValue}</span>;
        }
      `,
      // Act: RuleTester follows each static props.member reference by its receiving name.
      // Assert: changing prop names does not reset the component depth.
      errors: [{ messageId: 'noPropDrilling' }],
    },
    {
      name: 'reports the second boundary when complete props objects are spread',
      // Arrange: the complete props object is spread across two component boundaries.
      code: `
        function Parent(props) {
          return <Child {...props} />;
        }
        function Child(props) {
          return <Grandchild {...props} />;
        }
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester evaluates both JSX spread edges.
      // Assert: spreading props does not bypass the second-level restriction.
      errors: [{ messageId: 'noPropDrilling' }],
    },
    {
      name: 'reports the second boundary when components use React.createElement',
      // Arrange: received props are forwarded twice with React.createElement.
      code: `
        import React from 'react';
        function Parent({ value }) {
          return React.createElement(Child, { value });
        }
        function Child({ value }) {
          return React.createElement(Grandchild, { value });
        }
        function Grandchild({ value }) {
          return React.createElement('span', null, value);
        }
      `,
      // Act: RuleTester evaluates createElement component and props arguments.
      // Assert: JSX-free component syntax follows the same second-level restriction.
      errors: [{ messageId: 'noPropDrilling' }],
    },
    {
      name: 'reports the second boundary for a property read from an object prop',
      // Arrange: the second component forwards a property read from a received object prop.
      code: `
        function Parent({ user }) {
          return <Child user={user} />;
        }
        function Child({ user }) {
          return <Grandchild label={user.name} />;
        }
        function Grandchild({ label }) {
          return <span>{label}</span>;
        }
      `,
      // Act: RuleTester traces the member expression back to its received object prop.
      // Assert: reading a nested value does not reset the forwarding depth.
      errors: [{ messageId: 'noPropDrilling' }],
    },
    {
      name: 'reports the second boundary inside an anonymous memoized component',
      // Arrange: the forwarding component is an anonymous arrow wrapped in React.memo.
      code: `
        import { memo } from 'react';
        function Parent({ value }) {
          return <Child value={value} />;
        }
        const Child = memo(({ value }) => <Grandchild value={value} />);
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester resolves the memoized variable as the Child component.
      // Assert: memoization does not hide the second component boundary.
      errors: [{ messageId: 'noPropDrilling' }],
    },
    {
      name: 'reports the second boundary from a conditional component return',
      // Arrange: the forwarding component returns JSX from an if branch.
      code: `
        function Parent({ value }) {
          return <Child value={value} />;
        }
        function Child({ value }) {
          if (value) {
            return <Grandchild value={value} />;
          }
          return null;
        }
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester inspects returns nested in the component's control flow.
      // Assert: conditional rendering does not hide the second boundary.
      errors: [{ messageId: 'noPropDrilling' }],
    },
    {
      name: 'reports the second boundary from a conditional arrow expression',
      // Arrange: an arrow component returns JSX through a conditional expression.
      code: `
        function Parent({ value }) {
          return <Child value={value} />;
        }
        const Child = ({ value }) =>
          value ? <Grandchild value={value} /> : null;
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester searches the arrow expression for JSX branches.
      // Assert: expression-style conditional rendering still exposes depth two.
      errors: [{ messageId: 'noPropDrilling' }],
    },
    {
      name: 'reports the second boundary after props are destructured in the component body',
      // Arrange: the child destructures its props object before forwarding one value.
      code: `
        function Parent({ value }) {
          return <Child value={value} />;
        }
        function Child(props) {
          const { value } = props;
          return <Grandchild value={value} />;
        }
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester follows the body-level destructured binding.
      // Assert: moving destructuring out of the parameter does not bypass depth two.
      errors: [{ messageId: 'noPropDrilling' }],
    },
    {
      name: 'reports the second boundary after rest props are created in the component body',
      // Arrange: both components spread props and the child first creates a rest alias.
      code: `
        function Parent(props) {
          return <Child {...props} />;
        }
        function Child(props) {
          const { ...restProps } = props;
          return <Grandchild {...restProps} />;
        }
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester follows the rest binding as the same received props object.
      // Assert: body-level rest spreading cannot reset the known depth.
      errors: [{ messageId: 'noPropDrilling' }],
    },
    {
      name: 'reports the second boundary after rest props are created in the component parameter',
      // Arrange: the child receives all remaining props through parameter-level rest syntax.
      code: `
        function Parent(props) {
          return <Child {...props} />;
        }
        function Child({ ...restProps }) {
          return <Grandchild {...restProps} />;
        }
        function Grandchild({ value }) {
          return <span>{value}</span>;
        }
      `,
      // Act: RuleTester follows the parameter rest binding as the received props object.
      // Assert: parameter-level rest syntax cannot reset the known depth.
      errors: [{ messageId: 'noPropDrilling' }],
    },
  ],
})
