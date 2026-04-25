import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/scan.js', () => ({
  scan: () => ({
    'src/zebra.js': { exports: [], dependencies: [] },
    'src/alpha.js': { exports: [], dependencies: [] }
  })
}))

vi.mock('../src/config.js', () => ({
  loadConfig: async () => ({
    extensions: ['.js'],
    exclude: [],
    include: [],
    testPatterns: []
  })
}))

import { main } from '../src/cli-core.js'

function captureOutput() {
  const chunks = []
  return {
    write(json) { chunks.push(json) },
    output: () => chunks.join('')
  }
}

describe('--files-only sort', () => {
  it('sorts file paths alphabetically regardless of insertion order', async () => {
    const cap = captureOutput()
    await main(['.', '--files-only', '--compact'], cap)
    const result = JSON.parse(cap.output())
    expect(result).toEqual(['src/alpha.js', 'src/zebra.js'])
  })
})
