# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Start

```bash
npm install --silent                        # Install deps
npx vitest run                              # Full suite, single run
npx vitest run tests/cli.test.js            # Single file
npx vitest run -t "test name" --reporter=dot  # Single test, minimal output
```

**Structure:** `src/` (library + CLI), `tests/` mirrors `src/`.

## Starting Work

1. Run `bd ready --json` — pick the highest-priority unblocked task
2. Run `bd show <id>` — read full context, dependencies, and design notes
3. Read relevant source files BEFORE writing any code
4. Run the existing test suite — confirm it passes before you touch anything
5. Run `bd update <id> --claim` to claim the task
6. State your plan in 2-3 sentences before implementing

## TDD Workflow (Non-Negotiable)

Follow Red → Green → Refactor on every change. No exceptions.

1. **RED** — Write ONE failing test. Run it. Confirm it fails.
2. **GREEN** — Write the MINIMUM production code to make it pass. Run tests. Confirm green.
3. **REFACTOR** — Improve names, remove duplication, simplify. Run tests. Confirm still green.
4. **COMMIT** — Commit after each completed cycle.
5. **REPEAT** — Next behavior, next test.

**Hard rules:**
- NEVER write production code without a failing test driving it
- NEVER write more test code than is sufficient to fail (compilation failures count)
- NEVER write more production code than is sufficient to pass the one failing test
- ALWAYS run tests at each step — do not assume. Confirm RED, confirm GREEN.

## Scope Discipline

- Work on ONE bead at a time. Do not start a second task before closing the first.
- If you discover out-of-scope work, `bd create` a new issue for it. Do NOT fix it now.
- If a task feels too large, break it into subtasks with `bd create --parent <id>` before continuing.

## Clean Code Rules

- **Functions do one thing.** If you need "and" to describe it, split it.
- **Meaningful names over comments.** Rename until the comment is unnecessary.
- **No magic numbers or strings.** Extract to named constants.
- **Max function length: ~20 lines.** Extract helpers if longer.
- **Max nesting: 2 levels.** Use early returns, guard clauses, or extract methods.
- **DRY after duplication.** Duplicate twice before abstracting — never abstract from a single case.

## Landing the Plane (Session Completion)

When ending a session, complete ALL steps. Work is NOT done until `git push` succeeds.

1. **File issues** — `bd create` for anything that needs follow-up
2. **Quality gates** (if code changed) — tests must all pass
3. **Update beads** — `bd close <id>` finished work, update in-progress items
4. **Push to remote:**
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Verify** — all changes committed AND pushed

**CRITICAL RULES:**
- Work is NOT complete until all tests pass
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing — that leaves work stranded locally
- If push fails, resolve and retry until it succeeds
