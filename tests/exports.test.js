import { describe, it, expect, afterEach, vi } from 'vitest'
import { extractExports } from '../src/exports.js'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('extractExports', () => {
  let dir

  function writeTempFile(content, filename = 'test.js') {
    dir = mkdtempSync(join(tmpdir(), 'xray-exports-'))
    const file = join(dir, filename)
    writeFileSync(file, content)
    return file
  }

  afterEach(() => {
    if (dir)
      rmSync(dir, { recursive: true, force: true })
  })

  it('extracts export const', () => {
    const file = writeTempFile('export const foo = 42\nexport const bar = "hi"\n')
    const result = extractExports(file)
    expect(result).toEqual({ exports: ['foo', 'bar'], reExports: [] })
  })

  it('extracts export function', () => {
    const file = writeTempFile('export function bar() {}\n')
    expect(extractExports(file)).toEqual({ exports: ['bar'], reExports: [] })
  })

  it('extracts export async function', () => {
    const file = writeTempFile('export async function qux() {}\n')
    expect(extractExports(file)).toEqual({ exports: ['qux'], reExports: [] })
  })

  it('extracts export class', () => {
    const file = writeTempFile('export class Baz {}\n')
    expect(extractExports(file)).toEqual({ exports: ['Baz'], reExports: [] })
  })

  it('extracts named export list', () => {
    const file = writeTempFile('const a = 1\nconst b = 2\nexport { a, b }\n')
    expect(extractExports(file)).toEqual({ exports: ['a', 'b'], reExports: [] })
  })

  it('extracts re-exports from another module', () => {
    const file = writeTempFile("export { foo, bar } from './other.js'\n")
    expect(extractExports(file)).toEqual({ exports: ['foo', 'bar'], reExports: [] })
  })

  it('extracts aliased named exports', () => {
    const file = writeTempFile("const internal = 1\nexport { internal as external }\n")
    expect(extractExports(file)).toEqual({ exports: ['external'], reExports: [] })
  })

  it('ignores export default', () => {
    const file = writeTempFile('export default function main() {}\nexport const named = 1\n')
    expect(extractExports(file)).toEqual({ exports: ['named'], reExports: [] })
  })

  it('ignores comments that look like exports', () => {
    const file = writeTempFile('// export const fake = 1\nexport const real = 2\n')
    expect(extractExports(file)).toEqual({ exports: ['real'], reExports: [] })
  })

  it('handles mixed export styles', () => {
    const source = [
      'export const VERSION = "1.0"',
      'export function scan() {}',
      'export class Scanner {}',
      'export async function init() {}',
      'const internal = 42',
      'export { internal }',
      "export { helper } from './utils.js'",
      'export default class Main {}',
      '// export const commented = true'
    ].join('\n')
    const file = writeTempFile(source)
    const result = extractExports(file)
    expect(result).toEqual({ exports: ['VERSION', 'scan', 'Scanner', 'init', 'internal', 'helper'], reExports: [] })
  })

  it('returns empty result for file with no exports', () => {
    const file = writeTempFile('const x = 1\n')
    expect(extractExports(file)).toEqual({ exports: [], reExports: [] })
  })

  it('extracts export let and export var', () => {
    const file = writeTempFile('export let a = 1\nexport var b = 2\n')
    expect(extractExports(file)).toEqual({ exports: ['a', 'b'], reExports: [] })
  })

  it('extracts exports from minified single-line file', () => {
    const file = writeTempFile('export const a=1\nexport function b(){}\nexport class C{}')
    expect(extractExports(file)).toEqual({ exports: ['a', 'b', 'C'], reExports: [] })
  })

  it('ignores block comments containing export syntax', () => {
    const source = '/* export const fake = 1 */\nexport const real = 2\n'
    const file = writeTempFile(source)
    expect(extractExports(file)).toEqual({ exports: ['real'], reExports: [] })
  })

  it('extracts multi-line export list', () => {
    const source = [
      'const a = 1',
      'const b = 2',
      'const c = 3',
      'export {',
      '  a,',
      '  b,',
      '  c',
      '}'
    ].join('\n')
    const file = writeTempFile(source)
    expect(extractExports(file)).toEqual({ exports: ['a', 'b', 'c'], reExports: [] })
  })

  it('returns empty result for malformed JS that acorn cannot parse', () => {
    const file = writeTempFile('export const = ;; {{{')
    expect(extractExports(file)).toEqual({ exports: [], reExports: [] })
  })

  it('writes a warning to stderr when parsing fails', () => {
    const file = writeTempFile('export const = ;; {{{')
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      extractExports(file)
      expect(stderrWrite).toHaveBeenCalledOnce()
      const msg = stderrWrite.mock.calls[0][0]
      expect(msg).toContain('xray: warning:')
      expect(msg).toContain(file)
    } finally {
      stderrWrite.mockRestore()
    }
  })

  it('extracts string-literal aliased export name', () => {
    const file = writeTempFile("const foo = 1\nexport { foo as 'bar-baz' }\n")
    expect(extractExports(file)).toEqual({ exports: ['bar-baz'], reExports: [] })
  })

  it('extracts exports from JSX file', () => {
    const file = writeTempFile('export function App() { return <div /> }\nexport const name = "app"\n', 'component.jsx')
    expect(extractExports(file)).toEqual({ exports: ['App', 'name'], reExports: [] })
  })

  it('extracts exports from TSX file', () => {
    const file = writeTempFile('export function Page() { return <main /> }\nexport const route = "/home"\n', 'page.tsx')
    expect(extractExports(file)).toEqual({ exports: ['Page', 'route'], reExports: [] })
  })

  it('tracks export * (star re-exports)', () => {
    const file = writeTempFile("export * from './foo.js'\n")
    expect(extractExports(file)).toEqual({
      exports: [],
      reExports: ['./foo.js']
    })
  })

  it('tracks multiple star re-exports', () => {
    const source = "export * from './a.js'\nexport * from './b.js'\nexport * from './c.js'\n"
    const file = writeTempFile(source)
    expect(extractExports(file)).toEqual({
      exports: [],
      reExports: ['./a.js', './b.js', './c.js']
    })
  })

  it('tracks star re-exports alongside named exports', () => {
    const source = [
      'export const version = "1.0"',
      "export * from './utils.js'",
      "export { helper } from './other.js'",
      "export * from './types.js'"
    ].join('\n')
    const file = writeTempFile(source)
    expect(extractExports(file)).toEqual({
      exports: ['version', 'helper'],
      reExports: ['./utils.js', './types.js']
    })
  })
})
