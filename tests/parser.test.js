import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Parser } from 'acorn'
import { describe, it, expect, vi } from 'vitest'
import { analyzeFile, selectParser, jsxParser } from '../src/parser.js'
import output from '../src/output.js'

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
    const { exports, reExports } = analyzeFile(createFile(dir, content, filename))
    return { exports, reExports }
  } finally {
    rmdir(dir)
  }
}

function testExports(name, content, expectedResult, filename) {
  it(name, () => {
    const result = loadExports(content, filename)
    expect(result).toEqual(expectedResult)
  })
}

describe('analyzeFile exports', () => {
  testExports(
    'extracts export const',
    'export const foo = 42\nexport const bar = "hi"\n',
    { exports: ['foo', 'bar'], reExports: [] })

  testExports(
    'extracts export function',
    'export function bar() {}\n',
    { exports: ['bar'], reExports: [] })

  testExports(
    'extracts export async function',
    'export async function qux() {}\n',
    { exports: ['qux'], reExports: [] })

  testExports(
    'extracts export class',
    'export class Baz {}\n',
    { exports: ['Baz'], reExports: [] })

  testExports(
    'extracts named export list',
    'const a = 1\nconst b = 2\nexport { a, b }\n',
    { exports: ['a', 'b'], reExports: [] })

  testExports(
    'extracts re-exports from another module',
    "export { foo, bar } from './other.js'\n",
    { exports: ['foo', 'bar'], reExports: [] })

  testExports(
    'extracts aliased named exports',
    "const internal = 1\nexport { internal as external }\n",
    { exports: ['external'], reExports: [] })

  testExports(
    'tracks export default function',
    'export default function main() {}\nexport const named = 1\n',
    { exports: ['default', 'named'], reExports: [] })

  testExports(
    'tracks export default class',
    'export default class App {}\n',
    { exports: ['default'], reExports: [] })

  testExports(
    'tracks export default expression',
    'export default 42\n',
    { exports: ['default'], reExports: [] })

  testExports(
    'ignores comments that look like exports',
    '// export const fake = 1\nexport const real = 2\n',
    { exports: ['real'], reExports: [] })

  testExports(
    'handles mixed export styles',
    [
      'export const VERSION = "1.0"',
      'export function scan() {}',
      'export class Scanner {}',
      'export async function init() {}',
      'const internal = 42',
      'export { internal }',
      "export { helper } from './utils.js'",
      'export default class Main {}',
      '// export const commented = true'
    ].join('\n'),
    {
      exports: ['VERSION', 'scan', 'Scanner', 'init', 'internal', 'helper', 'default'],
      reExports: []
    })

  testExports(
    'returns empty result for file with no exports',
    'const x = 1\n',
    { exports: [], reExports: [] })

  testExports(
    'extracts export let and export var',
    'export let a = 1\nexport var b = 2\n',
    { exports: ['a', 'b'], reExports: [] })

  testExports(
    'extracts exports from minified single-line file',
    'export const a=1\nexport function b(){}\nexport class C{}',
    { exports: ['a', 'b', 'C'], reExports: [] })

  testExports(
    'ignores block comments containing export syntax',
    '/* export const fake = 1 */\nexport const real = 2\n',
    { exports: ['real'], reExports: [] })

  testExports(
    'extracts multi-line export list',
    [
      'const a = 1',
      'const b = 2',
      'const c = 3',
      'export {',
      '  a,',
      '  b,',
      '  c',
      '}'
    ].join('\n'),
    { exports: ['a', 'b', 'c'], reExports: [] })

  testExports(
    'returns empty result for malformed JS that acorn cannot parse',
    'export const = ;; {{{',
    { exports: [], reExports: [] })

  it('writes a warning when parsing fails', () => {
    const dir = makeTempDir()
    const file = createFile(dir, 'export const = ;; {{{')
    const spy = vi.spyOn(output, 'error')
    try {
      analyzeFile(file)
      expect(spy).toHaveBeenCalledOnce()
      const msg = spy.mock.calls[0][0]
      expect(msg).toContain('xray: warning:')
      expect(msg).toContain(file)
    } finally {
      spy.mockRestore()
      rmdir(dir)
    }
  })

  testExports(
    'extracts string-literal aliased export name',
    "const foo = 1\nexport { foo as 'bar-baz' }\n",
    { exports: ['bar-baz'], reExports: [] })

  testExports(
    'extracts exports from JSX file',
    'export function App() { return <div /> }\nexport const name = "app"\n',
    { exports: ['App', 'name'], reExports: [] },
    'component.jsx')

  testExports(
    'extracts exports from TSX file',
    'export function Page() { return <main /> }\nexport const route = "/home"\n',
    { exports: ['Page', 'route'], reExports: [] },
    'page.tsx')

  testExports(
    'tracks export * (star re-exports)',
    "export * from './foo.js'\n",
    { exports: [], reExports: ['./foo.js'] })

  testExports(
    'tracks multiple star re-exports',
    "export * from './a.js'\nexport * from './b.js'\nexport * from './c.js'\n",
    { exports: [], reExports: ['./a.js', './b.js', './c.js'] })

  testExports(
    'tracks star re-exports alongside named exports',
    [
      'export const version = "1.0"',
      "export * from './utils.js'",
      "export { helper } from './other.js'",
      "export * from './types.js'"
    ].join('\n'),
    { exports: ['version', 'helper'], reExports: ['./utils.js', './types.js'] })
})

function testParser(kind, ext, expectedParser) {
  it(`selects the ${kind} parser on ${ext}`, () => {
    const parser = selectParser(`blah${ext}`)
    expect(parser).toBe(expectedParser)
  })
}

describe('Parser', () => {
  testParser('JSX', '.jsx', jsxParser)
  testParser('JSX', '.tsx', jsxParser)
  testParser('default', '.js', Parser)
  testParser('default', '.ts', Parser)
})
