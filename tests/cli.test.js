import { describe, it, expect, vi } from 'vitest'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import output from '../src/output.js'

const cliPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js')

describe('cli entry point', () => {
  it('passes process.argv to main and exits with its return code', async () => {
    const originalArgv = process.argv
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {})
    const log = vi.spyOn(output, 'log')
    try {
      process.argv = ['node', 'cli.js', '--help']
      await import(pathToFileURL(cliPath).href + '?t=' + Date.now())
      expect(log.mock.calls[0][0]).toContain('Usage: xray')
      expect(exit).toHaveBeenCalledWith(0)
    } finally {
      process.argv = originalArgv
      exit.mockRestore()
      log.mockRestore()
    }
  })
})
