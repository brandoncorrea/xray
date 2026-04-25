import { describe, it, expect, vi } from 'vitest'
import { run } from '../src/cli-core.js'
import output from '../src/output.js'

function fakeProcess(...args) {
  return {
    argv: ['node', 'cli.js', ...args],
    exit: vi.fn()
  }
}

describe('run', () => {
  it('passes argv.slice(2) to main and exits with the result', async () => {
    const spy = vi.spyOn(output, 'log').mockImplementation(() => {})
    const proc = fakeProcess('--help')
    try {
      await run(proc)
      expect(spy.mock.calls[0][0]).toContain('Usage: xray')
      expect(proc.exit).toHaveBeenCalledWith(0)
    } finally {
      spy.mockRestore()
    }
  })

  it('slices argv at index 2, not 1', async () => {
    const spy = vi.spyOn(output, 'log').mockImplementation(() => {})
    // argv[1] is '--help', but slice(2) should skip it
    const proc = { argv: ['node', '--help'], exit: vi.fn() }
    try {
      await run(proc)
      expect(spy.mock.calls[0][0]).not.toContain('Usage: xray')
      expect(proc.exit).toHaveBeenCalledWith(0)
    } finally {
      spy.mockRestore()
    }
  })
})
