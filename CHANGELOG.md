# Changelog

All notable changes to xray are documented in this file.

## 0.1.0 — 2026-04-25

Initial release.

### Features

- **Module index generation** — scan a directory and produce a JSON map of every source file with exports, dependencies, dependents, test files, and line counts
- **TypeScript support** — scans `.js`, `.jsx`, `.ts`, and `.tsx` files by default
- **Export tracking** — named exports, default exports (`'default'`), and star re-exports (`reExports` field)
- **Dependency graph** — built in-house with acorn, no external dependencies beyond acorn/acorn-jsx
- **Reverse dependency lookup** — `dependents` field shows which files import each module
- **Test file discovery** — configurable via glob patterns (`testPatterns`), supports `tests/`, co-located, `__tests__/`, and `spec/` conventions
- **Query flags**:
  - `--file <path>` — single file detail
  - `--dependents-of <path>` — files that import a module
  - `--dependencies-of <path>` — modules imported by a file
  - `--transitive` — expand `--dependents-of` to full transitive closure
  - `--tests-for <path>` — all test files affected by a change (direct + transitive)
  - `--files-only` — output just file paths as a sorted JSON array
- **Output control** — `--compact`, `--pretty`, `-o <file>`, auto-detect TTY
- **Include/exclude** — `--include <dir>` (repeatable), `--exclude <dir>` (repeatable, merges with config)
- **Configuration** — `xray.config.js` with `extensions`, `exclude`, `include`, `testPatterns`
- **Deterministic output** — top-level keys sorted alphabetically, arrays sorted
- **Error handling** — unknown flags, conflicting query flags, nonexistent directories, and missing flag values all produce clear errors with exit code 1
- **Parse warnings** — malformed files reported on stderr, not silently swallowed
- **Configurable output** — injectable `output` singleton for log/error, with console and silent modes
