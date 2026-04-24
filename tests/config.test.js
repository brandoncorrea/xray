import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadConfig, DEFAULTS } from '../src/config.js'

describe('loadConfig', () => {
  it('returns defaults when no config file exists', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'xray-cfg-'))
    try {
      const config = await loadConfig(dir)
      expect(config).toEqual(DEFAULTS)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('loads and merges config from xray.config.js', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'xray-cfg-'))
    try {
      writeFileSync(join(dir, 'xray.config.js'), `
export default {
  extensions: ['.js', '.jsx'],
  exclude: ['coverage/'],
}
`)
      const config = await loadConfig(dir)
      expect(config.extensions).toEqual(['.js', '.jsx'])
      expect(config.exclude).toEqual(['coverage/'])
      expect(config.testPatterns).toEqual(DEFAULTS.testPatterns)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('returns defaults when config file exists but lacks default export', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'xray-cfg-'))
    try {
      writeFileSync(join(dir, 'xray.config.js'), `
export const extensions = ['.ts']
`)
      const config = await loadConfig(dir)
      expect(config).toEqual(DEFAULTS)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('loads include from config', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'xray-cfg-'))
    try {
      writeFileSync(join(dir, 'xray.config.js'), `
export default {
  include: ['src', 'shared'],
}
`)
      const config = await loadConfig(dir)
      expect(config.include).toEqual(['src', 'shared'])
      expect(config.extensions).toEqual(DEFAULTS.extensions)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('includes TypeScript extensions in defaults', async () => {
    expect(DEFAULTS.extensions).toContain('.ts')
    expect(DEFAULTS.extensions).toContain('.tsx')
  })

  it('config values replace defaults (not merge)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'xray-cfg-'))
    try {
      writeFileSync(join(dir, 'xray.config.js'), `
export default {
  extensions: ['.ts', '.tsx'],
}
`)
      const config = await loadConfig(dir)
      expect(config.extensions).toEqual(['.ts', '.tsx'])
      expect(config.exclude).toEqual(DEFAULTS.exclude)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })
})
