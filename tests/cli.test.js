import { describe, it, expect, vi } from 'vitest'
import { main } from '../src/cli-core.js'
import output from '../src/output.js'

describe('cli entry point', () => {
  it('main prints help to output.log', async () => {
    const spy = vi.spyOn(output, 'log')
    try {
      const code = await main(['--help'])
      expect(code).toBe(0)
      expect(spy.mock.calls[0][0]).toContain('Usage: xray')
    } finally {
      spy.mockRestore()
    }
  })
})
