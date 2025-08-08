export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow using React.useEffect/useEffect directly inside React components. Encourage semantic custom hooks instead.',
      category: 'Best Practices',
      recommended: false,
      url: 'https://github.com/laststance/react-next-eslint-plugin',
    },
    fixable: null,
    hasSuggestions: false,
    schema: [],
    messages: {
      avoidUseEffect:
        'Avoid using useEffect directly in components; create a semantic custom hook instead.',
    },
  },

  create(context) {
    function isPascalCase(name) {
      return /^[A-Z][A-Za-z0-9]*$/.test(name);
    }

    function isJSX(node) {
      return node && (node.type === 'JSXElement' || node.type === 'JSXFragment');
    }

    function functionReturnsJSX(fnNode) {
      if (!fnNode || (fnNode.type !== 'ArrowFunctionExpression' && fnNode.type !== 'FunctionExpression' && fnNode.type !== 'FunctionDeclaration')) {
        return false;
      }
      if (fnNode.type === 'ArrowFunctionExpression' && fnNode.expression && isJSX(fnNode.body)) {
        return true;
      }
      const body = fnNode.body && fnNode.body.type === 'BlockStatement' ? fnNode.body.body : [];
      for (const stmt of body) {
        if (stmt.type === 'ReturnStatement' && stmt.argument && isJSX(stmt.argument)) {
          return true;
        }
      }
      return false;
    }

    function isMemoCall(node) {
      if (!node || node.type !== 'CallExpression') return false;
      const callee = node.callee;
      if (callee.type === 'Identifier' && callee.name === 'memo') return true;
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'memo'
      ) {
        return true;
      }
      return false;
    }

    function isUseEffectCallee(callee) {
      if (!callee) return false;
      if (callee.type === 'Identifier' && callee.name === 'useEffect') return true;
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'useEffect'
      ) {
        return true;
      }
      return false;
    }

    const functionStack = [];

    function computeIsComponentFunction(node) {
      // Ignore custom hooks
      const nameFromId = node.id && node.id.type === 'Identifier' ? node.id.name : null;
      if (nameFromId && /^use[A-Z0-9].*/.test(nameFromId)) {
        return false;
      }

      // Function declaration: named component
      if (node.type === 'FunctionDeclaration') {
        if (nameFromId && isPascalCase(nameFromId) && functionReturnsJSX(node)) {
          return true;
        }
        return false;
      }

      // Function expression
      if (node.type === 'FunctionExpression') {
        // Named function expression
        if (nameFromId && isPascalCase(nameFromId) && functionReturnsJSX(node)) {
          return true;
        }
        // memo(function ...) assigned to PascalCase variable
        const parent = node.parent;
        if (parent && parent.type === 'CallExpression' && isMemoCall(parent)) {
          const gp = parent.parent;
          if (gp && gp.type === 'VariableDeclarator' && gp.id.type === 'Identifier' && isPascalCase(gp.id.name) && functionReturnsJSX(node)) {
            return true;
          }
        }
        return false;
      }

      // Arrow function
      if (node.type === 'ArrowFunctionExpression') {
        const parent = node.parent;
        if (
          parent &&
          parent.type === 'VariableDeclarator' &&
          parent.id &&
          parent.id.type === 'Identifier' &&
          isPascalCase(parent.id.name) &&
          functionReturnsJSX(node)
        ) {
          return true;
        }
        // memo(() => ...) assigned to PascalCase variable
        if (parent && parent.type === 'CallExpression' && isMemoCall(parent)) {
          const gp = parent.parent;
          if (gp && gp.type === 'VariableDeclarator' && gp.id.type === 'Identifier' && isPascalCase(gp.id.name) && functionReturnsJSX(node)) {
            return true;
          }
        }
        return false;
      }

      return false;
    }

    return {
      FunctionDeclaration: function (node) {
        functionStack.push({ isComponent: computeIsComponentFunction(node) });
      },
      'FunctionDeclaration:exit': function () {
        functionStack.pop();
      },

      FunctionExpression: function (node) {
        functionStack.push({ isComponent: computeIsComponentFunction(node) });
      },
      'FunctionExpression:exit': function () {
        functionStack.pop();
      },

      ArrowFunctionExpression: function (node) {
        functionStack.push({ isComponent: computeIsComponentFunction(node) });
      },
      'ArrowFunctionExpression:exit': function () {
        functionStack.pop();
      },

      CallExpression(node) {
        if (functionStack.length === 0) return;
        const current = functionStack[functionStack.length - 1];
        if (!current.isComponent) return;
        if (isUseEffectCallee(node.callee)) {
          context.report({ node, messageId: 'avoidUseEffect' });
        }
      },
    };
  },
};
