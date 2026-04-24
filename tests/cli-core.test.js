import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { main } from '../src/cli-core.js'
import output from '../src/output.js'
import { setupFixture } from './helpers/fixtures.js'

function captureOutput() {
  const chunks = []
  let writtenPath
  return {
    write(json, outputPath) { chunks.push(json); writtenPath = outputPath },
    output: () => chunks.join(''),
    path: () => writtenPath,
  }
}

describe('main', () => {
  it('prints help and returns 0', async () => {
    const cap = captureOutput()
    const code = await main(['--help'], { write: cap.write })
    expect(code).toBe(0)
    expect(cap.output()).toContain('Usage: xray')
  })

  it('prints version and returns 0', async () => {
    const cap = captureOutput()
    const code = await main(['--version'], { write: cap.write })
    expect(code).toBe(0)
    expect(cap.output().trim()).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('help includes --exclude', async () => {
    const cap = captureOutput()
    await main(['--help'], { write: cap.write })
    expect(cap.output()).toContain('--exclude')
  })

  it('defaults to scanning current directory when no dir argument given', async () => {
    const root = setupFixture({
      'src/hello.js': 'export function hello() {}\n'
    })
    const cap = captureOutput()
    const origCwd = process.cwd()
    try {
      process.chdir(root)
      await main(['--compact'], { write: cap.write })
      const index = JSON.parse(cap.output())
      expect(Object.keys(index)).toEqual(['src/hello.js'])
    } finally {
      process.chdir(origCwd)
      rmSync(root, { recursive: true, force: true })
    }
  })

  describe('with fixture directory', () => {
    let root

    beforeAll(() => {
      root = setupFixture({
        'src/math.js': [
          'export function add(a, b) { return a + b }',
          'export function subtract(a, b) { return a - b }'
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
        'tests/math.test.js': '// test for math\n'
      })
    })

    afterAll(() => {
      if (root) rmSync(root, { recursive: true, force: true })
    })

    it('full scan outputs JSON', async () => {
      const cap = captureOutput()
      await main([root, '--compact'], { write: cap.write })
      const index = JSON.parse(cap.output())
      expect(Object.keys(index).sort()).toEqual([
        'src/calc.js', 'src/main.js', 'src/math.js', 'tests/math.test.js'
      ])
      expect(index['src/math.js'].exports).toEqual(['add', 'subtract'])
    })

    it('--output passes output path to writer', async () => {
      const cap = captureOutput()
      await main([root, '--output', 'out.json'], { write: cap.write })
      expect(cap.path()).toBe('out.json')
      const index = JSON.parse(cap.output())
      expect(index['src/math.js'].exports).toEqual(['add', 'subtract'])
    })

    it('-o passes output path to writer', async () => {
      const cap = captureOutput()
      await main([root, '-o', 'out.json'], { write: cap.write })
      expect(cap.path()).toBe('out.json')
      const index = JSON.parse(cap.output())
      expect(Object.keys(index)).toContain('src/calc.js')
    })

    it('--file shows detail for a single file', async () => {
      const cap = captureOutput()
      await main([root, '--file', 'src/math.js', '--compact'], { write: cap.write })
      const result = JSON.parse(cap.output())
      expect(Object.keys(result)).toEqual(['src/math.js'])
      expect(result['src/math.js'].exports).toEqual(['add', 'subtract'])
      expect(result['src/math.js'].lines).toBe(2)
    })

    it('--file for unknown file outputs empty object', async () => {
      const cap = captureOutput()
      await main([root, '--file', 'src/nope.js', '--compact'], { write: cap.write })
      expect(JSON.parse(cap.output())).toEqual({})
    })

    it('--dependents-of lists files that import the target', async () => {
      const cap = captureOutput()
      await main([root, '--dependents-of', 'src/math.js', '--compact'], { write: cap.write })
      const result = JSON.parse(cap.output())
      expect(Object.keys(result).sort()).toEqual(['src/calc.js', 'src/main.js'])
    })

    it('--dependents-of for leaf file outputs empty object', async () => {
      const cap = captureOutput()
      await main([root, '--dependents-of', 'src/main.js', '--compact'], { write: cap.write })
      expect(JSON.parse(cap.output())).toEqual({})
    })

    it('--dependencies-of lists modules imported by the target', async () => {
      const cap = captureOutput()
      await main([root, '--dependencies-of', 'src/main.js', '--compact'], { write: cap.write })
      const result = JSON.parse(cap.output())
      expect(Object.keys(result)).toEqual(['src/main.js'])
      expect(result['src/main.js'].dependencies.sort()).toEqual(['src/calc.js', 'src/math.js'])
    })

    it('--dependencies-of for file with no deps returns entry with empty dependencies', async () => {
      const cap = captureOutput()
      await main([root, '--dependencies-of', 'src/math.js', '--compact'], { write: cap.write })
      const result = JSON.parse(cap.output())
      expect(result['src/math.js'].dependencies).toEqual([])
      expect(result['src/math.js'].exports).toEqual(['add', 'subtract'])
    })

    it('--dependencies-of for unknown file outputs empty object', async () => {
      const cap = captureOutput()
      await main([root, '--dependencies-of', 'src/nope.js', '--compact'], { write: cap.write })
      expect(JSON.parse(cap.output())).toEqual({})
    })

    it('defaults to pretty-printed JSON when stdout is a TTY', async () => {
      const cap = captureOutput()
      const origIsTTY = process.stdout.isTTY
      try {
        process.stdout.isTTY = true
        await main([root], { write: cap.write })
        const lines = cap.output().trim().split('\n')
        expect(lines.length).toBeGreaterThan(1)
        expect(cap.output()).toContain('  ')
        JSON.parse(cap.output())
      } finally {
        process.stdout.isTTY = origIsTTY
      }
    })

    it('defaults to compact JSON when stdout is not a TTY', async () => {
      const cap = captureOutput()
      const origIsTTY = process.stdout.isTTY
      try {
        process.stdout.isTTY = undefined
        await main([root], { write: cap.write })
        expect(cap.output().trim().split('\n')).toHaveLength(1)
        JSON.parse(cap.output())
      } finally {
        process.stdout.isTTY = origIsTTY
      }
    })

    it('--compact outputs single-line JSON', async () => {
      const cap = captureOutput()
      await main([root, '--compact'], { write: cap.write })
      expect(cap.output().trim().split('\n')).toHaveLength(1)
      JSON.parse(cap.output())
    })

    it('--pretty outputs indented JSON', async () => {
      const cap = captureOutput()
      await main([root, '--pretty'], { write: cap.write })
      const lines = cap.output().trim().split('\n')
      expect(lines.length).toBeGreaterThan(1)
      expect(cap.output()).toContain('  ')
      JSON.parse(cap.output())
    })

    it('-o defaults to pretty-printed JSON', async () => {
      const cap = captureOutput()
      await main([root, '-o', 'out.json'], { write: cap.write })
      const lines = cap.output().trim().split('\n')
      expect(lines.length).toBeGreaterThan(1)
      JSON.parse(cap.output())
    })

    it('--compact with -o writes compact JSON', async () => {
      const cap = captureOutput()
      await main([root, '-o', 'out.json', '--compact'], { write: cap.write })
      expect(cap.output().trim().split('\n')).toHaveLength(1)
      JSON.parse(cap.output())
    })

    it('--pretty with -o writes pretty JSON', async () => {
      const cap = captureOutput()
      await main([root, '-o', 'out.json', '--pretty'], { write: cap.write })
      expect(cap.output().trim().split('\n').length).toBeGreaterThan(1)
      JSON.parse(cap.output())
    })

    it('--files-only outputs sorted file paths as a JSON array', async () => {
      const cap = captureOutput()
      await main([root, '--files-only', '--compact'], { write: cap.write })
      const result = JSON.parse(cap.output())
      expect(result).toEqual([
        'src/calc.js', 'src/main.js', 'src/math.js', 'tests/math.test.js'
      ])
    })

    it('--files-only combined with --dependents-of filters then lists paths', async () => {
      const cap = captureOutput()
      await main([root, '--files-only', '--dependents-of', 'src/math.js', '--compact'], { write: cap.write })
      const result = JSON.parse(cap.output())
      expect(result).toEqual(['src/calc.js', 'src/main.js'])
    })

    it('rejects unknown flags with an error', async () => {
      const cap = captureOutput()
      const spy = vi.spyOn(output, 'error')
      try {
        const code = await main([root, '--bogus', '--compact'], { write: cap.write })
        expect(code).toBe(1)
        expect(spy).toHaveBeenCalled()
        expect(spy.mock.calls[0][0]).toContain('--bogus')
      } finally {
        spy.mockRestore()
      }
    })

    it('rejects multiple unknown flags listing all of them', async () => {
      const cap = captureOutput()
      const spy = vi.spyOn(output, 'error')
      try {
        const code = await main([root, '--bogus', '--nope'], { write: cap.write })
        expect(code).toBe(1)
        const msg = spy.mock.calls[0][0]
        expect(msg).toContain('--bogus')
        expect(msg).toContain('--nope')
      } finally {
        spy.mockRestore()
      }
    })
  })

  describe('defaultWrite (no write option)', () => {
    it('writes to stdout when no output path given', async () => {
      const spy = vi.spyOn(output, 'log').mockImplementation(() => true)
      try {
        await main(['--help'])
        expect(spy).toHaveBeenCalled()
        expect(spy.mock.calls[0][0]).toContain('Usage: xray')
      } finally {
        spy.mockRestore()
      }
    })

    it('writes to file when output path given', async () => {
      const root = setupFixture({
        'src/a.js': 'export const x = 1\n'
      })
      const outFile = join(root, 'result.json')
      const spy = vi.spyOn(output, 'log').mockImplementation(() => true)
      try {
        await main([root, '-o', outFile, '--compact'])
        expect(spy).not.toHaveBeenCalled()
        const content = readFileSync(outFile, 'utf-8')
        const index = JSON.parse(content)
        expect(index['src/a.js']).toBeDefined()
      } finally {
        spy.mockRestore()
        rmSync(root, { recursive: true, force: true })
      }
    })
  })

  it('help includes --files-only', async () => {
    const cap = captureOutput()
    await main(['--help'], { write: cap.write })
    expect(cap.output()).toContain('--files-only')
  })

  it('help includes --include', async () => {
    const cap = captureOutput()
    await main(['--help'], { write: cap.write })
    expect(cap.output()).toContain('--include')
  })

  describe('--include', () => {
    let root

    beforeAll(() => {
      root = setupFixture({
        'src/app.js': 'export function main() { return 1 }\n',
        'shared/utils.js': 'export function util() { return 2 }\n',
        'vendor/lib.js': 'export function lib() { return 3 }\n'
      })
    })

    afterAll(() => {
      if (root) rmSync(root, { recursive: true, force: true })
    })

    it('--include scans only specified directories', async () => {
      const cap = captureOutput()
      await main([root, '--include', 'src', '--compact'], { write: cap.write })
      const index = JSON.parse(cap.output())
      expect(Object.keys(index)).toEqual(['src/app.js'])
    })

    it('multiple --include flags scan multiple directories', async () => {
      const cap = captureOutput()
      await main([root, '--include', 'src', '--include', 'shared', '--compact'], { write: cap.write })
      const index = JSON.parse(cap.output())
      expect(Object.keys(index).sort()).toEqual(['shared/utils.js', 'src/app.js'])
    })

    it('--include with --exclude narrows then removes', async () => {
      const rootWithCoverage = setupFixture({
        'src/app.js': 'export function main() {}\n',
        'src/coverage/report.js': 'export function report() {}\n',
        'shared/utils.js': 'export function util() {}\n'
      })
      try {
        const cap = captureOutput()
        await main([rootWithCoverage, '--include', 'src', '--exclude', 'coverage', '--compact'], { write: cap.write })
        const index = JSON.parse(cap.output())
        expect(Object.keys(index)).toEqual(['src/app.js'])
      } finally {
        rmSync(rootWithCoverage, { recursive: true, force: true })
      }
    })
  })

  describe('--exclude', () => {
    let root

    beforeAll(() => {
      root = setupFixture({
        'src/app.js': [
          "import { helper } from './utils/helper.js'",
          'export function main() { return helper() }'
        ].join('\n'),
        'src/utils/helper.js': 'export function helper() { return 1 }\n',
        'src/coverage/report.js': 'export function report() {}\n',
        'src/scripts/build.js': 'export function build() {}\n'
      })
    })

    afterAll(() => {
      if (root) rmSync(root, { recursive: true, force: true })
    })

    it('--exclude skips matching directories', async () => {
      const cap = captureOutput()
      await main([root, '--exclude', 'coverage', '--compact'], { write: cap.write })
      const index = JSON.parse(cap.output())
      expect(Object.keys(index)).not.toContain('src/coverage/report.js')
      expect(Object.keys(index)).toContain('src/app.js')
    })

    it('multiple --exclude flags are additive', async () => {
      const cap = captureOutput()
      await main([root, '--exclude', 'coverage', '--exclude', 'scripts', '--compact'], { write: cap.write })
      const index = JSON.parse(cap.output())
      expect(Object.keys(index)).not.toContain('src/coverage/report.js')
      expect(Object.keys(index)).not.toContain('src/scripts/build.js')
      expect(Object.keys(index)).toContain('src/app.js')
    })

  })
})
