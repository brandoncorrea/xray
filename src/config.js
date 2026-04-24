import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DEFAULT_TEST_PATTERNS } from './testFiles.js'

export const DEFAULTS = {
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  exclude: [],
  include: [],
  testPatterns: DEFAULT_TEST_PATTERNS
}

export async function loadConfig(dir) {
  const configPath = join(dir, 'xray.config.js')
  if (!existsSync(configPath))
    return { ...DEFAULTS }

  const userConfig = await buildUserConfig(configPath)

  return { ...DEFAULTS, ...userConfig }
}

async function buildUserConfig(configPath) {
  const url = pathToFileURL(configPath).href
  const mod = await import(url)
  return mod.default || {}
}
