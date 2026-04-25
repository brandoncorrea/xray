import { describe, it, expect, vi } from 'vitest'
import { extractExports } from '../src/exports.js'
import output from '../src/output.js'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), 'xray-exports-'))
}

function rmdir(dir) {
  if (dir)
    rmSync(dir, { recursive: true, force: true })
}

function createFile(dir, content, filename = 'test.js') {
  const file = join(dir, filename)
  writeFileSync(file, content)
  return file
}

function loadExports(content, filename) {
  const dir = makeTempDir()
  try {
    return extractExports(createFile(dir, content, filename))
  } finally {
    rmdir(dir)
  }
}

describe('extractExports', () => {
  it('extracts export const', () => {
    const result = loadExports('export const foo = 42\nexport const bar = "hi"\n')
    expect(result).toEqual({ exports: ['foo', 'bar'], reExports: [] })
  })

  it('extracts export function', () => {
    const result = loadExports('export function bar() {}\n')
    expect(result).toEqual({ exports: ['bar'], reExports: [] })
  })

  it('extracts export async function', () => {
    const result = loadExports('export async function qux() {}\n')
    expect(result).toEqual({ exports: ['qux'], reExports: [] })
  })

  it('extracts export class', () => {
    const result = loadExports('export class Baz {}\n')
    expect(result).toEqual({ exports: ['Baz'], reExports: [] })
  })

  it('extracts named export list', () => {
    const result = loadExports('const a = 1\nconst b = 2\nexport { a, b }\n')
    expect(result).toEqual({ exports: ['a', 'b'], reExports: [] })
  })

  it('extracts re-exports from another module', () => {
    const result = loadExports("export { foo, bar } from './other.js'\n")
    expect(result).toEqual({ exports: ['foo', 'bar'], reExports: [] })
  })

  it('extracts aliased named exports', () => {
    const result = loadExports("const internal = 1\nexport { internal as external }\n")
    expect(result).toEqual({ exports: ['external'], reExports: [] })
  })

  it('tracks export default function', () => {
    const result = loadExports('export default function main() {}\nexport const named = 1\n')
    expect(result).toEqual({ exports: ['default', 'named'], reExports: [] })
  })

  it('tracks export default class', () => {
    const result = loadExports('export default class App {}\n')
    expect(result).toEqual({ exports: ['default'], reExports: [] })
  })

  it('tracks export default expression', () => {
    const result = loadExports('export default 42\n')
    expect(result).toEqual({ exports: ['default'], reExports: [] })
  })

  it('ignores comments that look like exports', () => {
    const result = loadExports('// export const fake = 1\nexport const real = 2\n')
    expect(result).toEqual({ exports: ['real'], reExports: [] })
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
    const result = loadExports(source)
    expect(result).toEqual({ exports: ['VERSION', 'scan', 'Scanner', 'init', 'internal', 'helper', 'default'], reExports: [] })
  })

  it('returns empty result for file with no exports', () => {
    const result = loadExports('const x = 1\n')
    expect(result).toEqual({ exports: [], reExports: [] })
  })

  it('extracts export let and export var', () => {
    const result = loadExports('export let a = 1\nexport var b = 2\n')
    expect(result).toEqual({ exports: ['a', 'b'], reExports: [] })
  })

  it('extracts exports from minified single-line file', () => {
    const result = loadExports('export const a=1\nexport function b(){}\nexport class C{}')
    expect(result).toEqual({ exports: ['a', 'b', 'C'], reExports: [] })
  })

  it('ignores block comments containing export syntax', () => {
    const source = '/* export const fake = 1 */\nexport const real = 2\n'
    const result = loadExports(source)
    expect(result).toEqual({ exports: ['real'], reExports: [] })
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
    const result = loadExports(source)
    expect(result).toEqual({ exports: ['a', 'b', 'c'], reExports: [] })
  })

  it('returns empty result for malformed JS that acorn cannot parse', () => {
    const result = loadExports('export const = ;; {{{')
    expect(result).toEqual({ exports: [], reExports: [] })
  })

  it('writes a warning when parsing fails', () => {
    const dir = makeTempDir()
    const file = createFile(dir, 'export const = ;; {{{')
    const spy = vi.spyOn(output, 'error')
    try {
      extractExports(file)
      expect(spy).toHaveBeenCalledOnce()
      const msg = spy.mock.calls[0][0]
      expect(msg).toContain('xray: warning:')
      expect(msg).toContain(file)
    } finally {
      spy.mockRestore()
      rmdir(dir)
    }
  })

  it('extracts string-literal aliased export name', () => {
    const result = loadExports("const foo = 1\nexport { foo as 'bar-baz' }\n")
    expect(result).toEqual({ exports: ['bar-baz'], reExports: [] })
  })

  it('extracts exports from JSX file', () => {
    const result = loadExports('export function App() { return <div /> }\nexport const name = "app"\n', 'component.jsx')
    expect(result).toEqual({ exports: ['App', 'name'], reExports: [] })
  })

  it('extracts exports from TSX file', () => {
    const result = loadExports('export function Page() { return <main /> }\nexport const route = "/home"\n', 'page.tsx')
    expect(result).toEqual({ exports: ['Page', 'route'], reExports: [] })
  })

  it('tracks export * (star re-exports)', () => {
    const result = loadExports("export * from './foo.js'\n")
    expect(result).toEqual({
      exports: [],
      reExports: ['./foo.js']
    })
  })

  it('tracks multiple star re-exports', () => {
    const source = "export * from './a.js'\nexport * from './b.js'\nexport * from './c.js'\n"
    const result = loadExports(source)
    expect(result).toEqual({
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
    const result = loadExports(source)
    expect(result).toEqual({
      exports: ['version', 'helper'],
      reExports: ['./utils.js', './types.js']
    })
  })
})
