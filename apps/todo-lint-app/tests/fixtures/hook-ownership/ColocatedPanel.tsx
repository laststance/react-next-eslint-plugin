import { useEffect } from 'react'

export function ColocatedPanel() {
  usePanelTitle()
  return <div>Cart</div>
}

// A component-specific effect stays named and below its owner at module scope.
function usePanelTitle() {
  useEffect(() => {
    document.title = 'Cart'
  }, [])
}
