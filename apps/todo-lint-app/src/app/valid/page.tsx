import { createContext, memo, type Ref } from 'react'

const THEME_LIGHT = 'light'
const PRODUCT_ID_ALPHA = 1
const PRODUCT_ID_BETA = 2
const PRODUCT_LABEL_ALPHA = 'Alpha'
const PRODUCT_LABEL_BETA = 'Beta'
const BUTTON_LABEL = 'Confirm'

type ThemeValue = {
  theme: string
}

type Product = {
  id: number
  label: string
}

const THEME_CONTEXT_VALUE: ThemeValue = {
  theme: THEME_LIGHT,
}

const PRODUCTS: Product[] = [
  { id: PRODUCT_ID_ALPHA, label: PRODUCT_LABEL_ALPHA },
  { id: PRODUCT_ID_BETA, label: PRODUCT_LABEL_BETA },
]

const ThemeContext = createContext<ThemeValue>(THEME_CONTEXT_VALUE)

const MemoizedProductList = memo(ProductList)

/**
 * Renders the /valid page with rule-compliant examples.
 * @returns
 * - A layout demonstrating valid usage for the added lint rules
 * @example
 * <ValidPage />
 */
export default function ValidPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <ThemeContext value={THEME_CONTEXT_VALUE}>
        <section className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Valid rule examples</h1>
          <p className="text-sm text-slate-600">
            This page keeps the new lint rules satisfied.
          </p>
          <MemoizedProductList items={PRODUCTS} />
          <RefAwareButton label={BUTTON_LABEL} />
        </section>
      </ThemeContext>
    </main>
  )
}

/**
 * Renders a memoized list of products with stable keys.
 * @param props - Component props.
 * @param props.items - Items to display.
 * @returns
 * - A list of product rows with unique keys
 * @example
 * <ProductList items={PRODUCTS} />
 */
function ProductList({ items }: { items: Product[] }) {
  return (
    <ul className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {items.map(renderProductItem)}
    </ul>
  )
}

/**
 * Renders a single product item list row.
 * @param item - Product to render.
 * @returns
 * - A list item showing the product label
 * @example
 * renderProductItem({ id: PRODUCT_ID_ALPHA, label: PRODUCT_LABEL_ALPHA })
 */
function renderProductItem(item: Product) {
  return (
    <li
      key={item.id}
      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-slate-700"
    >
      <span>{item.label}</span>
      <span className="text-xs uppercase tracking-wide text-slate-400">
        ready
      </span>
    </li>
  )
}

/**
 * Renders a button that accepts a ref as a prop without forwardRef.
 * @param props - Component props.
 * @param props.label - Label text for the button.
 * @param props.buttonRef - Optional ref to attach to the button.
 * @returns
 * - A button with an explicit type attribute
 * @example
 * <RefAwareButton label="Confirm" />
 */
function RefAwareButton({
  label,
  buttonRef,
}: {
  label: string
  buttonRef?: Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
    >
      {label}
    </button>
  )
}
