import React, { createContext, forwardRef, useEffect } from 'react'

const ThemeContext = createContext({ mode: 'light' })
const USELESS_FRAGMENT_LABEL = 'Useless fragment text'

const ForwardedButton = forwardRef(function ForwardedButton(_props, ref) {
  return (
    <button ref={ref} type="button">
      Forwarded
    </button>
  )
})

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
    </ThemeContext.Provider>
  )
}
