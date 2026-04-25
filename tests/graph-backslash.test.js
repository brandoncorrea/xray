import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { rmSync } from 'node:fs'
import { setupFixture } from './helpers/fixtures.js'

vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path')
  return {
    ...actual,
    normalize: p => actual.normalize(p).replaceAll('/', '\\')
  }
})

describe('graph backslash normalization', () => {
  let root

  beforeAll(() => {
    root = setupFixture({
      'src/app.js': [
        "import { helper } from './utils/helper.js'",
        'export function main() { return helper() }'
      ].join('\n'),
      'src/utils/helper.js': 'export function helper() {}\n'
    })
  })

  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('converts backslash separators from normalize to forward slashes', async () => {
    // Re-import scan after mock is active so graph.js picks up mocked normalize
    const { scan } = await import('../src/scan.js')
    const { DEFAULTS } = await import('../src/config.js')
    const result = scan(root, {}, { ...DEFAULTS })
    expect(result['src/app.js'].dependencies).toEqual(['src/utils/helper.js'])
  })
})
