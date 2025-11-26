# no-direct-use-effect

Discourage calling `useEffect` directly inside React components; move effect logic into a meaningful custom hook instead.

🔧 [Rule Source](../../lib/rules/no-direct-use-effect.js)

## Rule Details

Direct `useEffect` calls inside components make side effects harder to reuse and test. This rule nudges teams to extract those effects into well-named custom hooks so the component body stays declarative and side-effect free.

The rule flags:

- `useEffect` or `React.useEffect` invoked inside a React component (PascalCase name or JSX return)
- Anonymous default-export components that return JSX and call `useEffect`

Calls inside custom hooks (functions starting with `use`) are allowed.

## Examples

### ❌ Incorrect

```javascript
import { useEffect } from 'react'

function ProfilePage() {
  useEffect(() => {
    trackPageView('profile')
  }, [])

  return <div>Profile</div>
}

const Dashboard = () => {
  React.useEffect(() => {
    fetchDashboard()
  }, [])
  return <main>Dashboard</main>
}
```

### ✅ Correct

```javascript
import { useEffect } from 'react'

function useProfileTracking() {
  useEffect(() => {
    trackPageView('profile')
  }, [])
}

function ProfilePage() {
  useProfileTracking()
  return <div>Profile</div>
}

export default function Dashboard() {
  useDashboardData()
  return <main>Dashboard</main>
}

function useDashboardData() {
  useEffect(() => {
    fetchDashboard()
  }, [])
}
```

## Options

This rule has no configuration options.

## When Not To Use It

You can disable this rule if your codebase intentionally keeps effect logic inside components (e.g., tiny prototypes) or you rely on `useEffect` for quick experiments and do not plan to extract custom hooks.
