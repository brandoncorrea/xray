import { describe, it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const exec = promisify(execFile)
const cliPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js')

describe('cli entry point', () => {
  it('prints help and exits 0', async () => {
    const { stdout } = await exec('node', [cliPath, '--help'])
    expect(stdout).toContain('Usage: xray')
  })

  it('argv is sliced at index 2, not 1', async () => {
    // slice(2) → ['--compact'] → scans empty cwd → outputs '{}\n', exits 0
    // slice(1) → ['/path/to/cli.js', '--compact'] → treats cli.js path as dir → ENOTDIR crash
    const tmp = mkdtempSync(join(tmpdir(), 'xray-cli-'))
    try {
      const { stdout } = await exec('node', [cliPath, '--compact'], { cwd: tmp })
      expect(stdout.trim()).toBe('{}')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
