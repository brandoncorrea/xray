# xray — Project Instructions

You are working on **xray**, a module index generator for JavaScript/ESM projects.
It produces a JSON map of source files with exports, dependencies, dependents,
test files, and line counts. Built for AI agent workflows.

---

## Conventions

- **Stack:** Node.js (no TypeScript)
- **ESM throughout** — no CommonJS
- **Named exports** only (no default exports)
- **Tests** live in `tests/` mirroring `src/`

---

## Quick Start

```bash
npm install --silent                        # Install deps
npm test                                    # Full suite (Vitest)
npx vitest run tests/cli.test.js            # Single file
npx vitest run -t "prints help" --reporter=dot  # Single test, minimal output
```

**Structure:**

```
src/
├── cli.js          # CLI entry point (bin)
└── index.js        # Core library
tests/
├── cli.test.js     # CLI integration tests
└── index.test.js   # Core library tests
```

---

## Key Dependencies

- **madge** — used internally for JS/ESM dependency resolution
- **vitest** — test runner
