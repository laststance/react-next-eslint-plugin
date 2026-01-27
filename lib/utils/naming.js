/**
 * Helpers for identifier naming conventions.
 */

/**
 * Checks if a string follows PascalCase naming convention.
 * @param {string | null | undefined} name - Name to validate.
 * @returns {boolean} True if the name is PascalCase.
 */
export function isPascalCase(name) {
  if (typeof name !== 'string') return false
  return /^[A-Z][A-Za-z0-9]*$/.test(name)
}

/**
 * Checks if a string looks like a component name (loose check).
 * @param {string | null | undefined} name - Name to validate.
 * @returns {boolean} True if the name starts with an uppercase letter.
 */
export function isComponentNameLoose(name) {
  if (typeof name !== 'string') return false
  return /^_?[A-Z]/.test(name)
}
