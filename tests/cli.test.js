import { describe, it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { rmSync } from 'node:fs'
import { setupFixture } from './helpers/fixtures.js'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const cli = join(__dirname, '..', 'src', 'cli.js')

function run(...args) {
  return exec('node', [cli, ...args])
}

describe('cli binary (end-to-end)', () => {
  it('runs as executable and prints help', async () => {
    const { stdout } = await run('--help')
    expect(stdout).toContain('Usage: xray')
  })

  it('runs a scan and produces valid JSON', async () => {
    let root
    try {
      root = setupFixture({
        'src/math.js': 'export function add(a, b) { return a + b }\n'
      })
      const { stdout } = await run(root)
      const index = JSON.parse(stdout)
      expect(index['src/math.js']).toBeDefined()
    } finally {
      if (root) rmSync(root, { recursive: true, force: true })
    }
  })

  it('prints version', async () => {
    const { stdout } = await run('--version')
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
