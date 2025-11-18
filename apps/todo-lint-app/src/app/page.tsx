'use client'

import {
  createContext,
  memo,
  type CSSProperties,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

type Task = {
  id: number
  label: string
  completed: boolean
}

type TaskListProps = {
  title: string
  tasks: Task[]
  onToggle: (taskId: number) => void
  listStyles: CSSProperties
}

type FilterContextValue = {
  filters: { showCompleted: boolean; searchText: string }
  toggleFilter: () => void
}

const FilterContext = createContext<FilterContextValue>({
  filters: { showCompleted: false, searchText: '' },
  toggleFilter: () => {},
})

const MemoizedTaskList = memo(function MemoizedTaskList({
  title,
  tasks,
  onToggle,
  listStyles,
}: TaskListProps) {
  return (
    <section
      className="rounded-xl border bg-white shadow-sm"
      style={listStyles}
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          memoized child
        </span>
      </header>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between gap-2">
            <span
              className={
                task.completed
                  ? 'line-through text-slate-400'
                  : 'text-slate-700'
              }
            >
              {task.label}
            </span>
            <button
              type="button"
              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
              onClick={() => onToggle(task.id)}
            >
              Toggle
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
})

const PlainActionButton = ({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) => (
  <button
    type="button"
    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
    onClick={onPress}
  >
    {label}
  </button>
)

const StatsPanel = ({
  filters,
}: {
  filters: { showCompleted: boolean; searchText: string }
}) => (
  <section className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
    <p className="font-semibold">Filters (custom component)</p>
    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">
      {JSON.stringify(filters, null, 2)}
    </pre>
  </section>
)

const FilterContextPanel = ({ label }: { label: string }) => {
  const { filters, toggleFilter } = useContext(FilterContext)
  return (
    <section className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">{label}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Context provider demo
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          onClick={toggleFilter}
        >
          Toggle via context
        </button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-500">
        {JSON.stringify(filters, null, 2)}
      </pre>
    </section>
  )
}

type MetricCardProps = {
  title: string
  value: string
  className: string
}

const MetricCard = memo(function MetricCard({
  title,
  value,
  className,
}: MetricCardProps) {
  return (
    <article className={className}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </article>
  )
})

const initialTasks: Task[] = [
  { id: 1, label: 'Read repo docs', completed: true },
  { id: 2, label: 'Wire up ESLint snapshot', completed: false },
  { id: 3, label: 'Polish UI copy', completed: false },
]

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [newLabel, setNewLabel] = useState('')
  const [filterCompleted, setFilterCompleted] = useState(false)
  const completedCount = tasks.filter((task) => task.completed).length

  const addTask = useCallback(() => {
    if (!newLabel.trim()) return
    setTasks((current) => [
      ...current,
      { id: Date.now(), label: newLabel.trim(), completed: false },
    ])
    setNewLabel('')
  }, [newLabel])

  const stableToggle = useCallback((taskId: number) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    )
  }, [])

  const inlineToggle = (taskId: number) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, completed: task.completed } : task,
      ),
    )
  }

  const memoListStyles = useMemo<CSSProperties>(
    () => ({
      borderColor: filterCompleted ? '#22c55e' : '#94a3b8',
      borderWidth: '2px',
      padding: '1.5rem',
    }),
    [filterCompleted],
  )

  const unstableEmphasisStyles: CSSProperties = {
    borderColor: '#f97316',
    borderWidth: '2px',
    padding: '1.5rem',
    backgroundColor: '#fff7ed',
  }

  const inlineFilters = {
    showCompleted: filterCompleted,
    searchText: newLabel,
  }

  const stableFilters = useMemo(
    () => ({
      showCompleted: filterCompleted,
      searchText: newLabel || 'all tasks',
    }),
    [filterCompleted, newLabel],
  )

  const stableContextValue = useMemo(
    () => ({
      filters: stableFilters,
      toggleFilter: () => setFilterCompleted((flag) => !flag),
    }),
    [stableFilters, setFilterCompleted],
  )

  const meaninglessFocus = useCallback(() => {
    setNewLabel((label) => label.trimStart())
  }, [])

  const uselessMemoizedStyle = useMemo<CSSProperties>(
    () => ({ backgroundColor: filterCompleted ? '#ecfccb' : '#f8fafc' }),
    [filterCompleted],
  )

  const stableMetricClassName = useMemo(
    () =>
      [
        'rounded-2xl border-2 border-blue-200 bg-white p-6 shadow-sm transition-all',
        filterCompleted ? 'bg-blue-50 text-blue-900' : 'text-slate-800',
      ].join(' '),
    [filterCompleted],
  )

  return (
    <main className="flex min-h-screen flex-col gap-8 bg-slate-50 p-8 text-slate-900">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Workspace ESLint playground
        </p>
        <h1 className="text-3xl font-bold">Snapshot tested TODO board</h1>
        <p className="text-slate-600">
          This page intentionally mixes code that should pass and fail the
          custom `@laststance/react-next-eslint-plugin` rules.
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <label className="flex w-full flex-col gap-2 text-sm text-slate-600">
            Task label
            <input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              onFocus={meaninglessFocus}
              style={uselessMemoizedStyle}
              className="rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="Add lint fixtures"
            />
          </label>
          <div className="flex flex-col gap-2">
            <PlainActionButton
              label="Toggle filter (inline handler)"
              onPress={() => setFilterCompleted((flag) => !flag)}
            />
            <PlainActionButton label="Add task" onPress={addTask} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <MemoizedTaskList
          title="Stable toggle + memoized styles"
          tasks={tasks}
          onToggle={stableToggle}
          listStyles={memoListStyles}
        />
        <MemoizedTaskList
          title="Inline toggle + inline styles"
          tasks={tasks}
          onToggle={inlineToggle}
          listStyles={unstableEmphasisStyles}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <StatsPanel filters={inlineFilters} />
        <StatsPanel filters={stableFilters} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <FilterContext.Provider
          value={{
            filters: inlineFilters,
            toggleFilter: () => setFilterCompleted((flag) => !flag),
          }}
        >
          <FilterContextPanel label="Inline provider (should warn)" />
        </FilterContext.Provider>
        <FilterContext.Provider value={stableContextValue}>
          <FilterContextPanel label="Memoized provider" />
        </FilterContext.Provider>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <MetricCard
          title="Inline className builder"
          value={`${completedCount}/${tasks.length} done`}
          className={[
            'rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-all',
            filterCompleted
              ? 'bg-emerald-50 text-emerald-900'
              : 'text-slate-800',
          ].join(' ')}
        />
        <MetricCard
          title="Memoized className"
          value={filterCompleted ? 'Filtered view' : 'All tasks'}
          className={stableMetricClassName}
        />
      </section>
    </main>
  )
}
