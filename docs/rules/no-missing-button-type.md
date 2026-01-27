# no-missing-button-type

This rule is imported and adapted from https://github.com/jsx-eslint/eslint-plugin-react.

🔧 [Rule Source](../../lib/rules/no-missing-button-type.js)

## Rule Details

Buttons default to `type="submit"` in HTML forms. This rule enforces an explicit `type` for button elements.

### ❌ Incorrect

```javascript
<button />

<PolyComponent as="button" />
```

### ✅ Correct

```javascript
<button type="button" />

<PolyComponent type="button" as="button" />
```

## Options

If you use polymorphic components, set `settings['react-x'].polymorphicPropName` (defaults to `"as"`).
