import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findTestFiles } from '../src/testFiles.js'

function setupTempProject(structure) {
  const root = mkdtempSync(join(tmpdir(), 'xray-test-'))
  for (const filePath of structure) {
    const full = join(root, filePath)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, '')
  }
  return root
}

describe('findTestFiles', () => {
  let root

  afterEach(() => {
    if (root)
      rmSync(root, { recursive: true, force: true })
  })

  it('finds mirror-structure .test.js file', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'tests/handlers/feed.test.js'
    ])
    const result = findTestFiles('src/handlers/feed.js', root)
    expect(result).toEqual(['tests/handlers/feed.test.js'])
  })

  it('finds mirror-structure .spec.js file', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'tests/handlers/feed.spec.js'
    ])
    const result = findTestFiles('src/handlers/feed.js', root)
    expect(result).toEqual(['tests/handlers/feed.spec.js'])
  })

  it('finds co-located .test.js file', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'src/handlers/feed.test.js'
    ])
    const result = findTestFiles('src/handlers/feed.js', root)
    expect(result).toEqual(['src/handlers/feed.test.js'])
  })

  it('finds co-located .spec.js file', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'src/handlers/feed.spec.js'
    ])
    const result = findTestFiles('src/handlers/feed.js', root)
    expect(result).toEqual(['src/handlers/feed.spec.js'])
  })

  it('finds .test.jsx and .spec.jsx extensions', () => {
    root = setupTempProject([
      'src/components/Button.jsx',
      'tests/components/Button.test.jsx',
      'tests/components/Button.spec.jsx'
    ])
    const result = findTestFiles('src/components/Button.jsx', root)
    expect(result).toEqual([
      'tests/components/Button.spec.jsx',
      'tests/components/Button.test.jsx'
    ])
  })

  it('returns multiple matches across conventions', () => {
    root = setupTempProject([
      'src/utils/parse.js',
      'tests/utils/parse.test.js',
      'src/utils/parse.spec.js'
    ])
    const result = findTestFiles('src/utils/parse.js', root)
    expect(result).toEqual([
      'src/utils/parse.spec.js',
      'tests/utils/parse.test.js'
    ])
  })

  it('returns empty array when no test files exist', () => {
    root = setupTempProject([
      'src/handlers/feed.js'
    ])
    const result = findTestFiles('src/handlers/feed.js', root)
    expect(result).toEqual([])
  })

  it('handles files in src root (no subdirectory)', () => {
    root = setupTempProject([
      'src/index.js',
      'tests/index.test.js'
    ])
    const result = findTestFiles('src/index.js', root)
    expect(result).toEqual(['tests/index.test.js'])
  })

  it('mirrors non-src directory path as-is under tests/', () => {
    root = setupTempProject([
      'lib/utils.js',
      'tests/lib/utils.test.js'
    ])
    const result = findTestFiles('lib/utils.js', root)
    expect(result).toEqual(['tests/lib/utils.test.js'])
  })

  it('does not return the source file itself', () => {
    root = setupTempProject([
      'src/handlers/feed.test.js'
    ])
    const result = findTestFiles('src/handlers/feed.test.js', root)
    expect(result).toEqual([])
  })

  it('finds .test.ts and .spec.ts files', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'tests/handlers/feed.test.ts',
      'src/handlers/feed.spec.ts'
    ])
    const result = findTestFiles('src/handlers/feed.js', root)
    expect(result).toEqual([
      'src/handlers/feed.spec.ts',
      'tests/handlers/feed.test.ts'
    ])
  })

  it('finds .test.tsx and .spec.tsx files', () => {
    root = setupTempProject([
      'src/components/Button.jsx',
      'tests/components/Button.test.tsx'
    ])
    const result = findTestFiles('src/components/Button.jsx', root)
    expect(result).toEqual(['tests/components/Button.test.tsx'])
  })

  it('finds tests in __tests__ directory', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'src/handlers/__tests__/feed.js'
    ])
    const result = findTestFiles('src/handlers/feed.js', root)
    expect(result).toEqual(['src/handlers/__tests__/feed.js'])
  })

  it('finds tests in spec/ directory', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'spec/handlers/feed.js'
    ])
    const result = findTestFiles('src/handlers/feed.js', root)
    expect(result).toEqual(['spec/handlers/feed.js'])
  })

  it('uses custom testPatterns when provided', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'test/handlers/feed.test.js'
    ])
    const patterns = [
      'test/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '**/*.{test,spec}.{js,jsx,ts,tsx}'
    ]
    const result = findTestFiles('src/handlers/feed.js', root, patterns)
    expect(result).toEqual(['test/handlers/feed.test.js'])
  })

  it('custom testPatterns completely replace defaults', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'tests/handlers/feed.test.js',
      'custom/handlers/feed_test.js'
    ])
    // Only look in custom/ with _test suffix
    const patterns = ['custom/**/*_test.{js,jsx,ts,tsx}']
    const result = findTestFiles('src/handlers/feed.js', root, patterns)
    expect(result).toEqual(['custom/handlers/feed_test.js'])
  })

  it('finds __tests__ files with .ts extension', () => {
    root = setupTempProject([
      'src/utils/parse.js',
      'src/utils/__tests__/parse.ts'
    ])
    const result = findTestFiles('src/utils/parse.js', root)
    expect(result).toEqual(['src/utils/__tests__/parse.ts'])
  })

  it('finds spec/ tests with mirror directory for non-src source', () => {
    root = setupTempProject([
      'lib/utils.js',
      'spec/lib/utils.js'
    ])
    const result = findTestFiles('lib/utils.js', root)
    expect(result).toEqual(['spec/lib/utils.js'])
  })
})
