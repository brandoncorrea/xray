import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/scan.js', () => ({
  scan: () => ({
    'src/zebra.js': { exports: [], dependencies: [], dependents: ['src/alpha.js'], tests: ['tests/z.test.js'] },
    'src/alpha.js': { exports: [], dependencies: ['src/zebra.js'], dependents: [], tests: ['tests/a.test.js'] }
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

describe('output sorting', () => {
  it('--files-only sorts file paths alphabetically', async () => {
    const cap = captureOutput()
    await main(['.', '--files-only', '--compact'], cap)
    const result = JSON.parse(cap.output())
    expect(result).toEqual(['src/alpha.js', 'src/zebra.js'])
  })

  it('default output sorts keys alphabetically', async () => {
    const cap = captureOutput()
    await main(['.', '--compact'], cap)
    const result = JSON.parse(cap.output())
    expect(Object.keys(result)).toEqual(['src/alpha.js', 'src/zebra.js'])
  })

  it('--tests-for sorts test file paths alphabetically', async () => {
    const cap = captureOutput()
    await main(['.', '--tests-for', 'src/zebra.js', '--compact'], cap)
    const result = JSON.parse(cap.output())
    expect(result).toEqual(['tests/a.test.js', 'tests/z.test.js'])
  })
})
