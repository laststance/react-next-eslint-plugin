import React, { createContext, forwardRef, useEffect } from 'react'

const ThemeContext = createContext({ mode: 'light' })

const ForwardedButton = forwardRef(function ForwardedButton(_props, ref) {
  return <button ref={ref}>Forwarded</button>
})

export default function V10CompatFixture() {
  useEffect(() => {}, [])

  return (
    <ThemeContext.Provider value={{ mode: 'dark' }}>
      <button>Missing button type</button>
      <ForwardedButton />
    </ThemeContext.Provider>
  )
}
