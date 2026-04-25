import { describe, it, expect, vi } from 'vitest'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const cliPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js')

vi.mock('../src/cli-core.js', () => ({
  run: vi.fn(async () => {})
}))

describe('cli.js entry point', () => {
  it('awaits run with process', async () => {
    const { run } = await import('../src/cli-core.js')
    await import(pathToFileURL(cliPath).href + '?t=' + Date.now())
    expect(run).toHaveBeenCalledWith(process)
  })
})
