import { useCart } from './useCart'
import './panel.css'

export function CartPanel() {
  const [count] = useCart()
  return <div>{count}</div>
}
