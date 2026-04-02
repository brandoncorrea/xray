import { describe, it, expect, afterEach } from 'vitest'
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
    expect(result).toEqual(['foo', 'bar'])
  })

  it('extracts export function', () => {
    const file = writeTempFile('export function bar() {}\n')
    expect(extractExports(file)).toEqual(['bar'])
  })

  it('extracts export async function', () => {
    const file = writeTempFile('export async function qux() {}\n')
    expect(extractExports(file)).toEqual(['qux'])
  })

  it('extracts export class', () => {
    const file = writeTempFile('export class Baz {}\n')
    expect(extractExports(file)).toEqual(['Baz'])
  })

  it('extracts named export list', () => {
    const file = writeTempFile('const a = 1\nconst b = 2\nexport { a, b }\n')
    expect(extractExports(file)).toEqual(['a', 'b'])
  })

  it('extracts re-exports from another module', () => {
    const file = writeTempFile("export { foo, bar } from './other.js'\n")
    expect(extractExports(file)).toEqual(['foo', 'bar'])
  })

  it('extracts aliased named exports', () => {
    const file = writeTempFile("const internal = 1\nexport { internal as external }\n")
    expect(extractExports(file)).toEqual(['external'])
  })

  it('ignores export default', () => {
    const file = writeTempFile('export default function main() {}\nexport const named = 1\n')
    expect(extractExports(file)).toEqual(['named'])
  })

  it('ignores comments that look like exports', () => {
    const file = writeTempFile('// export const fake = 1\nexport const real = 2\n')
    expect(extractExports(file)).toEqual(['real'])
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
    expect(result).toEqual(['VERSION', 'scan', 'Scanner', 'init', 'internal', 'helper'])
  })

  it('returns empty array for file with no exports', () => {
    const file = writeTempFile('const x = 1\n')
    expect(extractExports(file)).toEqual([])
  })

  it('extracts export let and export var', () => {
    const file = writeTempFile('export let a = 1\nexport var b = 2\n')
    expect(extractExports(file)).toEqual(['a', 'b'])
  })

  it('extracts exports from minified single-line file', () => {
    const file = writeTempFile('export const a=1\nexport function b(){}\nexport class C{}')
    expect(extractExports(file)).toEqual(['a', 'b', 'C'])
  })

  it('ignores block comments containing export syntax', () => {
    const source = '/* export const fake = 1 */\nexport const real = 2\n'
    const file = writeTempFile(source)
    expect(extractExports(file)).toEqual(['real'])
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
    expect(extractExports(file)).toEqual(['a', 'b', 'c'])
  })

  it('extracts exports from JSX file', () => {
    const file = writeTempFile('export function App() { return <div /> }\nexport const name = "app"\n', 'component.jsx')
    expect(extractExports(file)).toEqual(['App', 'name'])
  })
})
