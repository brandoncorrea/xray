# xray

Module index generator for JavaScript and TypeScript projects. Produces a JSON map of every source file with exports, dependencies, dependents, associated test files, and line counts.

Designed to help AI agents orient themselves in a codebase without reading every file.

## Installation

```bash
npm install -g xray
```

## Usage

```bash
# Scan current directory, output JSON to stdout
xray

# Scan a specific directory
xray backend/

# Write output to a file
xray backend/ -o index.json

# Show detail for a single file
xray backend/ --file src/handlers/feed.js

# Find all files that import a given module
xray backend/ --dependents-of src/db.js

# Find all direct and transitive dependents
xray backend/ --dependents-of src/db.js --transitive

# Find all modules a given file imports
xray backend/ --dependencies-of src/db.js

# List just file paths (token-efficient for agents)
xray backend/ --files-only

# Scan only specific directories
xray backend/ --include src --include shared

# Exclude directories from scan
xray backend/ --exclude coverage --exclude dist
```

## Output Format

xray outputs a JSON object keyed by relative file path. Each entry contains:

| Field          | Type       | Description                                       |
|----------------|------------|---------------------------------------------------|
| `exports`      | `string[]` | Named and default exports (`'default'` for default)|
| `reExports`    | `string[]` | Star re-export sources (`export * from '...'`)     |
| `dependencies` | `string[]` | Modules this file imports (project-relative paths) |
| `dependents`   | `string[]` | Files that import this module                      |
| `tests`        | `string[]` | Associated test files (by naming convention)       |
| `lines`        | `number`   | Total line count of the source file                |

Example output:

```json
{
  "src/handlers/feed.js": {
    "exports": ["feedHandler"],
    "reExports": [],
    "dependencies": ["src/db/instance.js", "src/shared/index.js"],
    "dependents": ["src/routes.js"],
    "tests": ["tests/handlers/feed.test.js"],
    "lines": 32
  },
  "src/db/instance.js": {
    "exports": ["db", "query"],
    "reExports": [],
    "dependencies": [],
    "dependents": ["src/handlers/feed.js", "src/handlers/auth.js"],
    "tests": ["tests/db/instance.test.js"],
    "lines": 18
  }
}
```

## Options

| Flag                        | Description                                          |
|-----------------------------|------------------------------------------------------|
| `[dir]`                     | Root directory to scan (default: `.`)                |
| `-o, --output <file>`       | Write JSON to a file instead of stdout               |
| `--file <path>`             | Show detail for a single source file                 |
| `--dependents-of <path>`    | List files that import the given module               |
| `--transitive`              | Expand `--dependents-of` to full transitive closure   |
| `--dependencies-of <path>`  | List modules imported by the given file               |
| `--files-only`              | Output only file paths as a JSON array               |
| `--include <dir>`           | Scan only this directory (repeatable)                |
| `--exclude <dir>`           | Skip directory during scan (repeatable)              |
| `--compact`                 | Force compact (single-line) JSON output              |
| `--pretty`                  | Force pretty-printed JSON output                     |
| `--help, -h`                | Show help message                                    |
| `--version, -v`             | Show version                                         |

## Exit Codes

| Code | Meaning                    |
|------|----------------------------|
| `0`  | Success                    |
| `1`  | Unknown flag(s) provided   |

## Configuration

xray looks for `xray.config.js` in the scan directory. The config file should export a default object with any of the following fields:

| Field          | Type       | Default                              | Description                      |
|----------------|------------|--------------------------------------|----------------------------------|
| `extensions`   | `string[]` | `['.js', '.jsx', '.ts', '.tsx']`     | File extensions to scan          |
| `exclude`      | `string[]` | `[]`                                 | Directories to exclude           |
| `include`      | `string[]` | `[]`                                 | Directories to include (all if empty) |
| `testPatterns` | `string[]` | `['tests/**/*.{test,spec}.*', ...]`  | Glob patterns for test file discovery |

Example:

```js
export default {
  extensions: ['.js', '.jsx'],
  exclude: ['coverage', 'dist'],
  include: ['src', 'shared']
}
```

CLI flags override config values: `--include` replaces config `include`, `--exclude` merges with config `exclude`.

## Examples

### Full project scan

```bash
xray backend/
```

Scans all JavaScript/TypeScript files under `backend/` and prints the full index to stdout.

### Write index to a file

```bash
xray backend/ -o xray-index.json
```

### Find what imports a module

```bash
xray backend/ --dependents-of src/db/instance.js
```

Returns the subset of the index showing only files that depend on `src/db/instance.js`. Useful for understanding the blast radius of a change.

### Find all transitive dependents

```bash
xray backend/ --dependents-of src/db/instance.js --transitive
```

Walks the full reverse dependency graph. If A imports B imports C, `--dependents-of C --transitive` returns both B and A.

### Find what a module imports

```bash
xray backend/ --dependencies-of src/handlers/feed.js
```

Returns the full index entry for that file. Useful for tracing data flow.

### Single file detail

```bash
xray backend/ --file src/handlers/feed.js
```

Returns the full index entry for one file: its exports, dependencies, dependents, tests, and line count.

### List files only

```bash
xray backend/ --files-only
```

Returns a sorted JSON array of file paths. Token-efficient for agents that just need to orient before drilling into specific files.

## Gas Town Integration

xray is built for AI agent workflows in Gas Town. Agents use xray to:

- **Orient quickly** -- scan an unfamiliar codebase and understand its module structure without reading every file.
- **Scope changes** -- before modifying a module, check `--dependents-of` to understand what will be affected.
- **Find tests** -- the `tests` field maps source files to their test files, so agents know exactly which tests to run after a change.
- **Trace dependencies** -- `--dependencies-of` shows the import chain, helping agents understand data flow and module boundaries.
- **Estimate effort** -- the `lines` field gives a quick sense of module size before committing to read it.
- **Minimize tokens** -- `--files-only` returns just file paths for quick orientation before targeted queries.

Typical agent workflow:

```bash
# 1. Generate the index for the project
xray backend/ -o xray-index.json

# 2. Before changing a file, check its dependents
xray backend/ --dependents-of src/db/instance.js

# 3. After changes, run only affected tests
xray backend/ --file src/db/instance.js | jq '.["src/db/instance.js"].tests[]'
```

This replaces ad-hoc `grep` and `find` commands with structured, reliable module metadata.
