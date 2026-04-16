import { describe, it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const cli = join(__dirname, '..', 'src', 'cli.js')

function run(...args) {
  return exec('node', [cli, ...args])
}

describe('cli binary (end-to-end)', () => {
  it('entry point wires up to main and prints help', async () => {
    const { stdout } = await run('--help')
    expect(stdout).toContain('Usage: xray')
    expect(stdout).not.toContain('{')
  })
})
