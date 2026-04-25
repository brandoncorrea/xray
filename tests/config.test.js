import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadConfig, DEFAULTS } from '../src/config.js'

function writeConfig(dir, content) {
  writeFileSync(join(dir, 'xray.config.js'), content)
}

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), 'xray-cfg-'))
}

function rmdir(dir) {
  rmSync(dir, { recursive: true })
}

async function loadConfigFromFile(content) {
  const dir = makeTempDir()
  try {
    if (content != null) writeConfig(dir, content)
    return await loadConfig(dir)
  } finally {
    rmdir(dir)
  }
}

describe('loadConfig', () => {
  it('returns defaults when no config file exists', async () => {
    const config = await loadConfigFromFile()
    expect(config).toEqual(DEFAULTS)
  })

  it('loads and merges config from xray.config.js', async () => {
    const config = await loadConfigFromFile(`
export default {
  extensions: ['.js', '.jsx'],
  exclude: ['coverage/'],
}
`)
    expect(config.extensions).toEqual(['.js', '.jsx'])
    expect(config.exclude).toEqual(['coverage/'])
    expect(config.testPatterns).toEqual(DEFAULTS.testPatterns)
  })

  it('returns defaults when config file exists but lacks default export', async () => {
    const config = await loadConfigFromFile(`
export const extensions = ['.ts']
`)
    expect(config).toEqual(DEFAULTS)
  })

  it('loads include from config', async () => {
    const config = await loadConfigFromFile(`
export default {
  include: ['src', 'shared'],
}
`)
    expect(config.include).toEqual(['src', 'shared'])
    expect(config.extensions).toEqual(DEFAULTS.extensions)
  })

  it('includes TypeScript extensions in defaults', async () => {
    expect(DEFAULTS.extensions).toContain('.ts')
    expect(DEFAULTS.extensions).toContain('.tsx')
  })

  it('defaults exclude to an empty array', () => {
    expect(DEFAULTS.exclude).toEqual([])
  })

  it('returns a copy of defaults, not the original object', async () => {
    const config = await loadConfigFromFile()
    config.include = ['mutated']
    const fresh = await loadConfigFromFile()
    expect(fresh.include).toEqual([])
  })

  it('config values replace defaults (not merge)', async () => {
    const config = await loadConfigFromFile(`
export default {
  extensions: ['.ts', '.tsx'],
}
`)
    expect(config.extensions).toEqual(['.ts', '.tsx'])
    expect(config.exclude).toEqual(DEFAULTS.exclude)
  })
})
