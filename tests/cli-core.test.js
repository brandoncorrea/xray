import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { main, run } from '../src/cli-core.js'
import output from '../src/output.js'
import { setupFixture } from './helpers/fixtures.js'

function captureOutput() {
  const chunks = []
  let writtenPath
  return {
    write(json, outputPath) {
      chunks.push(json)
      writtenPath = outputPath
    },
    output: () => chunks.join(''),
    path: () => writtenPath,
  }
}

function fakeProcess(...args) {
  return {
    argv: ['node', ...args],
    exit: vi.fn()
  }
}

function rmdir(root) {
  if (root)
    rmSync(root, { recursive: true, force: true })
}

describe('CLI Core', () => {
  let cap
  beforeEach(() => {
    cap = captureOutput()
  })

  describe('run', () => {
    let spy
    beforeEach(() => {
      spy = vi.spyOn(output, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      spy.mockRestore()
    })

    it('passes argv.slice(2) to main and exits with the result', async () => {
      const proc = fakeProcess('cli.js', '--help')
      await run(proc)
      expect(spy.mock.calls[0][0]).toContain('Usage: xray')
      expect(proc.exit).toHaveBeenCalledWith(0)
    })

    it('strips first two argv elements before passing to main', async () => {
      const proc = fakeProcess('--bogus', '--help')
      await run(proc)
      expect(proc.exit).toHaveBeenCalledWith(0)
    })
  })

  describe('main', () => {
    it('prints help and returns 0', async () => {
      const code = await main(['--help'], cap)
      expect(code).toBe(0)
      expect(cap.output()).toContain('Usage: xray')
    })

    it('prints version and returns 0', async () => {
      const code = await main(['--version'], cap)
      expect(code).toBe(0)
      expect(cap.output().trim()).toMatch(/^\d+\.\d+\.\d+$/)
    })

    it('help includes --exclude', async () => {
      await main(['--help'], cap)
      expect(cap.output()).toContain('--exclude')
    })

    it('defaults to scanning current directory when no dir argument given', async () => {
      const root = setupFixture({
        'src/hello.js': 'export function hello() {}\n'
      })
      const origCwd = process.cwd()
      try {
        process.chdir(root)
        await main(['--compact'], cap)
        const index = JSON.parse(cap.output())
        expect(Object.keys(index)).toEqual(['src/hello.js'])
      } finally {
        process.chdir(origCwd)
        rmdir(root)
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
          'tests/math.test.js': '// test for math\n',
          'xray.config.js': 'export default {}\n'
        })
      })

      afterAll(() => {
        rmdir(root)
      })

      it('full scan outputs JSON', async () => {
        await main([root, '--compact'], cap)
        const index = JSON.parse(cap.output())
        expect(Object.keys(index).sort()).toEqual([
          'src/calc.js', 'src/main.js', 'src/math.js', 'tests/math.test.js', 'xray.config.js'
        ])
        expect(index['src/math.js'].exports).toEqual(['add', 'subtract'])
      })

      it('--output passes output path to writer', async () => {
        await main([root, '--output', 'out.json'], cap)
        expect(cap.path()).toBe('out.json')
        const index = JSON.parse(cap.output())
        expect(index['src/math.js'].exports).toEqual(['add', 'subtract'])
      })

      it('-o passes output path to writer', async () => {
        await main([root, '-o', 'out.json'], cap)
        expect(cap.path()).toBe('out.json')
        const index = JSON.parse(cap.output())
        expect(Object.keys(index)).toContain('src/calc.js')
      })

      it('--file shows detail for a single file', async () => {
        await main([root, '--file', 'src/math.js', '--compact'], cap)
        const result = JSON.parse(cap.output())
        expect(Object.keys(result)).toEqual(['src/math.js'])
        expect(result['src/math.js'].exports).toEqual(['add', 'subtract'])
        expect(result['src/math.js'].lines).toBe(2)
      })

      it('--file for unknown file outputs empty object', async () => {
        await main([root, '--file', 'src/nope.js', '--compact'], cap)
        expect(JSON.parse(cap.output())).toEqual({})
      })

      it('--dependents-of lists files that import the target', async () => {
        await main([root, '--dependents-of', 'src/math.js', '--compact'], cap)
        const result = JSON.parse(cap.output())
        expect(Object.keys(result).sort()).toEqual(['src/calc.js', 'src/main.js'])
      })

      it('--dependents-of for leaf file outputs empty object', async () => {
        await main([root, '--dependents-of', 'src/main.js', '--compact'], cap)
        expect(JSON.parse(cap.output())).toEqual({})
      })

      it('--dependencies-of lists modules imported by the target', async () => {
        await main([root, '--dependencies-of', 'src/main.js', '--compact'], cap)
        const result = JSON.parse(cap.output())
        expect(Object.keys(result)).toEqual(['src/main.js'])
        expect(result['src/main.js'].dependencies.sort()).toEqual(['src/calc.js', 'src/math.js'])
      })

      it('--dependencies-of for file with no deps returns entry with empty dependencies', async () => {
        await main([root, '--dependencies-of', 'src/math.js', '--compact'], cap)
        const result = JSON.parse(cap.output())
        expect(result['src/math.js'].dependencies).toEqual([])
        expect(result['src/math.js'].exports).toEqual(['add', 'subtract'])
      })

      it('--dependencies-of for unknown file outputs empty object', async () => {
        await main([root, '--dependencies-of', 'src/nope.js', '--compact'], cap)
        expect(JSON.parse(cap.output())).toEqual({})
      })

      it('defaults to pretty-printed JSON when stdout is a TTY', async () => {
        const origIsTTY = process.stdout.isTTY
        try {
          process.stdout.isTTY = true
          await main([root], cap)
          const lines = cap.output().trim().split('\n')
          expect(lines.length).toBeGreaterThan(1)
          expect(cap.output()).toContain('  ')
          JSON.parse(cap.output())
        } finally {
          process.stdout.isTTY = origIsTTY
        }
      })

      it('defaults to compact JSON when stdout is not a TTY', async () => {
        const origIsTTY = process.stdout.isTTY
        try {
          process.stdout.isTTY = undefined
          await main([root], cap)
          expect(cap.output().trim().split('\n')).toHaveLength(1)
          JSON.parse(cap.output())
        } finally {
          process.stdout.isTTY = origIsTTY
        }
      })

      it('--compact outputs single-line JSON', async () => {
        await main([root, '--compact'], cap)
        expect(cap.output().trim().split('\n')).toHaveLength(1)
        JSON.parse(cap.output())
      })

      it('--pretty outputs 2-space indented JSON', async () => {
        await main([root, '--pretty'], cap)
        const lines = cap.output().trim().split('\n')
        expect(lines.length).toBeGreaterThan(1)
        const indentedLine = lines.find(l => l.startsWith(' '))
        expect(indentedLine).toMatch(/^ {2}\S/)
        JSON.parse(cap.output())
      })

      it('-o defaults to pretty-printed JSON', async () => {
        await main([root, '-o', 'out.json'], cap)
        const lines = cap.output().trim().split('\n')
        expect(lines.length).toBeGreaterThan(1)
        JSON.parse(cap.output())
      })

      it('--compact with -o writes compact JSON', async () => {
        await main([root, '-o', 'out.json', '--compact'], cap)
        expect(cap.output().trim().split('\n')).toHaveLength(1)
        JSON.parse(cap.output())
      })

      it('--pretty with -o writes pretty JSON', async () => {
        await main([root, '-o', 'out.json', '--pretty'], cap)
        expect(cap.output().trim().split('\n').length).toBeGreaterThan(1)
        JSON.parse(cap.output())
      })

      it('--files-only outputs sorted file paths as a JSON array', async () => {
        // Fixture keys are already alphabetical; use a separate fixture
        // where insertion order differs from sorted order
        const unsorted = setupFixture({
          'src/zebra.js': 'export const z = 1\n',
          'src/alpha.js': 'export const a = 2\n'
        })
        try {
          await main([unsorted, '--files-only', '--compact'], cap)
          const result = JSON.parse(cap.output())
          expect(result).toEqual(['src/alpha.js', 'src/zebra.js'])
        } finally {
          rmdir(unsorted)
        }
      })

      it('--files-only combined with --dependents-of filters then lists paths', async () => {
        await main([root, '--files-only', '--dependents-of', 'src/math.js', '--compact'], cap)
        const result = JSON.parse(cap.output())
        expect(result).toEqual(['src/calc.js', 'src/main.js'])
      })

      describe('errors', () => {
        let spy

        beforeEach(() => {
          spy = vi.spyOn(output, 'error')
        })

        afterEach(() => {
          spy.mockRestore()
        })

        it('rejects unknown flag with singular error', async () => {
          const code = await main([root, '--bogus', '--compact'], cap)
          expect(code).toBe(1)
          expect(spy.mock.calls[0][0]).toMatch(/^Unknown flag:/)
        })

        it('rejects multiple unknown flags with plural error', async () => {
          const code = await main([root, '--bogus', '--nope'], cap)
          expect(code).toBe(1)
          const msg = spy.mock.calls[0][0]
          expect(msg).toMatch(/^Unknown flags: --bogus, --nope/)
        })
      })
    })

    describe('defaultWrite (no write option)', () => {
      let spy
      beforeEach(() => {
        spy = vi.spyOn(output, 'log').mockImplementation(() => true)
      })
      afterEach(() => {
        spy.mockRestore()
      })

      it('writes to stdout when no output path given', async () => {
        await main(['--help'])
        expect(spy).toHaveBeenCalled()
        expect(spy.mock.calls[0][0]).toContain('Usage: xray')
      })

      it('writes to file when output path given', async () => {
        const root = setupFixture({
          'src/a.js': 'export const x = 1\n'
        })
        const outFile = join(root, 'result.json')
        try {
          await main([root, '-o', outFile, '--compact'])
          expect(spy).not.toHaveBeenCalled()
          const content = readFileSync(outFile, 'utf-8')
          const index = JSON.parse(content)
          expect(index['src/a.js']).toBeDefined()
        } finally {
          rmdir(root)
        }
      })
    })

    it('help includes --files-only', async () => {
      await main(['--help'], cap)
      expect(cap.output()).toContain('--files-only')
    })

    it('help includes --include', async () => {
      await main(['--help'], cap)
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
        rmdir(root)
      })

      it('--include scans only specified directories', async () => {
        await main([root, '--include', 'src', '--compact'], cap)
        const index = JSON.parse(cap.output())
        expect(Object.keys(index)).toEqual(['src/app.js'])
      })

      it('multiple --include flags scan multiple directories', async () => {
        await main([root, '--include', 'src', '--include', 'shared', '--compact'], cap)
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
          await main([rootWithCoverage, '--include', 'src', '--exclude', 'coverage', '--compact'], cap)
          const index = JSON.parse(cap.output())
          expect(Object.keys(index)).toEqual(['src/app.js'])
        } finally {
          rmdir(rootWithCoverage)
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
        rmdir(root)
      })

      it('--exclude skips matching directories', async () => {
        await main([root, '--exclude', 'coverage', '--compact'], cap)
        const index = JSON.parse(cap.output())
        expect(Object.keys(index)).not.toContain('src/coverage/report.js')
        expect(Object.keys(index)).toContain('src/app.js')
      })

      it('multiple --exclude flags are additive', async () => {
        await main([root, '--exclude', 'coverage', '--exclude', 'scripts', '--compact'], cap)
        const index = JSON.parse(cap.output())
        expect(Object.keys(index)).not.toContain('src/coverage/report.js')
        expect(Object.keys(index)).not.toContain('src/scripts/build.js')
        expect(Object.keys(index)).toContain('src/app.js')
      })
    })
  })
})
