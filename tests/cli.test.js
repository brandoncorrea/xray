import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/cli-core.js', () => ({
  run: vi.fn(async () => {})
}))

describe('cli.js entry point', () => {
  it('awaits run with process', async () => {
    const { run } = await import('../src/cli-core.js')
    await import('../src/cli.js')
    expect(run).toHaveBeenCalledWith(process)
  })
})
