# Contributing Guide

Thanks for your interest in contributing!

## Development Setup

- Node.js >= 20 (this repo uses Volta/PNPM)
- PNPM installed
- Install dependencies: `pnpm install`
- Run tests: `pnpm test`
- Lint: `pnpm lint`

## Project Structure

- `lib/rules/*`: ESLint rules
- `tests/lib/rules/*`: Rule tests using `RuleTester`
- `index.js`: Plugin export

## Adding a Rule

1. Create `lib/rules/my-rule.js` exporting the standard ESLint rule object.
2. Add tests under `tests/lib/rules/my-rule.test.js` with valid/invalid cases.
3. Export your rule in `index.js` under the `rules` key.
4. Ensure `pnpm test` passes.

## Commit Style

Use conventional commits (e.g., `feat(rule): ...`, `fix(rule): ...`, `docs: ...`).

## Pull Requests

- Include a clear description and rationale.
- Update README and docs if behavior changes.
- Ensure tests are added/updated and pass.

## Code of Conduct

Please adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md).
