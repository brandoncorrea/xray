#!/usr/bin/env node

/**
 * Mutation testing for xray using mutagen.
 *
 * Usage:
 *   node scripts/mutate.js src/exports.js          # Mutate one file
 *   node scripts/mutate.js src/exports.js --line 42 # Target one line
 *   node scripts/mutate.js src/exports.js --dry-run  # List mutations only
 *   node scripts/mutate.js --all                     # Mutate all sources
 *   node scripts/mutate.js --all --json              # All sources + JSON report
 *   node scripts/mutate.js --incremental --json      # Only changed files
 *   node scripts/mutate.js --diff before.json after.json  # Compare reports
 */

import { readdirSync, rmSync } from 'node:fs'
import { createManualRunner, createVitestRunner } from 'mutagen'
import { javascript } from 'mutagen/patterns'

// Snapshot working directory before mutations run. Mutations that break CLI
// argument parsing can cause tests to write files with flag-like names
// (e.g. "--compact") as side effects. Clean these up on exit.
const snapshot = new Set(readdirSync('.'))
process.on('exit', () => {
  try {
    for (const entry of readdirSync('.')) {
      if (!snapshot.has(entry) && entry.startsWith('--')) {
        rmSync(entry, { force: true })
      }
    }
  } catch {}
})

const sources = [
  'src/cli-core.js',
  'src/config.js',
  'src/exports.js',
  'src/scan.js',
  'src/testFiles.js',
]

const testSources = [
  'tests/cli-core.test.js',
  'tests/cli.test.js',
  'tests/config.test.js',
  'tests/exports.test.js',
  'tests/scan.test.js',
  'tests/testFiles.test.js',
]

const runner = createManualRunner({
  patterns: javascript,
  sources,
  testSources,
  createRunner: (sourceFile) => createVitestRunner(sourceFile, {
    config: 'vitest.config.js',
    warm: false
  })
})

runner.main()
