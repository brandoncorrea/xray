import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadConfig, DEFAULTS } from '../src/config.js'

describe('DEFAULTS', () => {
  it('has expected default values', () => {
    expect(DEFAULTS).toEqual({
      extensions: ['.js'],
      exclude: [],
      testPatterns: ['tests/**/*.test.*', '**/*.test.*']
    })
  })
})

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

  it('config values replace defaults (not merge)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'xray-cfg-'))
    try {
      writeFileSync(join(dir, 'xray.config.js'), `
export default {
  testPatterns: ['spec/**/*.spec.*'],
}
`)
      const config = await loadConfig(dir)
      expect(config.extensions).toEqual(DEFAULTS.extensions)
      expect(config.exclude).toEqual(DEFAULTS.exclude)
      expect(config.testPatterns).toEqual(['spec/**/*.spec.*'])
    } finally {
      rmSync(dir, { recursive: true })
    }
  })
})
