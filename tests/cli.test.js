import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/cli-core.js', () => ({
  run: vi.fn(async () => {})
}))

import { run } from '../src/cli-core.js'

describe('cli.js entry point', () => {
  it('awaits run with process', async () => {
    await import('../src/cli.js')
    expect(run).toHaveBeenCalledWith(process)
  })
})
