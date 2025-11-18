/**
 * @fileoverview Enforce wrapping function props passed to memoized components with useCallback.
 */

const INLINE_FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
])

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require functions passed to memoized components to be wrapped in useCallback for referential stability.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      inlineFunction:
        'Memoized component "{{componentName}}" receives a new inline function for prop "{{propName}}". Wrap it with useCallback to keep the reference stable.',
      unstableReference:
        'Function "{{functionName}}" passed to memoized component "{{componentName}}" via prop "{{propName}}" is not wrapped in useCallback. Wrap it with useCallback to avoid breaking memoization.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()
    const memoizedComponents = new Set()
    const memoIdentifiers = new Set()
    const useCallbackIdentifiers = new Set()
    const createElementIdentifiers = new Set()
    const reactNamespaceIdentifiers = new Set(['React'])

    function unwrapChain(node) {
      return node && node.type === 'ChainExpression' ? node.expression : node
    }

    function normalizeExpression(node) {
      let current = node
      while (
        current &&
        (current.type === 'TSAsExpression' ||
          current.type === 'TSTypeAssertion' ||
          current.type === 'TypeCastExpression' ||
          current.type === 'TSNonNullExpression' ||
          current.type === 'ParenthesizedExpression')
      ) {
        current = current.expression
      }
      if (current && current.type === 'ChainExpression') {
        current = current.expression
      }
      return current
    }

    function isIdentifierNamed(node, names) {
      return node && node.type === 'Identifier' && names.has(node.name)
    }

    function getMemberPropertyName(member) {
      if (member.computed) {
        return member.property.type === 'Literal' &&
          typeof member.property.value === 'string'
          ? member.property.value
          : null
      }
      return member.property.type === 'Identifier'
        ? member.property.name
        : null
    }

    function isReactNamespaceMember(node, property) {
      const target = unwrapChain(node)
      return (
        target &&
        target.type === 'MemberExpression' &&
        target.object.type === 'Identifier' &&
        reactNamespaceIdentifiers.has(target.object.name) &&
        getMemberPropertyName(target) === property
      )
    }

    function isRequireOfReact(node) {
      return (
        node &&
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal' &&
        node.arguments[0].value === 'react'
      )
    }

    function registerReactDestructuring(pattern) {
      for (const prop of pattern.properties) {
        if (prop.type !== 'Property') continue
        if (prop.computed) continue
        const key = prop.key
        if (key.type !== 'Identifier') continue
        let local = null
        if (prop.value.type === 'Identifier') {
          local = prop.value.name
        } else if (
          prop.value.type === 'AssignmentPattern' &&
          prop.value.left.type === 'Identifier'
        ) {
          local = prop.value.left.name
        }
        if (!local) continue
        if (key.name === 'memo') memoIdentifiers.add(local)
        if (key.name === 'useCallback') useCallbackIdentifiers.add(local)
        if (key.name === 'createElement') createElementIdentifiers.add(local)
      }
    }

    function trackReactAliasesFromDeclarator(node) {
      if (!node.init) return
      const init = normalizeExpression(node.init)
      if (isRequireOfReact(init)) {
        if (node.id.type === 'Identifier') {
          reactNamespaceIdentifiers.add(node.id.name)
        } else if (node.id.type === 'ObjectPattern') {
          registerReactDestructuring(node.id)
        }
        return
      }

      if (
        node.id.type === 'Identifier' &&
        init &&
        init.type === 'MemberExpression' &&
        getMemberPropertyName(init) === 'default'
      ) {
        const object = init.object
        if (
          (object.type === 'Identifier' &&
            reactNamespaceIdentifiers.has(object.name)) ||
          isRequireOfReact(object)
        ) {
          reactNamespaceIdentifiers.add(node.id.name)
          return
        }
      }

      if (node.id.type === 'ObjectPattern') {
        if (init.type === 'Identifier' && reactNamespaceIdentifiers.has(init.name)) {
          registerReactDestructuring(node.id)
        }
        return
      }

      if (node.id.type !== 'Identifier') return

      if (init.type === 'Identifier' && reactNamespaceIdentifiers.has(init.name)) {
        reactNamespaceIdentifiers.add(node.id.name)
        return
      }

      if (init.type === 'MemberExpression') {
        const object = init.object
        const propertyName = getMemberPropertyName(init)
        if (!propertyName) return
        if (
          object.type === 'Identifier' &&
          reactNamespaceIdentifiers.has(object.name)
        ) {
          if (propertyName === 'memo') memoIdentifiers.add(node.id.name)
          if (propertyName === 'useCallback') useCallbackIdentifiers.add(node.id.name)
          if (propertyName === 'createElement') createElementIdentifiers.add(node.id.name)
          return
        }
        if (isRequireOfReact(object) && node.id.type === 'Identifier') {
          if (propertyName === 'memo') memoIdentifiers.add(node.id.name)
          if (propertyName === 'useCallback') useCallbackIdentifiers.add(node.id.name)
          if (propertyName === 'createElement') createElementIdentifiers.add(node.id.name)
        }
      }
    }

    function isMemoCallee(callee) {
      const target = unwrapChain(callee)
      return (
        isIdentifierNamed(target, memoIdentifiers) ||
        isReactNamespaceMember(target, 'memo')
      )
    }

    function isUseCallbackCallee(callee) {
      const target = unwrapChain(callee)
      return (
        isIdentifierNamed(target, useCallbackIdentifiers) ||
        isReactNamespaceMember(target, 'useCallback')
      )
    }

    function isCreateElementCallee(callee) {
      const target = unwrapChain(callee)
      return (
        isIdentifierNamed(target, createElementIdentifiers) ||
        isReactNamespaceMember(target, 'createElement')
      )
    }

    function getVariable(identifier) {
      if (!identifier || identifier.type !== 'Identifier') return null
      let scope
      if (typeof sourceCode.getScope === 'function') {
        scope = sourceCode.getScope(identifier)
      }
      scope = scope || context.getScope()
      while (scope) {
        if (scope.set && scope.set.has(identifier.name)) {
          return scope.set.get(identifier.name)
        }
        scope = scope.upper
      }
      return null
    }

    function isUseCallbackVariable(identifier) {
      const variable = getVariable(identifier)
      if (!variable) return false
      return variable.defs.some((def) => {
        if (def.type !== 'Variable') return false
        const init = def.node.init && normalizeExpression(def.node.init)
        return init && init.type === 'CallExpression' && isUseCallbackCallee(init.callee)
      })
    }

    function isLocalFunctionReference(identifier) {
      const variable = getVariable(identifier)
      if (!variable) return false
      if (variable.scope && ['module', 'global'].includes(variable.scope.type)) {
        return false
      }
      return variable.defs.some((def) => {
        if (def.type === 'FunctionName') return true
        if (def.type === 'Variable') {
          const init = def.node.init && normalizeExpression(def.node.init)
          if (!init) return false
          return INLINE_FUNCTION_TYPES.has(init.type)
        }
        return false
      })
    }

    function reportInline(attributeNode, componentName, propName) {
      context.report({
        node: attributeNode,
        messageId: 'inlineFunction',
        data: { componentName, propName },
      })
    }

    function reportIdentifier(attributeNode, componentName, propName, functionName) {
      context.report({
        node: attributeNode,
        messageId: 'unstableReference',
        data: { componentName, propName, functionName },
      })
    }

    function checkFunctionExpression(expression, attributeNode, componentName, propName) {
      const normalized = normalizeExpression(expression)
      if (normalized && INLINE_FUNCTION_TYPES.has(normalized.type)) {
        reportInline(attributeNode, componentName, propName)
        return true
      }
      return false
    }

    function checkIdentifierExpression(expression, attributeNode, componentName, propName) {
      const normalized = normalizeExpression(expression)
      if (!normalized || normalized.type !== 'Identifier') return
      if (isUseCallbackVariable(normalized)) return
      if (!isLocalFunctionReference(normalized)) return
      reportIdentifier(attributeNode, componentName, propName, normalized.name)
    }

    function handleJsxAttribute(attribute, componentName) {
      if (attribute.type !== 'JSXAttribute') return
      if (!attribute.value || attribute.value.type !== 'JSXExpressionContainer') return
      const propName =
        attribute.name && attribute.name.type === 'JSXIdentifier'
          ? attribute.name.name
          : '(unknown)'
      const expression = attribute.value.expression
      if (!expression) return
      if (checkFunctionExpression(expression, attribute.value, componentName, propName)) {
        return
      }
      checkIdentifierExpression(expression, attribute.value, componentName, propName)
    }

    function extractComponentNameFromJsx(node) {
      if (!node.name) return null
      if (node.name.type === 'JSXIdentifier') {
        return node.name.name
      }
      return null
    }

    function extractComponentNameFromCreateElementArg(arg) {
      const target = unwrapChain(arg)
      if (target && target.type === 'Identifier') {
        return target.name
      }
      return null
    }

    function handleCreateElementProps(propsNode, componentName) {
      if (!propsNode || propsNode.type !== 'ObjectExpression') return
      for (const prop of propsNode.properties) {
        if (prop.type !== 'Property' || prop.kind !== 'init' || prop.computed) continue
        const key = prop.key
        let propName = null
        if (key.type === 'Identifier') {
          propName = key.name
        } else if (key.type === 'Literal' && typeof key.value === 'string') {
          propName = key.value
        }
        if (!propName) continue
        const value = prop.value
        if (!value) continue
        if (checkFunctionExpression(value, value, componentName, propName)) {
          continue
        }
        checkIdentifierExpression(value, value, componentName, propName)
      }
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value !== 'react') return
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier') {
            reactNamespaceIdentifiers.add(specifier.local.name)
          } else if (specifier.type === 'ImportSpecifier') {
            const importedName = specifier.imported.name
            if (importedName === 'memo') memoIdentifiers.add(specifier.local.name)
            if (importedName === 'useCallback') useCallbackIdentifiers.add(specifier.local.name)
            if (importedName === 'createElement') createElementIdentifiers.add(specifier.local.name)
          }
        }
      },
      VariableDeclarator(node) {
        trackReactAliasesFromDeclarator(node)
        const init = node.init && normalizeExpression(node.init)
        if (node.id.type === 'Identifier' && init && init.type === 'CallExpression') {
          if (isMemoCallee(init.callee)) {
            memoizedComponents.add(node.id.name)
          }
        }
      },
      AssignmentExpression(node) {
        const left = node.left
        const right = node.right && normalizeExpression(node.right)
        if (!right || right.type !== 'CallExpression') return
        if (!isMemoCallee(right.callee)) return
        const target = left.type === 'Identifier' ? left : null
        if (target) {
          memoizedComponents.add(target.name)
        }
      },
      JSXOpeningElement(node) {
        const componentName = extractComponentNameFromJsx(node)
        if (!componentName) return
        if (!memoizedComponents.has(componentName)) return
        for (const attr of node.attributes) {
          handleJsxAttribute(attr, componentName)
        }
      },
      CallExpression(node) {
        if (!isCreateElementCallee(node.callee)) return
        if (node.arguments.length < 2) return
        const componentArg = node.arguments[0]
        const componentName = extractComponentNameFromCreateElementArg(componentArg)
        if (!componentName || !memoizedComponents.has(componentName)) return
        handleCreateElementProps(node.arguments[1], componentName)
      },
    }
  },
}
