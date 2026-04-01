# xray

Module index generator for JavaScript/ESM projects. Produces a JSON map of every source file with exports, dependencies, dependents, associated test files, and line counts.

Designed to help AI agents orient themselves in a codebase without reading every file.

## Installation

```bash
npm install -g xray
```

## Usage

```bash
# Scan a directory, output JSON to stdout
xray <dir>

# Write output to a file
xray <dir> -o index.json

# Show detail for a single file
xray <dir> --file src/handlers/feed.js

# Find all files that import a given module
xray <dir> --dependents-of src/db.js

# Find all modules a given file imports
xray <dir> --dependencies-of src/db.js
```

## Output Format

xray outputs a JSON object keyed by relative file path. Each entry contains:

| Field          | Type       | Description                                    |
|----------------|------------|------------------------------------------------|
| `exports`      | `string[]` | Named exports from the module                  |
| `dependencies` | `string[]` | Relative paths this module imports              |
| `dependents`   | `string[]` | Files that import this module                   |
| `tests`        | `string[]` | Associated test files (by naming convention)    |
| `lines`        | `number`   | Total line count of the source file             |

Example output:

```json
{
  "src/handlers/feed.js": {
    "exports": ["feedHandler"],
    "dependencies": ["../db/instance.js", "../../../shared/index.js"],
    "dependents": ["src/routes.js"],
    "tests": ["tests/handlers/feed.test.js"],
    "lines": 32
  },
  "src/db/instance.js": {
    "exports": ["db", "query"],
    "dependencies": [],
    "dependents": ["src/handlers/feed.js", "src/handlers/auth.js"],
    "tests": ["tests/db/instance.test.js"],
    "lines": 18
  }
}
```

## Options

| Flag                        | Description                                      |
|-----------------------------|--------------------------------------------------|
| `<dir>`                     | Root directory to scan (required)                |
| `-o, --output <file>`       | Write JSON to a file instead of stdout           |
| `--file <path>`             | Show detail for a single source file             |
| `--dependents-of <path>`    | List files that import the given module           |
| `--dependencies-of <path>`  | List modules imported by the given file           |

## Examples

### Full project scan

```bash
xray backend/
```

Scans all JavaScript/ESM files under `backend/` and prints the full index to stdout.

### Write index to a file

```bash
xray backend/ -o xray-index.json
```

### Find what imports a module

```bash
xray backend/ --dependents-of src/db/instance.js
```

Returns the subset of the index showing only files that depend on `src/db/instance.js`. Useful for understanding the blast radius of a change.

### Find what a module imports

```bash
xray backend/ --dependencies-of src/handlers/feed.js
```

Returns the dependency list for a single file. Useful for tracing data flow.

### Single file detail

```bash
xray backend/ --file src/handlers/feed.js
```

Returns the full index entry for one file: its exports, dependencies, dependents, tests, and line count.

## Gas Town Integration

xray is built for AI agent workflows in Gas Town. Agents use xray to:

- **Orient quickly** -- scan an unfamiliar codebase and understand its module structure without reading every file.
- **Scope changes** -- before modifying a module, check `--dependents-of` to understand what will be affected.
- **Find tests** -- the `tests` field maps source files to their test files, so agents know exactly which tests to run after a change.
- **Trace dependencies** -- `--dependencies-of` shows the import chain, helping agents understand data flow and module boundaries.
- **Estimate effort** -- the `lines` field gives a quick sense of module size before committing to read it.

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
