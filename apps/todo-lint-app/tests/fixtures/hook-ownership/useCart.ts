import { useState } from 'react'

// Deliberately separate: the integration must report CartPanel as its only owner.
export function useCart() {
  return useState(0)
}
