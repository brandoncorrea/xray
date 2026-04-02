import { describe, it, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { scan } from '../src/scan.js'
import { setupFixture } from './helpers/fixtures.js'

describe('scan', () => {
  let root

  afterEach(() => {
    if (root)
      rmSync(root, { recursive: true, force: true })
  })

  it('produces full index for a directory with interconnected files', async () => {
    root = setupFixture({
      'src/math.js': [
        'export function add(a, b) { return a + b; }',
        'export function subtract(a, b) { return a - b; }'
      ].join('\n'),
      'src/calc.js': [
        "import { add } from './math.js'",
        'export function double(x) { return add(x, x) }'
      ].join('\n'),
      'src/main.js': [
        "import { double } from './calc.js'",
        "import { subtract } from './math.js'",
        'export function run() { return double(subtract(10, 3)) }'
      ].join('\n'),
      'tests/math.test.js': '// test for math\n',
      'tests/calc.test.js': '// test for calc\n'
    })

    const result = await scan(root)

    expect(Object.keys(result).sort()).toEqual([
      'src/calc.js',
      'src/main.js',
      'src/math.js'
    ])

    // math.js
    expect(result['src/math.js'].exports).toEqual(['add', 'subtract'])
    expect(result['src/math.js'].dependencies).toEqual([])
    expect(result['src/math.js'].dependents.sort()).toEqual(['src/calc.js', 'src/main.js'])
    expect(result['src/math.js'].tests).toEqual(['tests/math.test.js'])
    expect(result['src/math.js'].lines).toBe(2)

    // calc.js
    expect(result['src/calc.js'].exports).toEqual(['double'])
    expect(result['src/calc.js'].dependencies).toEqual(['src/math.js'])
    expect(result['src/calc.js'].dependents).toEqual(['src/main.js'])
    expect(result['src/calc.js'].tests).toEqual(['tests/calc.test.js'])
    expect(result['src/calc.js'].lines).toBe(2)

    // main.js — no test file
    expect(result['src/main.js'].exports).toEqual(['run'])
    expect(result['src/main.js'].dependencies.sort()).toEqual(['src/calc.js', 'src/math.js'])
    expect(result['src/main.js'].dependents).toEqual([])
    expect(result['src/main.js'].tests).toEqual([])
    expect(result['src/main.js'].lines).toBe(3)
  })

  it('returns empty object for directory with no JS files', async () => {
    root = setupFixture({
      'README.md': '# hello\n'
    })

    const result = await scan(root)
    expect(result).toEqual({})
  })

  it('normalizes paths that escape the scan root', async () => {
    root = setupFixture({
      'src/app.js': [
        "import { env } from '../shared/env.js'",
        'export function start() { return env }'
      ].join('\n'),
      'shared/env.js': [
        'export const env = "production"'
      ].join('\n')
    })

    const result = await scan(root)

    // External dep should appear as clean path relative to project root
    expect(result['src/app.js'].dependencies).toEqual(['shared/env.js'])
  })

  it('scans .jsx files with correct exports and dependencies', async () => {
    root = setupFixture({
      'src/App.jsx': [
        "import { Button } from './components/Button.jsx'",
        'export function App() { return <Button /> }'
      ].join('\n'),
      'src/components/Button.jsx': [
        'export function Button() { return <button>Click</button>; }'
      ].join('\n'),
      'tests/components/Button.test.jsx': '// test\n'
    })

    const result = await scan(root)

    expect(Object.keys(result).sort()).toEqual([
      'src/App.jsx',
      'src/components/Button.jsx'
    ])

    expect(result['src/App.jsx'].exports).toEqual(['App'])
    expect(result['src/App.jsx'].dependencies).toEqual(['src/components/Button.jsx'])

    expect(result['src/components/Button.jsx'].exports).toEqual(['Button'])
    expect(result['src/components/Button.jsx'].dependents).toEqual(['src/App.jsx'])
    expect(result['src/components/Button.jsx'].tests).toEqual(['tests/components/Button.test.jsx'])
  })

  it('reports zero lines for empty file', async () => {
    root = setupFixture({
      'src/empty.js': ''
    })

    const result = await scan(root)
    expect(result['src/empty.js'].lines).toBe(0)
  })

  it('handles file with no exports', async () => {
    root = setupFixture({
      'src/side-effect.js': "console.log('init')\n"
    })

    const result = await scan(root)
    expect(result['src/side-effect.js'].exports).toEqual([])
    expect(result['src/side-effect.js'].lines).toBe(1)
  })

  it('excludes directories matching exclude patterns', async () => {
    root = setupFixture({
      'src/app.js': 'export function main() {}\n',
      'src/coverage/report.js': 'export function report() {}\n',
      'src/scripts/build.js': 'export function build() {}\n'
    })

    const result = await scan(root, { exclude: ['coverage'] })
    expect(Object.keys(result)).not.toContain('src/coverage/report.js')
    expect(Object.keys(result)).toContain('src/app.js')
    expect(Object.keys(result)).toContain('src/scripts/build.js')
  })

  it('excludes multiple directories', async () => {
    root = setupFixture({
      'src/app.js': 'export function main() {}\n',
      'src/coverage/report.js': 'export function report() {}\n',
      'src/scripts/build.js': 'export function build() {}\n'
    })

    const result = await scan(root, { exclude: ['coverage', 'scripts'] })
    expect(Object.keys(result)).not.toContain('src/coverage/report.js')
    expect(Object.keys(result)).not.toContain('src/scripts/build.js')
    expect(Object.keys(result)).toContain('src/app.js')
  })

  it('includes all files when exclude is empty array', async () => {
    root = setupFixture({
      'src/app.js': 'export function main() {}\n',
      'src/vendor/lib.js': 'export function lib() {}\n'
    })

    const result = await scan(root, { exclude: [] })
    expect(Object.keys(result).sort()).toEqual([
      'src/app.js',
      'src/vendor/lib.js'
    ])
  })

  it('merges CLI exclude with config exclude', async () => {
    root = setupFixture({
      'src/app.js': 'export function main() {}\n',
      'src/coverage/report.js': 'export function report() {}\n',
      'src/scripts/build.js': 'export function build() {}\n',
      'xray.config.js': "export default { exclude: ['coverage'] }\n"
    })

    const result = await scan(root, { exclude: ['scripts'] })
    expect(Object.keys(result)).not.toContain('src/coverage/report.js')
    expect(Object.keys(result)).not.toContain('src/scripts/build.js')
    expect(Object.keys(result)).toContain('src/app.js')
  })
})
