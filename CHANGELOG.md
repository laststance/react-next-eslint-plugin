# Changelog

## [2.4.0] - 2026-09-09

### Added

- Keep a custom Hook beside its sole component with the opt-in `no-single-use-hook-file` rule. The rule follows aliases and transitive Hook calls across a complete typed application, allows actual reuse by multiple components, and explains uncertainty without requesting an unsafe move.
- Configure and adopt the rule with a typed setup guide, ownership examples, migration guidance, and a documented design. TypeScript is optional for consumers using other rules.
