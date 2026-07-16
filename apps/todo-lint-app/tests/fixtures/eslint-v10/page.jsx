import React, { createContext, forwardRef, useEffect } from 'react'

const ThemeContext = createContext({ mode: 'light' })
const USELESS_FRAGMENT_LABEL = 'Useless fragment text'
const PROP_DRILLING_VALUE = 'Forwarded through two component levels'

const ForwardedButton = forwardRef(function ForwardedButton(_props, ref) {
  return (
    <button ref={ref} type="button">
      Forwarded
    </button>
  )
})

/**
 * Starts the v10 fixture's prop chain so the next component can demonstrate the violation.
 * @param {{ value: string }} props Component props.
 * @returns
 * - The first allowed component boundary
 * @example
 * <PropDrillingParent value="Example" />
 */
function PropDrillingParent({ value }) {
  return <PropDrillingChild value={value} />
}

/**
 * Forwards the fixture prop at depth two so ESLint v10 compatibility tests observe the rule.
 * @param {{ value: string }} props Component props.
 * @returns
 * - The second component boundary reported by the rule
 * @example
 * <PropDrillingChild value="Example" />
 */
function PropDrillingChild({ value }) {
  // This second forwarding edge intentionally demonstrates the lint violation.
  return <PropDrillingGrandchild value={value} />
}

/**
 * Renders the fixture prop after its deliberate two-level forwarding chain.
 * @param {{ value: string }} props Component props.
 * @returns
 * - A leaf element containing the drilled value
 * @example
 * <PropDrillingGrandchild value="Example" />
 */
function PropDrillingGrandchild({ value }) {
  return <span>{value}</span>
}

export default function V10CompatFixture() {
  useEffect(() => {}, [])

  return (
    <ThemeContext.Provider value={{ mode: 'dark' }}>
      <button>Missing button type</button>
      <ForwardedButton />
      <p>{(() => 'JSX IIFE')()}</p>
      <div>
        <>{USELESS_FRAGMENT_LABEL}</>
      </div>
      <PropDrillingParent value={PROP_DRILLING_VALUE} />
    </ThemeContext.Provider>
  )
}
