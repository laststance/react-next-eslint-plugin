# Demo Playground & Snapshot Workflow

The `apps/todo-lint-app` workspace package acts as an end-to-end playground that runs the published ESLint plugin against intentionally noisy source files. The Vitest suite (`tests/lint-snapshot.test.ts`) lints `src/` and stores the formatted ESLint output in `tests/__snapshots__/lint-snapshot.test.ts.snap`.

Snapshot keys are now generated per ESLint major version (for example, `eslint v9` and `eslint v10`) so CI can validate both compatibility targets independently.

- ESLint v9 snapshot lints `src/` with the full demo app config.
- ESLint v10 snapshot uses `tests/fixtures/eslint-v10/` with a plugin-only compatibility config while the Next.js ESLint stack catches up to v10.

## When the Snapshot Needs Updates

Update the stored snapshot whenever any of the following change:

- Rule behavior or message text (new warnings, removed warnings, reordered output, message copy edits, etc.).
- The demo page introduces new fixtures that should be captured by the integration test.
- ESLint formatter output changes because of new ESLint or plugin versions.

Avoid committing snapshot churn for unrelated file edits—if the snapshot diff looks unexpected, rerun the suite without `--update` and investigate.

## How to Refresh the Snapshot

1. Make sure the repository is already built/installed (`pnpm install` at the workspace root).
2. From the repo root, run:

   ```bash
   pnpm --filter todo-lint-app test -- --update
   ```

   This executes the Vitest runner inside the demo app and rewrites the stored snapshot with the current ESLint output.
3. Inspect the diff in `apps/todo-lint-app/tests/__snapshots__/lint-snapshot.test.ts.snap` to confirm the new warnings match expectations.
4. Re-run the suite without `--update` to ensure the snapshot is now stable:

   ```bash
   pnpm --filter todo-lint-app test
   ```

## Review Checklist

- Snapshot changes should be paired with code or rule changes that explain why the output shifted.
- Include a note in your PR/commit summary (e.g., "refresh E2E lint snapshot") whenever the snapshot updates.
- If a rule message change intentionally alters copy, double-check that docs and README examples stay in sync.
