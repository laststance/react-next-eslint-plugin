/**
 * Helpers for resolving React-related ESLint settings.
 */

const DEFAULT_REACT_IMPORT_SOURCE = 'react'
const DEFAULT_REACT_VERSION = '19.0.0'
const DEFAULT_POLYMORPHIC_PROP_NAME = 'as'
const VERSION_SEPARATOR = '.'
const DECIMAL_RADIX = 10
const MAJOR_VERSION_INDEX = 0

/**
 * Normalizes React-related settings from ESLint context.
 * @param {import('eslint').Rule.RuleContext} context - ESLint rule context.
 * @returns {{ version: string, importSource: string, polymorphicPropName: string }}
 */
export function getReactSettings(context) {
  const rawSettings =
    (context.settings && context.settings['react-x']) || {}
  const version =
    typeof rawSettings.version === 'string' && rawSettings.version.trim()
      ? rawSettings.version
      : DEFAULT_REACT_VERSION
  const importSource =
    typeof rawSettings.importSource === 'string' &&
    rawSettings.importSource.trim()
      ? rawSettings.importSource
      : DEFAULT_REACT_IMPORT_SOURCE
  const polymorphicPropName =
    typeof rawSettings.polymorphicPropName === 'string' &&
    rawSettings.polymorphicPropName.trim()
      ? rawSettings.polymorphicPropName
      : DEFAULT_POLYMORPHIC_PROP_NAME

  return {
    version,
    importSource,
    polymorphicPropName,
  }
}

/**
 * Checks whether a version string meets a major-version threshold.
 * @param {string} version - Version string such as "19.0.0".
 * @param {number} requiredMajor - Minimum major version.
 * @returns {boolean} True when the version is at least the required major.
 */
export function isVersionAtLeastMajor(version, requiredMajor) {
  const majorPart = version.split(VERSION_SEPARATOR)[MAJOR_VERSION_INDEX]
  const major = Number.parseInt(majorPart ?? '', DECIMAL_RADIX)
  if (Number.isNaN(major)) {
    return false
  }
  return major >= requiredMajor
}
