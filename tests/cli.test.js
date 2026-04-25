import { describe, it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const exec = promisify(execFile)
const cliPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js')

describe('cli.js entry point', () => {
  it('wires up to run and prints help', async () => {
    const { stdout } = await exec('node', [cliPath, '--help'])
    expect(stdout).toContain('Usage: xray')
  })
})
