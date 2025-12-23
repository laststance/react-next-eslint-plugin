import { isUseStateCallee } from '../utils/hooks.js'
import { isJSX } from '../utils/jsx.js'
import { isPascalCase } from '../utils/naming.js'

/**
 * @fileoverview Disallow passing React.useState setters through props.
 * @author laststance
 */

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Disallow passing React.useState's updater function through props; prefer semantic handlers or state management.",
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [
      {
        type: 'object',
        properties: {
          depth: { type: 'integer', minimum: 0 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noPropDrillSetter:
        'Avoid prop-drilling a React.useState updater ({{name}}). It tightly couples components and can cause unnecessary re-renders due to unstable function identity. Prefer exposing a semantic handler (e.g., onIncrement) or use a state management library (e.g., Zustand, Redux, Jotai).',
    },
  },

  /**
   * Creates an ESLint rule listener.
   * @param {import('eslint').Rule.RuleContext} context The ESLint rule context.
   * @returns
   * - A visitor object that inspects React component props for setter drilling
   * - No return value when the rule is disabled by ESLint
   * @example
   * create({ options: [] }) // => { JSXAttribute() {}, CallExpression() {}, ... }
   */
  create(context) {
    const FIRST_INDEX = 0
    const STACK_EMPTY_LENGTH = 0
    const STACK_TOP_OFFSET = 1
    const DEFAULT_ALLOWED_DEPTH = 0
    const MIN_ALLOWED_DEPTH = 0
    const LOCAL_SETTER_DEPTH = 0
    const DEPTH_INCREMENT = 1
    const FIRST_PARAM_INDEX = FIRST_INDEX
    const FIRST_OPTION_INDEX = FIRST_INDEX
    const MIN_USE_STATE_TUPLE_LENGTH = 2
    const USE_STATE_SETTER_INDEX = 1
    const MIN_CREATE_ELEMENT_ARGS = 2
    const CREATE_ELEMENT_TARGET_INDEX = FIRST_INDEX
    const CREATE_ELEMENT_PROPS_INDEX = 1
    const MEMO_COMPONENT_ARG_INDEX = FIRST_INDEX

    const { allowedDepth } = getRuleOptions(context.options)
    const componentStack = []
    const components = new Map()
    const componentsByName = new Map()
    const propPasses = []

    /**
     * Normalizes rule options.
     * @param {Array<unknown>} options The raw ESLint options array.
     * @returns
     * - When a valid depth is provided: { allowedDepth: number }
     * - When missing or invalid: { allowedDepth: number } with the default depth
     * @example
     * getRuleOptions([{ depth: 1 }]) // => { allowedDepth: 1 }
     */
    function getRuleOptions(options) {
      const firstOption = Array.isArray(options)
        ? options[FIRST_OPTION_INDEX]
        : null
      const depthCandidate =
        firstOption && typeof firstOption === 'object' && 'depth' in firstOption
          ? firstOption.depth
          : null
      const normalizedDepth = Number.isInteger(depthCandidate)
        ? Math.max(depthCandidate, MIN_ALLOWED_DEPTH)
        : DEFAULT_ALLOWED_DEPTH
      return { allowedDepth: normalizedDepth }
    }

    /**
     * Determines whether a call expression is React.createElement or createElement.
     * @param {import('estree').Node | null | undefined} node The node to inspect.
     * @returns
     * - True when the node is a createElement call
     * - False when the node is anything else
     * @example
     * isCreateElementCall({ type: 'CallExpression', callee: { type: 'Identifier', name: 'createElement' } })
     * // => true
     */
    function isCreateElementCall(node) {
      if (!node || node.type !== 'CallExpression') return false
      const callee = node.callee
      if (callee.type === 'Identifier' && callee.name === 'createElement') {
        return true
      }
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'createElement'
      ) {
        return true
      }
      return false
    }

    /**
     * Determines if a function node likely returns JSX or React.createElement.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression | null | undefined} fnNode
     * @returns
     * - True when the function appears to return JSX or createElement
     * - False when no JSX/createElement return is found
     * @example
     * functionReturnsJSX({ type: 'ArrowFunctionExpression', expression: true, body: { type: 'JSXElement' } })
     * // => true
     */
    function functionReturnsJSX(fnNode) {
      if (
        !fnNode ||
        (fnNode.type !== 'ArrowFunctionExpression' &&
          fnNode.type !== 'FunctionExpression' &&
          fnNode.type !== 'FunctionDeclaration')
      ) {
        return false
      }

      if (fnNode.type === 'ArrowFunctionExpression' && fnNode.expression) {
        return isJSX(fnNode.body) || isCreateElementCall(fnNode.body)
      }

      const body =
        fnNode.body && fnNode.body.type === 'BlockStatement'
          ? fnNode.body.body
          : []
      for (const stmt of body) {
        if (!stmt || stmt.type !== 'ReturnStatement') continue
        if (!stmt.argument) continue
        if (isJSX(stmt.argument) || isCreateElementCall(stmt.argument)) {
          return true
        }
      }
      return false
    }

    /**
     * Checks if a call expression represents memo() or React.memo().
     * @param {import('estree').CallExpression | null | undefined} node
     * @returns
     * - True when the call is memo(...) or React.memo(...)
     * - False otherwise
     * @example
     * isMemoCall({ type: 'CallExpression', callee: { type: 'Identifier', name: 'memo' } })
     * // => true
     */
    function isMemoCall(node) {
      if (!node || node.type !== 'CallExpression') return false
      const callee = node.callee
      if (callee.type === 'Identifier' && callee.name === 'memo') return true
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'memo'
      ) {
        return true
      }
      return false
    }

    /**
     * Resolves a component name for a function node when it represents a component.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} node
     * @returns
     * - The PascalCase component name when the node is a React component
     * - null when the node should not be treated as a component
     * @example
     * resolveComponentName({ type: 'FunctionDeclaration', id: { name: 'Panel' } })
     * // => "Panel"
     */
    function resolveComponentName(node) {
      if (!functionReturnsJSX(node)) return null

      if (
        node.type === 'FunctionDeclaration' &&
        node.id &&
        node.id.type === 'Identifier' &&
        isPascalCase(node.id.name)
      ) {
        return node.id.name
      }

      if (
        (node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression') &&
        node.id &&
        node.id.type === 'Identifier' &&
        isPascalCase(node.id.name)
      ) {
        return node.id.name
      }

      const parent = node.parent
      if (
        parent &&
        parent.type === 'VariableDeclarator' &&
        parent.id &&
        parent.id.type === 'Identifier' &&
        isPascalCase(parent.id.name) &&
        parent.init === node
      ) {
        return parent.id.name
      }

      if (
        parent &&
        parent.type === 'CallExpression' &&
        isMemoCall(parent) &&
        parent.arguments &&
        parent.arguments[MEMO_COMPONENT_ARG_INDEX] === node
      ) {
        const declarator = parent.parent
        if (
          declarator &&
          declarator.type === 'VariableDeclarator' &&
          declarator.id &&
          declarator.id.type === 'Identifier' &&
          isPascalCase(declarator.id.name)
        ) {
          return declarator.id.name
        }
      }

      return null
    }

    /**
     * Creates a component tracking frame.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} node
     * @param {string} name The resolved component name.
     * @returns
     * - A component frame with setter and prop metadata
     * - null when the component cannot be initialized
     * @example
     * createComponentFrame(node, 'Panel') // => { name: 'Panel', setterNames: Set, ... }
     */
    function createComponentFrame(node, name) {
      if (!name) return null
      const frame = {
        name,
        node,
        setterNames: new Set(),
        propLocalToPropName: new Map(),
        propsObjectName: null,
      }
      collectComponentProps(frame, node)
      return frame
    }

    /**
     * Normalizes a function parameter by unwrapping default assignments.
     * @param {import('estree').Pattern | null | undefined} param
     * @returns
     * - The normalized parameter node
     * - null when the parameter is missing
     * @example
     * normalizeParam({ type: 'AssignmentPattern', left: { type: 'Identifier', name: 'props' } })
     * // => { type: 'Identifier', name: 'props' }
     */
    function normalizeParam(param) {
      if (!param) return null
      if (param.type === 'AssignmentPattern') {
        return param.left
      }
      return param
    }

    /**
     * Collects prop bindings from a component function signature.
     * @param {{ propLocalToPropName: Map<string, string>, propsObjectName: string | null }} frame
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} node
     * @returns
     * - No return value (updates the frame in place)
     * - No action when no props parameter exists
     * @example
     * collectComponentProps(frame, functionNode) // => undefined
     */
    function collectComponentProps(frame, node) {
      if (!node || !node.params) return
      const rawParam = node.params[FIRST_PARAM_INDEX]
      const param = normalizeParam(rawParam)
      if (!param) return

      if (param.type === 'Identifier') {
        frame.propsObjectName = param.name
        return
      }

      if (param.type !== 'ObjectPattern') return
      for (const prop of param.properties) {
        if (prop.type !== 'Property' || prop.computed) continue
        const propName = getPropNameFromKey(prop.key)
        if (!propName) continue
        const localName = getLocalNameFromPattern(prop.value)
        if (!localName) continue
        frame.propLocalToPropName.set(localName, propName)
      }
    }

    /**
     * Resolves a property key name for object patterns or object literals.
     * @param {import('estree').Expression | import('estree').Pattern} keyNode
     * @returns
     * - The string name when the key is a static identifier or literal
     * - null when the key cannot be resolved
     * @example
     * getPropNameFromKey({ type: 'Identifier', name: 'onClick' }) // => "onClick"
     */
    function getPropNameFromKey(keyNode) {
      if (!keyNode) return null
      if (keyNode.type === 'Identifier') return keyNode.name
      if (keyNode.type === 'Literal' && typeof keyNode.value === 'string') {
        return keyNode.value
      }
      return null
    }

    /**
     * Resolves the local identifier name from a pattern value.
     * @param {import('estree').Pattern | import('estree').Expression} pattern
     * @returns
     * - The local identifier name for the pattern
     * - null when the pattern does not map to a simple identifier
     * @example
     * getLocalNameFromPattern({ type: 'Identifier', name: 'onClick' }) // => "onClick"
     */
    function getLocalNameFromPattern(pattern) {
      if (!pattern) return null
      if (pattern.type === 'Identifier') return pattern.name
      if (
        pattern.type === 'AssignmentPattern' &&
        pattern.left &&
        pattern.left.type === 'Identifier'
      ) {
        return pattern.left.name
      }
      return null
    }

    /**
     * Registers a component frame and pushes it on the component stack.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} node
     * @returns
     * - A component frame when the node is a component
     * - null when the node is not treated as a component
     * @example
     * enterComponent(node) // => { name: 'Panel', ... }
     */
    function enterComponent(node) {
      const name = resolveComponentName(node)
      if (!name) return null
      const frame = createComponentFrame(node, name)
      if (!frame) return null
      components.set(node, frame)
      componentsByName.set(name, node)
      componentStack.push(frame)
      return frame
    }

    /**
     * Pops the current component frame when exiting a component node.
     * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} node
     * @returns
     * - No return value (stack mutation only)
     * - No action when the node is not the current component
     * @example
     * leaveComponent(node) // => undefined
     */
    function leaveComponent(node) {
      const current =
        componentStack[componentStack.length - STACK_TOP_OFFSET]
      if (!current) return
      if (current.node === node) {
        componentStack.pop()
      }
    }

    /**
     * Gets the current component frame from the stack.
     * @returns
     * - The current component frame when inside a component
     * - null when not inside a tracked component
     * @example
     * getCurrentComponentFrame() // => { name: 'Panel', ... }
     */
    function getCurrentComponentFrame() {
      return componentStack.length > STACK_EMPTY_LENGTH
        ? componentStack[componentStack.length - STACK_TOP_OFFSET]
        : null
    }

    /**
     * Collects useState setter identifiers declared within the current component.
     * @param {import('estree').VariableDeclarator} node
     * @returns
     * - No return value (updates current component frame)
     * - No action when outside a component
     * @example
     * collectSetterFromDeclarator(node) // => undefined
     */
    function collectSetterFromDeclarator(node) {
      const frame = getCurrentComponentFrame()
      if (!frame) return
      if (
        node.id &&
        node.id.type === 'ArrayPattern' &&
        node.init &&
        node.init.type === 'CallExpression' &&
        isUseStateCallee(node.init.callee)
      ) {
        const elements = node.id.elements || []
        if (elements.length >= MIN_USE_STATE_TUPLE_LENGTH) {
          const setter = elements[USE_STATE_SETTER_INDEX]
          if (setter && setter.type === 'Identifier') {
            frame.setterNames.add(setter.name)
          }
        }
      }
    }

    /**
     * Extracts component metadata from a JSX opening element.
     * @param {import('estree').JSXOpeningElement | null | undefined} node
     * @returns
     * - { componentName: string | null, isIntrinsic: boolean } describing the JSX element
     * - { componentName: null, isIntrinsic: false } when the element cannot be classified
     * @example
     * getJsxElementInfo({ name: { type: 'JSXIdentifier', name: 'Panel' } })
     * // => { componentName: 'Panel', isIntrinsic: false }
     */
    function getJsxElementInfo(node) {
      if (!node || !node.name) {
        return { componentName: null, isIntrinsic: false }
      }
      if (node.name.type === 'JSXIdentifier') {
        const name = node.name.name
        if (isPascalCase(name)) {
          return { componentName: name, isIntrinsic: false }
        }
        return { componentName: null, isIntrinsic: true }
      }
      return { componentName: null, isIntrinsic: false }
    }

    /**
     * Extracts component metadata from a React.createElement argument.
     * @param {import('estree').Node | null | undefined} arg
     * @returns
     * - { componentName: string | null, isIntrinsic: boolean } for the target
     * - { componentName: null, isIntrinsic: false } when the target is unknown
     * @example
     * getCreateElementTargetInfo({ type: 'Identifier', name: 'Panel' })
     * // => { componentName: 'Panel', isIntrinsic: false }
     */
    function getCreateElementTargetInfo(arg) {
      if (!arg) return { componentName: null, isIntrinsic: false }
      if (arg.type === 'Identifier') {
        const name = arg.name
        if (isPascalCase(name)) {
          return { componentName: name, isIntrinsic: false }
        }
        return { componentName: null, isIntrinsic: false }
      }
      if (arg.type === 'Literal' && typeof arg.value === 'string') {
        return { componentName: null, isIntrinsic: true }
      }
      return { componentName: null, isIntrinsic: false }
    }

    /**
     * Resolves the origin depth for a setter-derived identifier.
     * @param {string} name
     * @param {{ setterNames: Set<string>, propLocalToPropName: Map<string, string>, node: import('estree').Node }} frame
     * @param {Map<import('estree').Node, Map<string, number>>} propDepthsByComponent
     * @returns
     * - The depth where the setter originated (0 for local useState)
     * - null when the identifier is not a setter-derived value
     * @example
     * getOriginDepthForIdentifier('setCount', frame, depths) // => 0
     */
    function getOriginDepthForIdentifier(name, frame, propDepthsByComponent) {
      if (frame.setterNames.has(name)) return LOCAL_SETTER_DEPTH
      const propName = frame.propLocalToPropName.get(name)
      if (!propName) return null
      const depthMap = propDepthsByComponent.get(frame.node)
      if (!depthMap) return null
      const depth = depthMap.get(propName)
      return typeof depth === 'number' ? depth : null
    }

    /**
     * Resolves the origin depth for a props.member expression.
     * @param {import('estree').MemberExpression} node
     * @param {{ propsObjectName: string | null, node: import('estree').Node }} frame
     * @param {Map<import('estree').Node, Map<string, number>>} propDepthsByComponent
     * @returns
     * - The depth where the setter originated
     * - null when the member expression is not a setter-derived prop
     * @example
     * getOriginDepthForMemberExpression(node, frame, depths) // => 1
     */
    function getOriginDepthForMemberExpression(
      node,
      frame,
      propDepthsByComponent,
    ) {
      if (!frame.propsObjectName) return null
      if (
        node.object.type !== 'Identifier' ||
        node.object.name !== frame.propsObjectName
      ) {
        return null
      }
      if (node.computed || node.property.type !== 'Identifier') {
        return null
      }
      const propName = node.property.name
      const depthMap = propDepthsByComponent.get(frame.node)
      if (!depthMap) return null
      const depth = depthMap.get(propName)
      return typeof depth === 'number' ? depth : null
    }

    /**
     * Collects setter origin entries from an expression.
     * @param {import('estree').Expression | null | undefined} expression
     * @param {{ setterNames: Set<string>, propLocalToPropName: Map<string, string>, propsObjectName: string | null, node: import('estree').Node }} frame
     * @param {Map<import('estree').Node, Map<string, number>>} propDepthsByComponent
     * @returns
     * - A list of origin entries with depth and names
     * - An empty list when the expression is not setter-derived
     * @example
     * collectSetterOrigins({ type: 'Identifier', name: 'setCount' }, frame, depths)
     * // => [{ depth: 0, name: 'setCount', canPropagate: true }]
     */
    function collectSetterOrigins(expression, frame, propDepthsByComponent) {
      if (!expression) return []
      if (expression.type === 'Identifier') {
        const depth = getOriginDepthForIdentifier(
          expression.name,
          frame,
          propDepthsByComponent,
        )
        if (depth === null) return []
        return [
          {
            depth,
            name: expression.name,
            canPropagate: true,
          },
        ]
      }

      if (
        expression.type === 'MemberExpression' &&
        expression.object &&
        expression.property
      ) {
        const depth = getOriginDepthForMemberExpression(
          expression,
          frame,
          propDepthsByComponent,
        )
        if (depth === null) return []
        const name =
          expression.property.type === 'Identifier'
            ? expression.property.name
            : null
        return [
          {
            depth,
            name,
            canPropagate: true,
          },
        ]
      }

      if (expression.type === 'ObjectExpression') {
        const entries = []
        for (const prop of expression.properties) {
          if (prop.type !== 'Property' || prop.computed) continue
          const value = prop.value
          if (!value) continue
          if (
            value.type === 'ArrowFunctionExpression' ||
            value.type === 'FunctionExpression'
          ) {
            continue
          }
          const nestedEntries = collectSetterOrigins(
            value,
            frame,
            propDepthsByComponent,
          ).map((entry) => ({ ...entry, canPropagate: false }))
          entries.push(...nestedEntries)
        }
        return entries
      }

      return []
    }

    /**
     * Determines whether a JSX attribute value should be ignored (wrapped handler).
     * @param {import('estree').Expression | null | undefined} expression
     * @returns
     * - True when the expression is a function wrapper
     * - False when the expression is not a wrapper
     * @example
     * isWrapperFunction({ type: 'ArrowFunctionExpression' }) // => true
     */
    function isWrapperFunction(expression) {
      if (!expression) return false
      return (
        expression.type === 'ArrowFunctionExpression' ||
        expression.type === 'FunctionExpression'
      )
    }

    /**
     * Records a JSX attribute pass for later evaluation.
     * @param {import('estree').JSXAttribute} node
     * @returns
     * - No return value (stores a pass record)
     * - No action when the attribute has no expression value
     * @example
     * recordJsxAttributePass(node) // => undefined
     */
    function recordJsxAttributePass(node) {
      if (!node.value || node.value.type !== 'JSXExpressionContainer') return
      const expression = node.value.expression
      if (isWrapperFunction(expression)) return
      const openingElement = node.parent
      const { componentName, isIntrinsic } = getJsxElementInfo(openingElement)
      const propName = node.name && node.name.type === 'JSXIdentifier'
        ? node.name.name
        : null
      propPasses.push({
        type: 'jsx',
        reportNode: node,
        fromComponent: getCurrentComponentFrame()
          ? getCurrentComponentFrame().node
          : null,
        toComponentName: componentName,
        propName,
        expression,
        isIntrinsic,
      })
    }

    /**
     * Records a createElement props pass for later evaluation.
     * @param {import('estree').CallExpression} node
     * @returns
     * - No return value (stores a pass record)
     * - No action when the call is not createElement
     * @example
     * recordCreateElementPass(node) // => undefined
     */
    function recordCreateElementPass(node) {
      if (!isCreateElementCall(node)) return
      const args = node.arguments || []
      if (args.length < MIN_CREATE_ELEMENT_ARGS) return
      const targetInfo = getCreateElementTargetInfo(
        args[CREATE_ELEMENT_TARGET_INDEX],
      )
      const propsArg = args[CREATE_ELEMENT_PROPS_INDEX]
      propPasses.push({
        type: 'createElement',
        reportNode: node,
        fromComponent: getCurrentComponentFrame()
          ? getCurrentComponentFrame().node
          : null,
        toComponentName: targetInfo.componentName,
        propsNode: propsArg,
        isIntrinsic: targetInfo.isIntrinsic,
      })
    }

    /**
     * Iterates over prop entries for a recorded pass.
     * @param {object} pass
     * @param {(propName: string | null, expression: import('estree').Expression | null) => void} callback
     * @returns
     * - No return value (invokes callback for each entry)
     * - No action when the pass has no props
     * @example
     * forEachPassEntry(pass, (prop, expr) => {}) // => undefined
     */
    function forEachPassEntry(pass, callback) {
      if (pass.type === 'jsx') {
        callback(pass.propName, pass.expression)
        return
      }
      if (pass.type !== 'createElement') return
      if (!pass.propsNode || pass.propsNode.type !== 'ObjectExpression') return
      for (const prop of pass.propsNode.properties) {
        if (prop.type !== 'Property' || prop.computed) continue
        const propName = getPropNameFromKey(prop.key)
        if (!propName) continue
        const value = prop.value
        if (!value) continue
        callback(propName, value)
      }
    }

    /**
     * Initializes a depth map for each tracked component.
     * @returns
     * - A map from component node to prop depth map
     * - An empty map when no components are tracked
     * @example
     * initializePropDepths() // => Map([[node, Map()]])
     */
    function initializePropDepths() {
      const depthMap = new Map()
      for (const frame of components.values()) {
        depthMap.set(frame.node, new Map())
      }
      return depthMap
    }

    /**
     * Propagates setter-derived prop depths through known components.
     * @param {Map<import('estree').Node, Map<string, number>>} propDepthsByComponent
     * @returns
     * - No return value (updates the depth maps)
     * - No action when depth propagation is disabled
     * @example
     * propagateSetterDepths(depths) // => undefined
     */
    function propagateSetterDepths(propDepthsByComponent) {
      if (allowedDepth <= MIN_ALLOWED_DEPTH) return
      let didUpdate = true
      while (didUpdate) {
        didUpdate = false
        for (const pass of propPasses) {
          if (pass.isIntrinsic) continue
          if (!pass.fromComponent) continue
          const fromFrame = components.get(pass.fromComponent)
          if (!fromFrame) continue
          const toComponentNode = pass.toComponentName
            ? componentsByName.get(pass.toComponentName)
            : null
          if (!toComponentNode) continue
          const targetDepths = propDepthsByComponent.get(toComponentNode)
          if (!targetDepths) continue

          forEachPassEntry(pass, (propName, expression) => {
            if (!propName || !expression) return
            if (isWrapperFunction(expression)) return
            const origins = collectSetterOrigins(
              expression,
              fromFrame,
              propDepthsByComponent,
            )
            for (const origin of origins) {
              if (!origin.canPropagate) continue
              const nextDepth = origin.depth + DEPTH_INCREMENT
              if (nextDepth > allowedDepth) continue
              const existing = targetDepths.get(propName)
              if (existing === undefined || nextDepth < existing) {
                targetDepths.set(propName, nextDepth)
                didUpdate = true
              }
            }
          })
        }
      }
    }

    /**
     * Reports prop drilling violations based on computed depths.
     * @param {Map<import('estree').Node, Map<string, number>>} propDepthsByComponent
     * @returns
     * - No return value (reports ESLint errors)
     * - No action when no violations are detected
     * @example
     * reportViolations(depths) // => undefined
     */
    function reportViolations(propDepthsByComponent) {
      for (const pass of propPasses) {
        if (!pass.fromComponent) continue
        const fromFrame = components.get(pass.fromComponent)
        if (!fromFrame) continue
        let shouldReport = false
        let reportName = null
        forEachPassEntry(pass, (propName, expression) => {
          if (!expression) return
          if (isWrapperFunction(expression)) return
          const origins = collectSetterOrigins(
            expression,
            fromFrame,
            propDepthsByComponent,
          )
          for (const origin of origins) {
            const nextDepth = origin.depth + DEPTH_INCREMENT
            const exceedsAllowedDepth = pass.isIntrinsic
              ? origin.depth > allowedDepth
              : nextDepth > allowedDepth
            const isLocalSetter = origin.depth === LOCAL_SETTER_DEPTH
            if (
              (pass.isIntrinsic && (isLocalSetter || exceedsAllowedDepth)) ||
              (!pass.isIntrinsic && exceedsAllowedDepth)
            ) {
              shouldReport = true
              reportName = origin.name
              return
            }
          }
        })
        if (shouldReport) {
          context.report({
            node: pass.reportNode,
            messageId: 'noPropDrillSetter',
            data: { name: reportName },
          })
        }
      }
    }

    return {
      /**
       * Tracks component declarations in function form.
       * @param {import('estree').FunctionDeclaration} node
       * @returns
       * - No return value (updates component stack)
       * - No action when the function is not a component
       * @example
       * FunctionDeclaration(node) // => undefined
       */
      FunctionDeclaration(node) {
        enterComponent(node)
      },
      /**
       * Pops component frames on function declaration exit.
       * @param {import('estree').FunctionDeclaration} node
       * @returns
       * - No return value (updates component stack)
       * - No action when the function is not tracked
       * @example
       * FunctionDeclaration:exit(node) // => undefined
       */
      'FunctionDeclaration:exit'(node) {
        leaveComponent(node)
      },
      /**
       * Tracks component declarations for function expressions.
       * @param {import('estree').FunctionExpression} node
       * @returns
       * - No return value (updates component stack)
       * - No action when the function is not a component
       * @example
       * FunctionExpression(node) // => undefined
       */
      FunctionExpression(node) {
        enterComponent(node)
      },
      /**
       * Pops component frames on function expression exit.
       * @param {import('estree').FunctionExpression} node
       * @returns
       * - No return value (updates component stack)
       * - No action when the function is not tracked
       * @example
       * FunctionExpression:exit(node) // => undefined
       */
      'FunctionExpression:exit'(node) {
        leaveComponent(node)
      },
      /**
       * Tracks component declarations for arrow functions.
       * @param {import('estree').ArrowFunctionExpression} node
       * @returns
       * - No return value (updates component stack)
       * - No action when the function is not a component
       * @example
       * ArrowFunctionExpression(node) // => undefined
       */
      ArrowFunctionExpression(node) {
        enterComponent(node)
      },
      /**
       * Pops component frames on arrow function exit.
       * @param {import('estree').ArrowFunctionExpression} node
       * @returns
       * - No return value (updates component stack)
       * - No action when the function is not tracked
       * @example
       * ArrowFunctionExpression:exit(node) // => undefined
       */
      'ArrowFunctionExpression:exit'(node) {
        leaveComponent(node)
      },
      /**
       * Tracks useState setter names declared in components.
       * @param {import('estree').VariableDeclarator} node
       * @returns
       * - No return value (updates setter tracking)
       * - No action when the declarator is not useState
       * @example
       * VariableDeclarator(node) // => undefined
       */
      VariableDeclarator(node) {
        collectSetterFromDeclarator(node)
      },
      /**
       * Records JSX prop passes for later evaluation.
       * @param {import('estree').JSXAttribute} node
       * @returns
       * - No return value (queues pass data)
       * - No action when the attribute is not an expression
       * @example
       * JSXAttribute(node) // => undefined
       */
      JSXAttribute(node) {
        recordJsxAttributePass(node)
      },
      /**
       * Records React.createElement prop passes for later evaluation.
       * @param {import('estree').CallExpression} node
       * @returns
       * - No return value (queues pass data)
       * - No action when the call is not createElement
       * @example
       * CallExpression(node) // => undefined
       */
      CallExpression(node) {
        recordCreateElementPass(node)
      },
      /**
       * Runs the depth propagation and reporting after traversal.
       * @returns
       * - No return value (reports ESLint errors)
       * - No action when no passes are recorded
       * @example
       * Program:exit() // => undefined
       */
      'Program:exit'() {
        const propDepthsByComponent = initializePropDepths()
        propagateSetterDepths(propDepthsByComponent)
        reportViolations(propDepthsByComponent)
      },
    }
  },
}
