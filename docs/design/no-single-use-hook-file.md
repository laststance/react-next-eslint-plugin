# Design: colocate single-use Hooks with their component

Status: proposed implementation. This document defines a new rule; the published plugin does not provide it yet.

Rule: `laststance/no-single-use-hook-file`  
Verified against: `7a644cb` on 2026-09-09 (JST).

## Problem and decision

A custom Hook used by one component often exists to name and organize that component's implementation. Giving it a separate module makes it look like independently reusable application logic. Readers must follow another file to discover that it belongs to one component.

**A locally defined custom Hook with exactly one production component owner must be defined at module scope in that component's file.**

Keep the Hook abstraction and its descriptive name. Only its location changes. This is an architectural convention for this plugin's consumers, not a React correctness requirement. React also describes Hook extraction as a way to express a component's intent while hiding implementation details. [React: extracting custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks#extracting-your-own-custom-hook-from-a-component)

Use actual ownership to decide placement. A generic name, a `shared/` directory, a long implementation, or a plan to reuse the Hook later does not establish another owner.

## Goals and non-goals

The rule must make component-specific logic identifiable from file placement, preserve named Hook extraction, and allow separate modules once multiple components actually use a Hook.

It does not inline Hook bodies into components, require shared Hooks to have separate files, prohibit test-only exports, enforce general utility placement, decide whether logic is conceptually generic, or move source code automatically. It does not change Hook execution, dependencies, component boundaries, or state management.

## Current repository

| Surface                                                                                                                | Verified behavior                                                                                                                                     | Design implication                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [Plugin entry](../../index.js) and [types](../../index.d.ts)                                                           | 23 opt-in rules; the rule map is represented by {@link LaststanceRuleModules}.                                                                        | Add one rule and its declaration. No recommended preset is needed.                                                             |
| [Effect rule](../../lib/rules/no-direct-use-effect.js) and [tests](../../tests/lib/rules/no-direct-use-effect.test.js) | `no-direct-use-effect` already accepts Hooks defined alongside their component.                                                                       | The two rules compose: extract an effect into a Hook, then keep a dedicated Hook with its component.                           |
| [Prop-drilling rule documentation](../rules/no-prop-drilling.md)                                                       | Its component graph stops at file boundaries.                                                                                                         | Do not expand that rule into a project-wide graph.                                                                             |
| [Hook utilities](../../lib/utils/hooks.js) and [naming utilities](../../lib/utils/naming.js)                           | {@link isHookCallee} recognizes named calls; {@link isPascalCase} checks names. {@link isCustomHookName} already exists privately in the effect rule. | Reuse the name convention. Name matching alone cannot establish ownership.                                                     |
| [AST utilities](../../lib/utils/ast.js) and [context utilities](../../lib/utils/eslint-context.js)                     | {@link collectReturnStatements} skips nested function scopes; {@link getRuleSourceCode} and {@link getRuleFilename} support ESLint 9 and 10.          | Reuse the context boundary and traversal conventions. ESTree helpers cannot directly traverse TypeScript AST nodes.            |
| [Package manifest](../../package.json)                                                                                 | ESM JavaScript implementation; TypeScript and `@typescript-eslint/parser` are development dependencies.                                               | A published rule must explicitly arrange its optional TypeScript dependency. Development dependencies do not supply consumers. |
| [Demo configuration](../../apps/todo-lint-app/eslint.config.mjs)                                                       | Uses the TypeScript parser without a typed project. Its [package](../../apps/todo-lint-app/package.json) is private.                                  | Add a separate typed test configuration when implementing the rule.                                                            |

A read-only probe using the installed TypeScript 6.0.3 and the demo TSConfig obtained a parser-provided `Program`, a type checker with alias resolution, and ESTree-to-TypeScript node mappings. The snapshot contained 19 root files and 790 total source files, including declarations and dependencies. The current file's text matched its compiler source. This validates API availability, not the ownership algorithm, accuracy, or performance of the proposed rule.

## Ownership semantics

A **component owner** is a distinct component implementation that calls the Hook directly or through other custom Hooks. Count definitions, not import statements, invocation counts, component instances, or files.

An **analysis scope** is one complete application TypeScript `Program`: the compiler's collection of source files and resolved symbols. A source file being omitted from the ESLint command must not remove it from ownership analysis.

| Case                                                               | Required result                                                                        |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| One component uses a Hook defined in another file                  | Report the Hook definition and name the component's file as its destination.           |
| One component calls the same Hook twice                            | Still one owner.                                                                       |
| One component is rendered by many parents                          | Still one owner. Do not traverse the JSX parent tree.                                  |
| Two component implementations in the same file call a Hook         | Two owners; a separate Hook file is allowed.                                           |
| Two components in different files call a Hook                      | A separate Hook file is allowed.                                                       |
| One owner and the Hook are already in the same file                | Pass.                                                                                  |
| The Hook lives next to its owner in `Component.hooks.ts`           | Report. Sharing a directory is insufficient.                                           |
| Several dedicated Hooks share a separate file                      | Evaluate each Hook. Combining them does not create reuse.                              |
| A dedicated Hook shares a file with an unrelated component         | Report. The file must contain its actual owner.                                        |
| Production has one owner; tests or stories also reference the Hook | Report the separate production definition. Verification code does not establish reuse. |
| Only tests reference a Hook; there are no production owners        | No placement diagnosis. There is no destination; unused code is a separate concern.    |
| An unused import, type-only reference, or barrel re-export exists  | It does not create a component owner.                                                  |
| An internal Hook is exported                                       | Export alone grants no exemption.                                                      |

Hook-to-Hook calls preserve ownership:

```text
CartPanel --> useCartPanel --> useCartSelection

Destination for both Hooks: CartPanel.tsx
```

Sharing an inner Hook changes only that Hook's placement requirement:

```text
CartPanel     --> useCartPanel --> useCartSelection
CheckoutPanel ------------------> useCartSelection

useCartPanel:     colocate in CartPanel.tsx
useCartSelection: a separate file is allowed
```

Stop propagation at component implementations. Rendering a component from multiple routes does not make its private Hooks shared.

## Recognized source forms

Use the existing `^use[A-Z0-9]` convention to identify local Hook declarations and callable bindings. Support module-level function declarations and variable-bound function or arrow expressions, including named and default ESM exports. Resolve aliases to their actual implementation; two bindings pointing to one function are one Hook.

Use declaration identity rather than the displayed name. Resolve direct imports, renamed imports, static namespace member access, re-export chains, `export *`, and configured path aliases through the TypeScript checker. Two unrelated declarations with the same name remain distinct. An anonymous default-export function imported through a Hook-named binding must either resolve to one candidate implementation or receive an incomplete-analysis result; it must not be silently treated as a non-Hook.

Recognize component function declarations, variable-bound functions, and JSX-returning anonymous default exports. Match the existing PascalCase/JSX conventions, including named components that return `null`. Normalize React's `memo` and `forwardRef` wrappers, including their import aliases, to the wrapped implementation. Multiple wrappers around the same implementation do not create extra owners. Unrecognized higher-order wrappers remain uncertain.

Assign calls to the nearest enclosing function. Do not attribute a nested callback's Hook call to its surrounding component. Calls outside recognized Hooks/components, reassigned Hook values, dynamically selected members, and Hook values passed to arbitrary code are uncertain uses. This rule does not replace the Rules of Hooks. React's guidance favors static Hook calls rather than passing Hooks as ordinary values. [React: component and Hook calls](https://react.dev/reference/rules/react-calls-components-and-hooks)

## Scope and exclusions

The initial implementation supports internal source owned by one application with a complete configured `Program`. JavaScript/JSX is supported when included in that program with `allowJs`; TypeScript syntax alone is not required.

1. Include every production source that could consume a candidate, even if the rule is disabled for that consumer's file. ESLint diagnostic ignores do not redefine production usage.
2. Exclude test/story files from owner counts using explicit conventional locations: `__tests__`, `__mocks__`, `.storybook`, and filenames ending in `.test`, `.spec`, `.stories`, or `.story` before the source extension. If production imports one of these modules, treat that path as an uncertain production dependency instead of silently discarding it.
3. External packages, declaration-only files, and generated definitions are not placement targets. Do not infer external status from a bare import: a path alias or workspace package can resolve to local source.
4. Preserve generated runtime consumers as evidence when their source is available. If only opaque generated output is available, protect the Hooks it could use from a single-owner conclusion. Excluding a definition from reporting must not erase its consumers.
5. Public package APIs and source packages shared across application scopes require knowledge beyond one application's program. Treat those package boundaries as external/uncertain, including Hooks reached through a public Hook. Do not equate every internal ESM export with a public API.

For first adoption, enable the rule on an application's internal source, such as the private demo package. The integration must declare a closed application boundary through its typed configuration and target files. Package metadata (`exports`, `main`, workspace boundaries, and `private`) can reveal exposure, but absence of a manifest entry is not proof that every consumer is known. A shared workspace source file must not become a placement target merely because one app's `Program` happens to include it.

A single `Program` is not a monorepo-wide usage index. Separate TSConfigs may hide reverse consumers even when each compiles successfully. Reject analysis for a candidate whose ownership crosses that boundary; do not union whichever projects happened to be linted first. Whole-workspace aggregation is a separate extension. The same ownership policy applies when that coverage is added.

An incomplete TSConfig cannot be repaired by inference inside a lint rule. A linted file missing from the program or a local dependency represented only by declarations is detectable incompleteness and must produce an analysis error. An unrelated consumer deliberately omitted from the configured program may be undetectable: a fixture demonstrating that limitation must not be presented as proof of whole-repository coverage. The integration owns the complete-source precondition.

## Proposed implementation

### Use the existing compiler program

Obtain the current `Program` and node mappings from `context.sourceCode.parserServices`. Enumerate its source files and use its type checker to resolve symbols and aliases. Keep the ESLint rule synchronous and use its current-file AST only to locate diagnostics.

Require typed parser services when the rule is enabled. Missing services are a configuration error with instructions to configure `@typescript-eslint/parser` and a complete typed project. Do not silently fall back to counting imports in the current file. The official parser services provide a TypeScript program and mappings between the two AST representations. [typescript-eslint: typed custom rules](https://typescript-eslint.io/developers/custom-rules/#typed-rules)

Keep the implementation in one rule module and one focused ownership analyzer. Reuse existing filename/source helpers. If sharing the existing Hook-name predicate requires moving it into the Hook utilities, preserve the effect rule's behavior and tests. Do not introduce a general graph framework, resolver plugin system, or independent filesystem watcher.

Use TypeScript's public APIs for compiler traversal and symbol resolution. Arrange TypeScript as an optional peer, loaded only when this rule runs, so importing the plugin and using existing rules still work without TypeScript. Verify the supported version range against the parser compatibility matrix during implementation; the currently installed 6.0.3 is the verified starting point. No separate module-resolver or graph package is needed. [TypeScript compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)

### Build and classify the graph

```text
Typed application program
  --> canonical local Hook/component implementations
  --> resolved component-to-Hook and Hook-to-Hook edges
  --> owner propagation and uncertainty propagation
  --> per-Hook result
  --> diagnostic on that Hook's current-file definition
```

For each implementation, store a canonical source-file identity and declaration location. Within one program snapshot, symbol/declaration identity distinguishes same-named functions. Normalize path separators and real paths without blindly lowercasing paths on case-sensitive filesystems.

Propagate component identities along call edges. Track zero owners, one exact owner, or at least two distinct owners. Two owner witnesses are sufficient: the rule never needs the complete list after reuse is established. Propagate an unknown-owner marker from opaque references or exposed Hook boundaries to their descendant Hooks. A queue and visited/change tracking must terminate on cycles and avoid double-counting aliases or repeated calls.

| Result    | Definition                                                         | Action                                                                                        |
| --------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Unused    | No known owners and no uncertain uses                              | No placement report.                                                                          |
| Dedicated | Exactly one owner and no uncertain uses                            | Compare declaration file with owner file; report when different.                              |
| Shared    | At least two distinct known owners                                 | No placement report; further unknown owners cannot change this decision.                      |
| Unknown   | Fewer than two owners and an unresolved use or incomplete boundary | Never issue a move instruction. Report incomplete analysis for affected placement candidates. |

Treat an opaque reference as uncertainty, not as another owner. For a dynamic namespace access, protect every candidate reachable through that namespace. If a missing or unparseable source makes the affected set unknowable, invalidate the entire scope's dedicated conclusions. Other unrelated TypeScript errors need not disable analysis unless they prevent reliable symbol/use resolution.

### Keep cached results tied to source snapshots

Cache the analyzer result by `Program` identity in a `WeakMap`. Before reuse, check the source-file membership and `SourceFile` identities/text for that program; rebuild if a host updates a program in place. A changed file, added or removed consumer, or changed resolution/configuration must invalidate the corresponding result. Do not key the cache only by filename, working directory, or elapsed time.

Compare the current ESLint source text with its mapped compiler source before reporting. A mismatch is an incomplete-analysis result, not permission to use stale counts. Do not retain rule contexts or reporters in the cache. Each ESLint worker may compute its own result; correctness cannot rely on shared mutable state or file traversal order.

The authoritative command is a fresh, complete CLI run with `--no-cache`. ESLint's persistent cache skips unchanged files, while another file can change a Hook's owner count. [ESLint: cache behavior](https://eslint.org/docs/latest/use/command-line-interface#--cache)

Editor diagnostics are advisory: changing a different file may not trigger a fresh report in an already-open Hook file. Document the editor's ESLint-server restart workaround and rerun the full CLI check before accepting a result. A program cache alone does not fix this editor behavior. [typescript-eslint: stale editor reports](https://typescript-eslint.io/troubleshooting/typed-linting/#editor-eslint-reports-become-out-of-date-after-file-changes)

## Diagnostics and configuration

Report once per misplaced Hook, at its declaration identifier or anonymous declaration location. Reporting on the declaration avoids duplicate reports for multiple imports and also works for transitive ownership. The lint command must therefore include Hook definition files, not only component files.

Proposed message ID: `colocateWithComponent`.

```text
Hook "useCartSelection" is used only by component "CartPanel".
Move its definition to module scope in "src/components/CartPanel.tsx"
so its component-specific ownership is explicit.
```

Use a project-relative destination path. Include the actual owner after resolving wrappers and aliases. Do not suggest deleting a file that might contain other exports.

Proposed message ID: `incompleteAnalysis`.

```text
Cannot determine all consumers of Hook "useCartSelection":
its value escapes through a dynamic namespace access.
No colocation decision was made.
```

An incomplete-analysis diagnostic uses the rule's configured severity, like any other message from the rule. In an `error` configuration it fails CI without accusing the Hook of incorrect placement. Emit it once per affected definition when uncertainty could change a separate-file placement decision, with the unresolved source/location where known. A Hook already colocated with its sole known owner needs no such diagnostic: discovering another owner would still allow that placement. Missing typed services or a broken project configuration are configuration failures, not thousands of identical per-Hook messages.

Use standard reason-bearing ESLint disable comments for intentional exceptions. No custom suppression annotation, name allowlist, size threshold, or configurable ownership threshold is proposed. Tests may import an exported colocated Hook; export restrictions belong to separate rules.

The following is a **proposed configuration after implementation**, not a configuration supported by the current published plugin. It assumes the application's `tsconfig.json` includes all relevant source files and does not rely on an incomplete set of project references:

```javascript
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import tsParser from '@typescript-eslint/parser'
import laststancePlugin from '@laststance/react-next-eslint-plugin'

export default [
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
      },
    },
    plugins: { laststance: laststancePlugin },
    rules: { 'laststance/no-single-use-hook-file': 'error' },
  },
]
```

Use one explicit complete TSConfig for the initial integration. A dedicated lint TSConfig is acceptable when necessary to include all consumers, provided it preserves the application's resolution settings. `parserOptions.project` does not automatically combine project references into one usage graph. [typescript-eslint: project configuration](https://typescript-eslint.io/packages/parser/#project)

No rule-specific options are required for the initial ownership policy. `meta.type` should be `suggestion` because this is an architectural convention; that is independent of configuring severity as `error`. Omit fix support and do not provide an editor suggestion that pretends to perform a complete cross-file move. ESLint fixes describe edits to the current source, not an atomic refactor across modules. [ESLint: applying fixes](https://eslint.org/docs/latest/extend/custom-rules#applying-fixes)

## Migration and compatibility

Move the dedicated Hook below its owner component at module scope, following this repository's React conventions. Preserve its parameters and call sites. Move or adjust its dependencies and relative import paths. Remove the old import and only delete an emptied source file after checking all of its exports and imports.

Retain export access when a colocated Hook has direct tests. Resolve any component-only export restriction separately. For Next.js, preserve `'use client'` and `'use server'` boundaries; relocation must not silently turn a server module into a client module or create a dependency cycle. These requirements are another reason the rule initially reports without applying fixes.

When a second component starts using the logic, a separate Hook module becomes allowed. When usage drops back to one component, a fresh complete lint run reports the now-dedicated Hook again. Do not duplicate Hook implementations or add fake callers to satisfy the rule.

## Alternatives considered

| Alternative                                                        | Reason for not choosing it                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Count importing files                                              | Misclassifies two components in one file and counts barrels/tests as reuse.                |
| Check only direct Hook callers                                     | Misses dedicated chains and cannot distinguish shared inner Hooks.                         |
| Permit a neighboring `Component.hooks.ts`                          | Keeps the independent-file signal the rule is intended to remove.                          |
| Exempt `shared/`, generic names, or large Hooks                    | Replaces observable usage with naming or size.                                             |
| Inline every dedicated Hook body                                   | Loses useful named organization and conflicts with `no-direct-use-effect`.                 |
| Scan and parse the repository separately for every rule invocation | Duplicates parser work and requires separate module resolution and editor synchronization. |
| Use a process-global importer counter accumulated during lint      | Results depend on file order, partial linting, workers, and stale process state.           |
| Ship a codemod, watcher, and workspace graph service immediately   | Adds separate products before the reporting rule has been validated.                       |

The chosen design adds typed-project setup and whole-program analysis cost. It also keeps some large dedicated Hooks in component files. These are explicit trade-offs for accurate ownership and the requested placement convention.

## Implementation sequence

1. Implement and test graph resolution, component identity, owner propagation, and uncertainty using real multi-file fixtures. This establishes the semantics before ESLint reporting.
2. Add the rule adapter, optional TypeScript loading, stable diagnostic locations, and complete/incomplete analysis behavior. Add the runtime rule and type declaration together.
3. Add a focused typed demo integration, public rule documentation, and compatibility checks for ESLint 9 and 10. Keep the existing syntax-only demo fixtures intact unless their output actually changes.

| Planned file                                                          | Responsibility                                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `lib/rules/no-single-use-hook-file.js`                                | Parser preconditions, current-file reporting, message definitions.                                      |
| `lib/utils/hook-ownership.js`                                         | Compiler snapshot, canonical references, graph propagation, uncertainty.                                |
| `lib/utils/hooks.js` and `lib/rules/no-direct-use-effect.js`          | Share the existing Hook-name predicate only if needed; preserve behavior.                               |
| `index.js`, `index.d.ts`, `tests/types/plugin-usage.ts`               | Runtime registration and typed consumer coverage.                                                       |
| `package.json`, `pnpm-lock.yaml`                                      | Optional compiler peer contract and verified dependency resolution.                                     |
| `tests/lib/rules/no-single-use-hook-file.test.js` and scoped fixtures | Rule diagnostics and actual multi-file ownership cases.                                                 |
| `tests/lib/utils/hook-ownership.test.js`                              | Graph identity, propagation, and invalidation cases that cannot be expressed as a single source string. |
| `apps/todo-lint-app/tests/` and a focused typed fixture/config        | Consumer-level ESLint 9/10 execution and rule composition.                                              |
| `docs/rules/no-single-use-hook-file.md`, `README.md`                  | Shipped behavior, setup, limitations, and migration instructions after implementation.                  |

The current task adds only this design document and its README link. The files above are the implementation handoff, not completed changes.

## Acceptance and verification

Use the existing Mocha/RuleTester stack and Node assertions. Add actual multi-file fixtures where import resolution matters. Name tests by the behavior that breaks, hard-code expected messages/destinations, and use Arrange/Act/Assert comments in imperative tests. Do not add another test framework.

| ID  | Required fixture or check                                                                                              | Expected outcome                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A1  | One component, external Hook file                                                                                      | Exactly one placement diagnostic with the correct destination.                    |
| A2  | Move that Hook to its owner's module scope                                                                             | No placement diagnostic; component/Hook behavior is unchanged.                    |
| A3  | Same component calls the Hook twice or is rendered by several parents                                                  | Remains one owner.                                                                |
| A4  | Two components in one file, then in two files                                                                          | Both cases allow a separate Hook file.                                            |
| A5  | Add test/story consumers and type-only imports                                                                         | Production owner count stays unchanged.                                           |
| A6  | Unused import and re-export-only barrel                                                                                | Neither creates an owner.                                                         |
| A7  | Renamed/default imports, namespace access, path aliases, and re-export chains                                          | Same underlying Hook resolves once; shadowed names stay separate.                 |
| A8  | Dedicated Hook chain, then shared inner Hook                                                                           | Initially both relocate; after sharing, only the outer dedicated Hook relocates.  |
| A9  | React wrappers, wrapper aliases, anonymous components, and `null`-returning named components                           | Canonical component owners are counted once.                                      |
| A10 | Multiple Hook exports and an unrelated colocated component                                                             | Each misplaced dedicated Hook is diagnosed independently.                         |
| A11 | Opaque Hook value, dynamic namespace, unknown wrapper, or external owner                                               | Incomplete-analysis result with no move instruction when ownership is unresolved. |
| A12 | Public/shared workspace boundary and generated runtime consumer                                                        | No false single-owner conclusion caused by excluding a source.                    |
| A13 | Cyclic Hook/reference graph and repeated aliases                                                                       | Analysis terminates and does not invent or duplicate owners.                      |
| A14 | Missing typed services, unreadable/unparseable source, incomplete detectable project coverage, or source-text mismatch | Actionable analysis/configuration failure; no false placement diagnosis.          |
| A15 | Consumer has ESLint disabled or is omitted from the CLI file list but remains in the complete program                  | Consumer still counts.                                                            |
| A16 | Add, change, remove, or rename a second consumer between runs                                                          | A fresh result reflects the new owner count and destination.                      |
| A17 | Reversed lint order, isolated projects in one process, and ESLint workers                                              | Same diagnostics; no cache leakage between scopes.                                |
| A18 | Enable with `no-direct-use-effect` after colocation                                                                    | Both rules accept the colocated Hook.                                             |
| A19 | Import the published plugin without optional TypeScript and keep this rule disabled                                    | Existing rules still load and work.                                               |
| A20 | Runtime registration, declarations, and consumer configurations on ESLint 9 and 10                                     | Rule is available only after implementation; types and runtime agree.             |
| A21 | Invoke `--fix`                                                                                                         | No source files are changed by this rule.                                         |

Before release, run the focused rule/analyzer tests, `pnpm test`, `pnpm lint`, `pnpm typecheck`, and the actual demo lint tests for both supported ESLint majors. Refresh snapshots only for intended output changes and verify that tests actually executed.

Measure a fresh complete lint run with and without the rule on the same fixture checkout. Record file count, Hook count, elapsed time, peak memory, and analyzer rebuild count. No latency claim is established by this design. Source indexing should occur once per unchanged snapshot per worker; owner propagation should retain at most two owner witnesses per Hook. Add performance machinery only if measurements show a need.

Adopt explicitly at `error` severity after reviewing initial diagnostics. The reliable CI check includes every relevant definition file and uses `--no-cache`. Rollback is to disable the opt-in rule; no application data or automated source migration needs reversal.

## Decisions ready for implementation

Ownership, placement, transitive calls, test exclusions, explicit errors, and the absence of autofix are defined above. No product-policy question blocks implementation. Parser compatibility, project-boundary checks, and cache invalidation still require the executable acceptance cases before the rule can claim support. A passing design review is not evidence that those checks have already passed.
