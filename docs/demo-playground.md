# Demo Playground & ESLint E2E Workflow

The `apps/todo-lint-app` workspace package acts as an end-to-end playground that runs the published ESLint plugin against intentionally noisy source files.
In this repository, "E2E" means "run the real ESLint engine against a real app-style workspace that consumes the local plugin."

The app now has two ESLint E2E suites:

- `tests/lint-snapshot.test.ts`: captures the full formatted ESLint output as a snapshot
- `tests/lint-focused.test.ts`: asserts representative rules directly from `LintResult[]`

Snapshot keys are now generated per ESLint major version (for example, `eslint v9` and `eslint v10`) so CI can validate both compatibility targets independently.

- The v9 snapshot lints `src/` using the full demo app config.
- For v10, the snapshot targets `tests/fixtures/eslint-v10/` with a plugin-only compatibility config while the Next.js ESLint stack catches up.
- Focused v10 assertions verify representative compatibility rules directly: `no-jsx-iife`, `no-missing-button-type`, and `jsx-no-useless-fragment`.

## When the Snapshot Needs Updates

Update the stored snapshot whenever any of the following change:

- Rule behavior or message text (new warnings, removed warnings, reordered output, message copy edits, etc.).
- The demo page introduces new fixtures that should be captured by the integration test.
- ESLint formatter output changes because of new ESLint or plugin versions.

Avoid committing snapshot churn for unrelated file edits—if the snapshot diff looks unexpected, rerun the suite without `--update` and investigate.

## How to Run the ESLint E2E Suite

1. Make sure the repository is already built/installed (`pnpm install` at the workspace root).
2. From the repo root, run:

   ```bash
   pnpm --filter todo-lint-app test:e2e
   ```

   This executes the app-level ESLint E2E suite, including the snapshot test and any focused assertions that apply to the current ESLint major version.

You can also run the root alias:

```bash
pnpm test:todo-e2e
```

## How to Refresh the Snapshot

1. Run the app E2E suite with snapshot updates enabled:

   ```bash
   pnpm --filter todo-lint-app test:e2e --update
   ```

2. Inspect the diff in `apps/todo-lint-app/tests/__snapshots__/lint-snapshot.eslint-v9.snap` or `apps/todo-lint-app/tests/__snapshots__/lint-snapshot.eslint-v10.snap` to confirm the new warnings match expectations.
3. Re-run the suite without `--update` to ensure the snapshot is now stable:

   ```bash
   pnpm --filter todo-lint-app test:e2e
   ```

## Review Checklist

- Snapshot changes should be paired with code or rule changes that explain why the output shifted.
- Include a note in your PR/commit summary (e.g., "refresh E2E lint snapshot") whenever the snapshot updates.
- If a rule message change intentionally alters copy, double-check that docs and README examples stay in sync.
- If a representative v10 rule stops matching, update the focused assertions only when the fixture or intended compatibility scope has truly changed.
