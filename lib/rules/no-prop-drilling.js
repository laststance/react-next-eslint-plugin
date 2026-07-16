import { isJSX } from '../utils/jsx.js'
import { isPascalCase } from '../utils/naming.js'
import {
  findVariableByName,
  getRuleScope,
  getRuleSourceCode,
} from '../utils/eslint-context.js'

/**
 * @fileoverview Disallow forwarding received props through two or more component levels.
 * @author laststance
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow forwarding received props through two or more same-file component levels.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      noPropDrilling:
        'Avoid forwarding the received prop "{{name}}" through two or more component levels. Read the value closer to its owner or use composition or state management.',
    },
  },

  /**
   * Tracks received props across same-file JSX component edges so ESLint can reject the second and later forwarding levels.
   * @param {import('eslint').Rule.RuleContext} context The ESLint rule context that calls this rule for one source file.
   * @returns
   * - An ESLint visitor that records components and JSX prop passes
   * - Reports every known same-file pass at depth two or greater on Program exit
   * @example
   * create(context) // => { FunctionDeclaration() {}, JSXAttribute() {}, 'Program:exit'() {} }
   */
  create(context) {
    const FIRST_PARAM_INDEX = 0
    const STACK_TOP_OFFSET = 1
    const EMPTY_STACK_LENGTH = 0
    const DIRECT_PROP_DEPTH = 0
    const DEPTH_INCREMENT = 1
    const FIRST_FORBIDDEN_DEPTH = 2
    const ALL_PROPS_NAME = '*'
    const CREATE_ELEMENT_TARGET_INDEX = 0
    const CREATE_ELEMENT_PROPS_INDEX = 1
    const MIN_CREATE_ELEMENT_ARGUMENTS = 2
    const sourceCode = getRuleSourceCode(context)
    const componentStack = []
    const components = new Map()
    const componentsByDefinitionNode = new Map()
    const propPasses = []

    /**
     * Recognizes an unshadowed CommonJS require('react') call when namespace aliases are resolved.
     * @param {import('estree').Node | null | undefined} node The possible require call.
     * @returns
     * - True only for the global require function with the React module argument
     * - False for local require functions and other calls
     * @example
     * isReactRequireCall(requireCallNode) // => true for require('react')
     */
    function isReactRequireCall(node) {
      if (
        !node ||
        node.type !== 'CallExpression' ||
        node.callee.type !== 'Identifier' ||
        node.callee.name !== 'require' ||
        node.arguments.length !== 1 ||
        node.arguments[0].type !== 'Literal' ||
        node.arguments[0].value !== 'react'
      ) {
        return false
      }
      const requireVariable = resolveIdentifierVariable(node.callee)
      return Boolean(
        sourceCode.isGlobalReference(node.callee) || !requireVariable,
      )
    }

    /**
     * Proves a lexical variable is React's default/namespace object while following simple aliases without cycles.
     * @param {import('eslint').Scope.Variable | null} variable The namespace candidate resolved from scope.
     * @param {Set<import('eslint').Scope.Variable>} [visitedVariables] Variables already inspected during alias traversal.
     * @returns
     * - True for React default/namespace imports and require aliases
     * - False for local objects, named imports, and cyclic aliases
     * @example
     * isReactNamespaceVariable(reactVariable) // => true
     */
    function isReactNamespaceVariable(variable, visitedVariables = new Set()) {
      if (!variable || visitedVariables.has(variable)) return false
      visitedVariables.add(variable)
      return variable.defs.some((definition) => {
        if (definition.type === 'ImportBinding') {
          return Boolean(
            definition.parent?.type === 'ImportDeclaration' &&
            definition.parent.source.value === 'react' &&
            (definition.node.type === 'ImportDefaultSpecifier' ||
              definition.node.type === 'ImportNamespaceSpecifier'),
          )
        }
        if (
          definition.type !== 'Variable' ||
          definition.node.type !== 'VariableDeclarator'
        ) {
          return false
        }
        const initializerNode = definition.node.init
        if (isReactRequireCall(initializerNode)) return true
        return Boolean(
          initializerNode?.type === 'Identifier' &&
          isReactNamespaceVariable(
            resolveIdentifierVariable(initializerNode),
            visitedVariables,
          ),
        )
      })
    }

    /**
     * Proves an expression is the React namespace before member APIs such as React.memo are recognized.
     * @param {import('estree').Node | null | undefined} node The namespace expression before an API property.
     * @returns
     * - True for imported, required, aliased, or unshadowed global React objects
     * - False for local same-shaped objects
     * @example
     * isReactNamespaceExpression(reactIdentifier) // => true
     */
    function isReactNamespaceExpression(node) {
      if (!node) return false
      if (isReactRequireCall(node)) return true
      if (node.type !== 'Identifier') return false
      const variable = resolveIdentifierVariable(node)
      if (!variable) {
        return node.name === 'React' && sourceCode.isGlobalReference(node)
      }
      return isReactNamespaceVariable(variable)
    }

    /**
     * Proves an identifier is one named API imported from React so local same-named helpers remain valid.
     * @param {import('estree').Identifier} identifierNode The direct call identifier.
     * @param {string} apiName The expected React export name.
     * @returns
     * - True when the exact lexical binding is a matching React named import
     * - False for local, shadowed, and non-React bindings
     * @example
     * isNamedReactApiIdentifier(memoIdentifier, 'memo') // => true for import { memo } from 'react'
     */
    function isNamedReactApiIdentifier(identifierNode, apiName) {
      const variable = resolveIdentifierVariable(identifierNode)
      if (!variable) return false
      return variable.defs.some(
        (definition) =>
          definition.type === 'ImportBinding' &&
          definition.parent?.type === 'ImportDeclaration' &&
          definition.parent.source.value === 'react' &&
          definition.node.type === 'ImportSpecifier' &&
          definition.node.imported.type === 'Identifier' &&
          definition.node.imported.name === apiName,
      )
    }

    /**
     * Recognizes one React API callee by lexical provenance rather than matching local function names.
     * @param {import('estree').Expression | import('estree').Super} calleeNode The call expression callee.
     * @param {string} apiName The React API expected at that call site.
     * @returns
     * - True for a matching React named import or namespace member
     * - False for local and unrelated callees
     * @example
     * isReactApiCallee(callNode.callee, 'createElement') // => true for React.createElement
     */
    function isReactApiCallee(calleeNode, apiName) {
      if (calleeNode.type === 'Identifier') {
        return isNamedReactApiIdentifier(calleeNode, apiName)
      }
      if (calleeNode.type !== 'MemberExpression') return false
      const propertyName = !calleeNode.computed
        ? getStaticPropertyName(calleeNode.property)
        : calleeNode.property.type === 'Literal' &&
            typeof calleeNode.property.value === 'string'
          ? calleeNode.property.value
          : null
      return (
        propertyName === apiName &&
        isReactNamespaceExpression(calleeNode.object)
      )
    }

    /**
     * Recognizes React.createElement and imported createElement calls so JSX-free components join the same graph.
     * @param {import('estree').Node | null | undefined} node The possible call expression.
     * @returns
     * - True for createElement(...) and React.createElement(...)
     * - False for every other node
     * @example
     * isCreateElementCall({ type: 'CallExpression', callee: { type: 'Identifier', name: 'createElement' } }) // => true
     */
    function isCreateElementCall(node) {
      if (!node || node.type !== 'CallExpression') return false
      return isReactApiCallee(node.callee, 'createElement')
    }

    /**
     * Finds JSX/createElement inside a returned expression such as a conditional or logical branch.
     * @param {import('estree').Node | null | undefined} node The returned expression subtree.
     * @returns
     * - True when the expression can produce a React element
     * - False when no React element syntax exists or a nested function starts
     * @example
     * containsReactElementExpression(conditionalNode) // => true when one branch is JSX
     */
    function containsReactElementExpression(node) {
      if (!node) return false
      if (isJSX(node) || isCreateElementCall(node)) return true
      if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        return false
      }
      const childKeys = sourceCode.visitorKeys[node.type] ?? []
      return childKeys.some((childKey) => {
        const childValue = node[childKey]
        if (Array.isArray(childValue)) {
          return childValue.some((childNode) =>
            containsReactElementExpression(childNode),
          )
        }
        return containsReactElementExpression(childValue)
      })
    }

    /**
     * Finds JSX/createElement returns in one function's control flow while excluding nested function bodies.
     * @param {import('estree').Node | null | undefined} node The current AST node inside the component body.
     * @returns
     * - True when this control-flow subtree contains a React element return
     * - False when no matching return exists or the node starts a nested function
     * @example
     * containsReactElementReturn(ifStatementNode) // => true when its branch returns JSX
     */
    function containsReactElementReturn(node) {
      if (!node) return false
      if (node.type === 'ReturnStatement') {
        return containsReactElementExpression(node.argument)
      }
      if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        return false
      }
      const childKeys = sourceCode.visitorKeys[node.type] ?? []
      for (const childKey of childKeys) {
        const childValue = node[childKey]
        if (Array.isArray(childValue)) {
          if (
            childValue.some((childNode) =>
              containsReactElementReturn(childNode),
            )
          ) {
            return true
          }
          continue
        }
        if (containsReactElementReturn(childValue)) return true
      }
      return false
    }

    /**
     * Checks whether a function returns JSX anywhere in its own control flow so it can enter the component prop graph.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression | null | undefined} functionNode The function inspected when ESLint enters it.
     * @returns
     * - True when the function returns JSX or createElement from its own body
     * - False for non-component functions or nested-function-only JSX
     * @example
     * functionReturnsJsx({ type: 'ArrowFunctionExpression', expression: true, body: { type: 'JSXElement' } }) // => true
     */
    function functionReturnsJsx(functionNode) {
      if (!functionNode) return false
      if (
        functionNode.type === 'ArrowFunctionExpression' &&
        functionNode.expression
      ) {
        return containsReactElementExpression(functionNode.body)
      }
      return containsReactElementReturn(functionNode.body)
    }

    /**
     * Recognizes memo and React.memo wrappers so anonymous memoized components retain their variable name in the graph.
     * @param {import('estree').Node | null | undefined} node The possible memo call wrapping a function.
     * @returns
     * - True for memo(...) and React.memo(...)
     * - False for every other node
     * @example
     * isMemoCall({ type: 'CallExpression', callee: { type: 'Identifier', name: 'memo' } }) // => true
     */
    function isMemoCall(node) {
      if (!node || node.type !== 'CallExpression') return false
      return isReactApiCallee(node.callee, 'memo')
    }

    /**
     * Resolves the stable PascalCase name used to connect a component definition with its JSX usages.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} functionNode The function entered by ESLint.
     * @returns
     * - The component name for a named declaration or variable initializer
     * - null when the function is not a tracked component
     * @example
     * resolveComponentName(functionNode) // => 'Child'
     */
    function resolveComponentName(functionNode) {
      if (!functionReturnsJsx(functionNode)) return null
      if (
        functionNode.id &&
        functionNode.id.type === 'Identifier' &&
        isPascalCase(functionNode.id.name)
      ) {
        return functionNode.id.name
      }

      const parentNode = functionNode.parent
      if (
        parentNode &&
        parentNode.type === 'VariableDeclarator' &&
        parentNode.id.type === 'Identifier' &&
        parentNode.init === functionNode &&
        isPascalCase(parentNode.id.name)
      ) {
        return parentNode.id.name
      }
      if (
        parentNode &&
        isMemoCall(parentNode) &&
        parentNode.arguments[0] === functionNode
      ) {
        const declaratorNode = parentNode.parent
        if (
          declaratorNode &&
          declaratorNode.type === 'VariableDeclarator' &&
          declaratorNode.id.type === 'Identifier' &&
          isPascalCase(declaratorNode.id.name)
        ) {
          return declaratorNode.id.name
        }
      }
      return null
    }

    /**
     * Resolves the declaration node stored by ESLint scope definitions so JSX references connect to the exact component binding.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} functionNode The tracked component function.
     * @returns
     * - The owning variable declarator for variable and memo components
     * - The function node for declarations and named function bindings
     * @example
     * getComponentDefinitionNode(functionNode) // => variableDeclaratorNode
     */
    function getComponentDefinitionNode(functionNode) {
      if (functionNode.parent?.type === 'VariableDeclarator') {
        return functionNode.parent
      }
      if (
        functionNode.parent?.type === 'CallExpression' &&
        isMemoCall(functionNode.parent) &&
        functionNode.parent.parent?.type === 'VariableDeclarator'
      ) {
        return functionNode.parent.parent
      }
      return functionNode
    }

    /**
     * Unwraps a defaulted component parameter before prop bindings are collected at function entry.
     * @param {import('estree').Pattern | null | undefined} parameterNode The first component parameter.
     * @returns
     * - The underlying pattern for a defaulted parameter
     * - The original pattern or null otherwise
     * @example
     * normalizeParameter({ type: 'AssignmentPattern', left: { type: 'Identifier', name: 'props' } }) // => props identifier
     */
    function normalizeParameter(parameterNode) {
      if (!parameterNode) return null
      return parameterNode.type === 'AssignmentPattern'
        ? parameterNode.left
        : parameterNode
    }

    /**
     * Returns a static property name while component parameters are converted into local-to-prop bindings.
     * @param {import('estree').Expression | import('estree').Pattern | null | undefined} keyNode The property key from a pattern or object.
     * @returns
     * - The identifier or string literal value
     * - null when the key is computed or dynamic
     * @example
     * getStaticPropertyName({ type: 'Identifier', name: 'value' }) // => 'value'
     */
    function getStaticPropertyName(keyNode) {
      if (!keyNode) return null
      if (keyNode.type === 'Identifier') return keyNode.name
      if (keyNode.type === 'Literal' && typeof keyNode.value === 'string') {
        return keyNode.value
      }
      return null
    }

    /**
     * Resolves the identifier created by a top-level destructured prop so later references can use lexical identity.
     * @param {import('estree').Pattern | import('estree').Expression | null | undefined} patternNode The property value pattern.
     * @returns
     * - The local identifier node
     * - null for nested or unsupported patterns
     * @example
     * getLocalBindingIdentifier({ type: 'Identifier', name: 'localValue' }) // => localValue identifier
     */
    function getLocalBindingIdentifier(patternNode) {
      if (!patternNode) return null
      if (patternNode.type === 'Identifier') return patternNode
      if (
        patternNode.type === 'AssignmentPattern' &&
        patternNode.left.type === 'Identifier'
      ) {
        return patternNode.left
      }
      return null
    }

    /**
     * Resolves the nearest lexical variable for an identifier whenever prop or component names may be shadowed.
     * @param {import('estree').Identifier | import('estree').JSXIdentifier | null | undefined} identifierNode The identifier reference or declaration.
     * @returns
     * - The nearest ESLint scope variable
     * - null when the identifier is unresolved
     * @example
     * resolveIdentifierVariable(valueIdentifier) // => the component parameter variable
     */
    function resolveIdentifierVariable(identifierNode) {
      if (!identifierNode) return null
      return findVariableByName(
        getRuleScope(context, identifierNode),
        identifierNode.name,
      )
    }

    /**
     * Collects the first parameter's prop bindings when a component frame is created.
     * @param {{ propVariableToPropName: Map<import('eslint').Scope.Variable, string>, propsObjectVariable: import('eslint').Scope.Variable | null }} componentFrame The frame being initialized.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} functionNode The component function.
     * @returns
     * - No value; the frame is updated in place
     * - No change when the component has no supported props parameter
     * @example
     * collectComponentProps(frame, functionNode) // => undefined
     */
    function collectComponentProps(componentFrame, functionNode) {
      const parameterNode = normalizeParameter(
        functionNode.params[FIRST_PARAM_INDEX],
      )
      if (!parameterNode) return
      if (parameterNode.type === 'Identifier') {
        componentFrame.propsObjectVariable =
          resolveIdentifierVariable(parameterNode)
        return
      }
      if (parameterNode.type !== 'ObjectPattern') return

      for (const propertyNode of parameterNode.properties) {
        if (
          propertyNode.type === 'RestElement' &&
          propertyNode.argument.type === 'Identifier'
        ) {
          const restVariable = resolveIdentifierVariable(propertyNode.argument)
          if (restVariable) {
            componentFrame.propVariableToPropName.set(
              restVariable,
              ALL_PROPS_NAME,
            )
          }
          continue
        }
        // Computed properties cannot be mapped to one stable prop name.
        if (propertyNode.type !== 'Property' || propertyNode.computed) continue
        const propName = getStaticPropertyName(propertyNode.key)
        const localIdentifier = getLocalBindingIdentifier(propertyNode.value)
        const localVariable = resolveIdentifierVariable(localIdentifier)
        if (!propName || !localVariable) continue
        componentFrame.propVariableToPropName.set(localVariable, propName)
      }
    }

    /**
     * Registers a React component before its body is traversed so nested JSX passes can identify their owner.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} functionNode The function entered by ESLint.
     * @returns
     * - No value; a tracked frame is pushed for component functions
     * - No change for ordinary functions
     * @example
     * enterComponent(functionNode) // => undefined
     */
    function enterComponent(functionNode) {
      const componentName = resolveComponentName(functionNode)
      if (!componentName) return
      const componentFrame = {
        name: componentName,
        node: functionNode,
        propVariableToPropName: new Map(),
        propsObjectVariable: null,
      }
      collectComponentProps(componentFrame, functionNode)
      components.set(functionNode, componentFrame)
      componentsByDefinitionNode.set(
        getComponentDefinitionNode(functionNode),
        functionNode,
      )
      componentStack.push(componentFrame)
    }

    /**
     * Removes a component frame after ESLint finishes its body so later passes are attributed to the correct component.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} functionNode The function exited by ESLint.
     * @returns
     * - No value; the matching frame is removed
     * - No change when the function was not tracked
     * @example
     * leaveComponent(functionNode) // => undefined
     */
    function leaveComponent(functionNode) {
      const currentFrame = componentStack.at(-STACK_TOP_OFFSET)
      if (currentFrame && currentFrame.node === functionNode) {
        componentStack.pop()
      }
    }

    /**
     * Reads the active component frame while JSX attributes are visited inside its function body.
     * @returns
     * - The active component frame
     * - null outside a tracked component
     * @example
     * getCurrentComponent() // => { name: 'Parent', ... }
     */
    function getCurrentComponent() {
      return componentStack.length > EMPTY_STACK_LENGTH
        ? componentStack.at(-STACK_TOP_OFFSET)
        : null
    }

    /**
     * Resolves a PascalCase JSX identifier so its lexical binding can decide whether the target is same-file.
     * @param {import('estree').JSXOpeningElement | null | undefined} openingElementNode The JSX opening element owning an attribute.
     * @returns
     * - The PascalCase JSX identifier node
     * - null for intrinsic, member, namespaced, or unknown elements
     * @example
     * getJsxComponentIdentifier(openingElementNode) // => Child JSXIdentifier
     */
    function getJsxComponentIdentifier(openingElementNode) {
      if (
        !openingElementNode ||
        openingElementNode.name.type !== 'JSXIdentifier'
      ) {
        return null
      }
      const elementName = openingElementNode.name.name
      return isPascalCase(elementName) ? openingElementNode.name : null
    }

    /**
     * Adds one normalized component edge so JSX and createElement recording share the same pass shape.
     * @param {import('estree').Node} reportNode The syntax node reported when the edge reaches a forbidden depth.
     * @param {import('estree').Node} fromComponentNode The component function forwarding the value.
     * @param {import('estree').Identifier | import('estree').JSXIdentifier} targetIdentifierNode The component reference whose lexical binding receives the value.
     * @param {string} targetPropName The receiving prop name or the all-props marker.
     * @param {import('estree').Expression | import('estree').Pattern} expressionNode The forwarded expression inspected for prop origins.
     * @returns
     * - No value; one normalized edge is appended to the pass list
     * @example
     * recordPropPass(attributeNode, parentNode, childIdentifier, 'value', expressionNode) // => undefined
     */
    function recordPropPass(
      reportNode,
      fromComponentNode,
      targetIdentifierNode,
      targetPropName,
      expressionNode,
    ) {
      propPasses.push({
        reportNode,
        fromComponentNode,
        targetVariable: resolveIdentifierVariable(targetIdentifierNode),
        targetPropName,
        expression: expressionNode,
      })
    }

    /**
     * Stores each explicit JSX prop pass until all component definitions are known at Program exit.
     * @param {import('estree').JSXAttribute} attributeNode The JSX attribute visited by ESLint.
     * @returns
     * - No value; a pass is appended for supported component attributes
     * - No change for intrinsic elements or non-expression attributes
     * @example
     * recordJsxPropPass(attributeNode) // => undefined
     */
    function recordJsxPropPass(attributeNode) {
      const currentComponent = getCurrentComponent()
      if (!currentComponent) return
      if (
        !attributeNode.value ||
        attributeNode.value.type !== 'JSXExpressionContainer'
      ) {
        return
      }
      const targetIdentifierNode = getJsxComponentIdentifier(
        attributeNode.parent,
      )
      const targetPropName =
        attributeNode.name.type === 'JSXIdentifier'
          ? attributeNode.name.name
          : null
      if (!targetIdentifierNode || !targetPropName) return
      recordPropPass(
        attributeNode,
        currentComponent.node,
        targetIdentifierNode,
        targetPropName,
        attributeNode.value.expression,
      )
    }

    /**
     * Stores a JSX spread as an all-props pass so object spreading cannot reset the known component depth.
     * @param {import('estree').JSXSpreadAttribute} spreadAttributeNode The JSX spread visited by ESLint.
     * @returns
     * - No value; an all-props pass is appended for a known component target
     * - No change for intrinsic or unsupported JSX targets
     * @example
     * recordJsxSpreadPass(spreadAttributeNode) // => undefined
     */
    function recordJsxSpreadPass(spreadAttributeNode) {
      const currentComponent = getCurrentComponent()
      if (!currentComponent) return
      const targetIdentifierNode = getJsxComponentIdentifier(
        spreadAttributeNode.parent,
      )
      if (!targetIdentifierNode) return
      recordPropPass(
        spreadAttributeNode,
        currentComponent.node,
        targetIdentifierNode,
        ALL_PROPS_NAME,
        spreadAttributeNode.argument,
      )
    }

    /**
     * Resolves a PascalCase createElement target so only known same-file components add a drilling edge.
     * @param {import('estree').Expression | import('estree').SpreadElement | null | undefined} targetNode The first createElement argument.
     * @returns
     * - The PascalCase identifier node
     * - null for intrinsic and unsupported targets
     * @example
     * getCreateElementComponentIdentifier({ type: 'Identifier', name: 'Child' }) // => Child identifier
     */
    function getCreateElementComponentIdentifier(targetNode) {
      if (!targetNode || targetNode.type !== 'Identifier') return null
      return isPascalCase(targetNode.name) ? targetNode : null
    }

    /**
     * Stores createElement object properties as component prop passes when ESLint visits JSX-free React code.
     * @param {import('estree').CallExpression} callExpressionNode The call expression visited inside a tracked component.
     * @returns
     * - No value; supported props are appended to the pass list
     * - No change for non-createElement, intrinsic, imported, or dynamic targets
     * @example
     * recordCreateElementPass(callExpressionNode) // => undefined
     */
    function recordCreateElementPass(callExpressionNode) {
      const currentComponent = getCurrentComponent()
      if (!currentComponent || !isCreateElementCall(callExpressionNode)) return
      if (callExpressionNode.arguments.length < MIN_CREATE_ELEMENT_ARGUMENTS) {
        return
      }
      const targetIdentifierNode = getCreateElementComponentIdentifier(
        callExpressionNode.arguments[CREATE_ELEMENT_TARGET_INDEX],
      )
      const propsNode = callExpressionNode.arguments[CREATE_ELEMENT_PROPS_INDEX]
      if (!targetIdentifierNode || propsNode.type !== 'ObjectExpression') return

      for (const propertyNode of propsNode.properties) {
        if (propertyNode.type === 'SpreadElement') {
          recordPropPass(
            propertyNode,
            currentComponent.node,
            targetIdentifierNode,
            ALL_PROPS_NAME,
            propertyNode.argument,
          )
          continue
        }
        // Computed keys cannot be connected to a stable receiving prop.
        if (propertyNode.type !== 'Property' || propertyNode.computed) continue
        const targetPropName = getStaticPropertyName(propertyNode.key)
        if (!targetPropName) continue
        recordPropPass(
          propertyNode,
          currentComponent.node,
          targetIdentifierNode,
          targetPropName,
          propertyNode.value,
        )
      }
    }

    /**
     * Maps a direct identifier or props.member expression back to the received prop that supplied it.
     * @param {import('estree').Expression | null | undefined} expressionNode The JSX attribute expression.
     * @param {{ propVariableToPropName: Map<import('eslint').Scope.Variable, string>, propsObjectVariable: import('eslint').Scope.Variable | null }} componentFrame The component containing the expression.
     * @returns
     * - The source prop name for a direct received-prop reference
     * - null when the expression is not directly prop-derived
     * @example
     * resolveSourcePropName({ type: 'Identifier', name: 'value' }, frame) // => 'value'
     */
    function resolveSourcePropName(expressionNode, componentFrame) {
      if (!expressionNode) return null
      if (expressionNode.type === 'Identifier') {
        const expressionVariable = resolveIdentifierVariable(expressionNode)
        if (expressionVariable === componentFrame.propsObjectVariable) {
          return ALL_PROPS_NAME
        }
        return (
          componentFrame.propVariableToPropName.get(expressionVariable) ?? null
        )
      }
      if (
        expressionNode.type === 'MemberExpression' &&
        expressionNode.object.type === 'Identifier' &&
        resolveIdentifierVariable(expressionNode.object) ===
          componentFrame.propsObjectVariable
      ) {
        if (
          !expressionNode.computed &&
          expressionNode.property.type === 'Identifier'
        ) {
          return expressionNode.property.name
        }
        if (
          expressionNode.computed &&
          expressionNode.property.type === 'Literal' &&
          typeof expressionNode.property.value === 'string'
        ) {
          return expressionNode.property.value
        }
        return null
      }
      if (expressionNode.type === 'MemberExpression') {
        // A nested read such as user.name remains derived from the received user prop.
        return resolveSourcePropName(expressionNode.object, componentFrame)
      }
      return null
    }

    /**
     * Records simple and destructured same-component aliases so moving prop bindings into the body cannot bypass the check.
     * @param {import('estree').VariableDeclarator} declaratorNode The variable declaration visited before later JSX usages.
     * @returns
     * - No value; direct, destructured, and rest aliases are added to the active frame
     * - No change for non-alias declarations or declarations inside nested functions
     * @example
     * collectPropAlias({ id: forwardedValue, init: value }) // => undefined
     */
    function collectPropAlias(declaratorNode) {
      const currentComponent = getCurrentComponent()
      if (!currentComponent || !declaratorNode.init) {
        return
      }

      let owningFunctionNode = declaratorNode.parent
      while (
        owningFunctionNode &&
        owningFunctionNode.type !== 'FunctionDeclaration' &&
        owningFunctionNode.type !== 'FunctionExpression' &&
        owningFunctionNode.type !== 'ArrowFunctionExpression'
      ) {
        owningFunctionNode = owningFunctionNode.parent
      }
      // Nested callback bindings must not leak into the component's prop namespace.
      if (owningFunctionNode !== currentComponent.node) return

      const sourcePropName = resolveSourcePropName(
        declaratorNode.init,
        currentComponent,
      )
      if (!sourcePropName) return

      if (declaratorNode.id.type === 'Identifier') {
        const aliasVariable = resolveIdentifierVariable(declaratorNode.id)
        if (!aliasVariable) return
        currentComponent.propVariableToPropName.set(
          aliasVariable,
          sourcePropName,
        )
        return
      }
      if (declaratorNode.id.type !== 'ObjectPattern') return

      for (const propertyNode of declaratorNode.id.properties) {
        if (
          propertyNode.type === 'RestElement' &&
          propertyNode.argument.type === 'Identifier'
        ) {
          const restVariable = resolveIdentifierVariable(propertyNode.argument)
          if (restVariable) {
            currentComponent.propVariableToPropName.set(
              restVariable,
              sourcePropName,
            )
          }
          continue
        }
        // Computed and nested bindings do not expose one stable local variable.
        if (propertyNode.type !== 'Property' || propertyNode.computed) continue
        const localIdentifier = getLocalBindingIdentifier(propertyNode.value)
        const localVariable = resolveIdentifierVariable(localIdentifier)
        if (!localVariable) continue
        const destructuredPropName =
          sourcePropName === ALL_PROPS_NAME
            ? getStaticPropertyName(propertyNode.key)
            : sourcePropName
        if (!destructuredPropName) continue
        currentComponent.propVariableToPropName.set(
          localVariable,
          destructuredPropName,
        )
      }
    }

    /**
     * Adds a bounded depth to a target prop so the fixed-point loop terminates even when components form a cycle.
     * @param {Map<import('estree').Node, Map<string, Set<number>>>} propDepthsByComponent The accumulated component prop depths.
     * @param {import('estree').Node} targetComponentNode The component receiving the prop.
     * @param {string} targetPropName The receiving prop name.
     * @param {number} depth The discovered component depth.
     * @returns
     * - True when a new depth was stored
     * - False when that bounded depth was already known
     * @example
     * addPropDepth(depths, childNode, 'value', 1) // => true
     */
    function addPropDepth(
      propDepthsByComponent,
      targetComponentNode,
      targetPropName,
      depth,
    ) {
      const boundedDepth = Math.min(depth, FIRST_FORBIDDEN_DEPTH)
      const componentDepths = propDepthsByComponent.get(targetComponentNode)
      if (!componentDepths) return false
      if (!componentDepths.has(targetPropName)) {
        componentDepths.set(targetPropName, new Set())
      }
      const knownDepths = componentDepths.get(targetPropName)
      if (knownDepths.has(boundedDepth)) return false
      knownDepths.add(boundedDepth)
      return true
    }

    /**
     * Returns the direct and previously propagated depths for one received prop during graph propagation.
     * @param {Map<import('estree').Node, Map<string, Set<number>>>} propDepthsByComponent The accumulated component prop depths.
     * @param {import('estree').Node} componentNode The component forwarding the prop.
     * @param {string} sourcePropName The received prop being forwarded.
     * @returns
     * - A set containing depth zero plus every known inbound depth
     * - Depth zero alone when no same-file parent pass is known
     * @example
     * getSourceDepths(depths, childNode, 'value') // => Set([0, 1])
     */
    function getSourceDepths(
      propDepthsByComponent,
      componentNode,
      sourcePropName,
    ) {
      const sourceDepths = new Set([DIRECT_PROP_DEPTH])
      const componentDepths = propDepthsByComponent.get(componentNode)
      if (!componentDepths) return sourceDepths
      const relevantDepthSets = []
      const exactDepths = componentDepths.get(sourcePropName)
      const allPropsDepths = componentDepths.get(ALL_PROPS_NAME)
      if (exactDepths) relevantDepthSets.push(exactDepths)
      if (sourcePropName !== ALL_PROPS_NAME && allPropsDepths) {
        relevantDepthSets.push(allPropsDepths)
      }
      if (sourcePropName === ALL_PROPS_NAME) {
        // A spread forwards every exact prop that entered this component.
        relevantDepthSets.push(...componentDepths.values())
      }
      for (const relevantDepths of relevantDepthSets) {
        for (const knownDepth of relevantDepths) {
          sourceDepths.add(knownDepth)
        }
      }
      return sourceDepths
    }

    /**
     * Connects a JSX/createElement binding to its tracked same-file component definition without name collisions.
     * @param {import('eslint').Scope.Variable | null} targetVariable The lexical variable referenced by the component target.
     * @returns
     * - The tracked component function declared by that exact variable
     * - null for imports, globals, and untracked definitions
     * @example
     * resolveTargetComponentNode(childVariable) // => childFunctionNode
     */
    function resolveTargetComponentNode(targetVariable) {
      if (!targetVariable) return null
      for (const definition of targetVariable.defs) {
        const componentNode = componentsByDefinitionNode.get(definition.node)
        if (componentNode) return componentNode
      }
      return null
    }

    /**
     * Resolves one recorded edge into the source prop and depths shared by propagation and reporting.
     * @param {{ fromComponentNode: import('estree').Node, targetVariable: import('eslint').Scope.Variable | null, expression: import('estree').Expression }} propPass The recorded component edge.
     * @param {Map<import('estree').Node, Map<string, Set<number>>>} propDepthsByComponent The accumulated component prop depths.
     * @returns
     * - The source component, target node, prop name, and known source depths
     * - null when the edge cannot be connected to a same-file prop chain
     * @example
     * resolvePropPass(propPass, depths) // => { sourceComponent, targetComponentNode, sourcePropName, sourceDepths }
     */
    function resolvePropPass(propPass, propDepthsByComponent) {
      const sourceComponent = components.get(propPass.fromComponentNode)
      const targetComponentNode = resolveTargetComponentNode(
        propPass.targetVariable,
      )
      if (!sourceComponent || !targetComponentNode) return null
      const sourcePropName = resolveSourcePropName(
        propPass.expression,
        sourceComponent,
      )
      if (!sourcePropName) return null
      return {
        sourceComponent,
        targetComponentNode,
        sourcePropName,
        sourceDepths: getSourceDepths(
          propDepthsByComponent,
          sourceComponent.node,
          sourcePropName,
        ),
      }
    }

    /**
     * Propagates received-prop depths until stable, then reports passes that occur at the second or later component boundary.
     * @returns
     * - No value; violations are reported through the ESLint context
     * - No reports when no same-file chain reaches depth two
     * @example
     * analyzePropPasses() // => undefined
     */
    function analyzePropPasses() {
      const propDepthsByComponent = new Map()
      for (const componentFrame of components.values()) {
        propDepthsByComponent.set(componentFrame.node, new Map())
      }

      let didAddDepth = true
      while (didAddDepth) {
        didAddDepth = false
        for (const propPass of propPasses) {
          const resolvedPass = resolvePropPass(propPass, propDepthsByComponent)
          if (!resolvedPass) continue
          for (const sourceDepth of resolvedPass.sourceDepths) {
            const didStoreDepth = addPropDepth(
              propDepthsByComponent,
              resolvedPass.targetComponentNode,
              propPass.targetPropName,
              sourceDepth + DEPTH_INCREMENT,
            )
            didAddDepth = didStoreDepth || didAddDepth
          }
        }
      }

      for (const propPass of propPasses) {
        const resolvedPass = resolvePropPass(propPass, propDepthsByComponent)
        if (!resolvedPass) continue
        const reachesForbiddenDepth = [...resolvedPass.sourceDepths].some(
          (sourceDepth) =>
            sourceDepth + DEPTH_INCREMENT >= FIRST_FORBIDDEN_DEPTH,
        )
        if (!reachesForbiddenDepth) continue
        context.report({
          node: propPass.reportNode,
          messageId: 'noPropDrilling',
          data: {
            name:
              resolvedPass.sourcePropName === ALL_PROPS_NAME
                ? 'props'
                : resolvedPass.sourcePropName,
          },
        })
      }
    }

    return {
      FunctionDeclaration: enterComponent,
      'FunctionDeclaration:exit': leaveComponent,
      FunctionExpression: enterComponent,
      'FunctionExpression:exit': leaveComponent,
      ArrowFunctionExpression: enterComponent,
      'ArrowFunctionExpression:exit': leaveComponent,
      VariableDeclarator: collectPropAlias,
      CallExpression: recordCreateElementPass,
      JSXAttribute: recordJsxPropPass,
      JSXSpreadAttribute: recordJsxSpreadPass,
      'Program:exit': analyzePropPasses,
    }
  },
}
