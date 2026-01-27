/* eslint-disable react/display-name, react-hooks/static-components */
import { createContext, forwardRef, memo, type Ref } from 'react'

const THEME_DARK = 'dark'
const ITEM_ID_FIRST = 1
const ITEM_ID_SECOND = 2
const ITEM_LABEL_FIRST = 'One'
const ITEM_LABEL_SECOND = 'Two'
const DUPLICATE_KEY_VALUE = 'duplicate'
const FORWARDED_BUTTON_LABEL = 'Forwarded'
const MISSING_TYPE_LABEL = 'Missing type'

type ThemeValue = {
  theme: string
}

type Item = {
  id: number
  label: string
}

const THEME_CONTEXT_VALUE: ThemeValue = {
  theme: THEME_DARK,
}

const ITEMS: Item[] = [
  { id: ITEM_ID_FIRST, label: ITEM_LABEL_FIRST },
  { id: ITEM_ID_SECOND, label: ITEM_LABEL_SECOND },
]

const ThemeContext = createContext<ThemeValue>(THEME_CONTEXT_VALUE)

const AnonymousCard = memo(
  /**
   * Renders an anonymous memoized card to trigger displayName warnings.
   * @returns
   * - A placeholder card element
   * @example
   * <AnonymousCard />
   */
  function () {
    return (
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        Anonymous memoized card
      </div>
    )
  },
)

const ForwardedButton = forwardRef(ForwardedButtonBase)

/**
 * Renders a list with duplicate key values to trigger lint warnings.
 * @returns
 * - A list that intentionally repeats key values
 * @example
 * <DuplicateKeyList />
 */
function DuplicateKeyList() {
  return (
    <ul className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
      <li key={DUPLICATE_KEY_VALUE}>Duplicate A</li>
      <li key={DUPLICATE_KEY_VALUE}>Duplicate B</li>
    </ul>
  )
}

/**
 * Renders list items without keys to trigger missing key warnings.
 * @param item - Item to render.
 * @returns
 * - A list item that intentionally omits the key prop
 * @example
 * renderItemWithoutKey({ id: ITEM_ID_FIRST, label: ITEM_LABEL_FIRST })
 */
function renderItemWithoutKey(item: Item) {
  return <li className="text-sm text-slate-700">{item.label}</li>
}

/**
 * Renders the /invalid page with deliberate lint rule violations.
 * @returns
 * - A layout that triggers the newly added lint rules
 * @example
 * <InvalidPage />
 */
export default function InvalidPage() {
  /**
   * Renders a nested component to trigger the nested definition rule.
   * @returns
   * - A nested badge element
   * @example
   * <NestedBadge />
   */
  function NestedBadge() {
    return (
      <span className="rounded-full bg-slate-900 px-2 py-1 text-xs text-white">
        Nested
      </span>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <ThemeContext.Provider value={THEME_CONTEXT_VALUE}>
        <section className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Invalid rule examples</h1>
          <p className="text-sm text-slate-600">
            This page intentionally violates the newly added lint rules.
          </p>
          <AnonymousCard />
          <ForwardedButton label={FORWARDED_BUTTON_LABEL} />
          <button className="rounded-full border px-3 py-1 text-sm">
            {MISSING_TYPE_LABEL}
          </button>
          <ul className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {ITEMS.map(renderItemWithoutKey)}
          </ul>
          <DuplicateKeyList />
          <NestedBadge />
        </section>
      </ThemeContext.Provider>
    </main>
  )
}

/**
 * Renders a forwarded button to trigger the forwardRef rule.
 * @param props - Component props.
 * @param props.label - Label to display.
 * @param ref - Forwarded ref for the button element.
 * @returns
 * - A button that forwards a ref
 * @example
 * <ForwardedButton label="Forwarded" />
 */
function ForwardedButtonBase(
  { label }: { label: string },
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <button
      ref={ref}
      type="button"
      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
    >
      {label}
    </button>
  )
}
