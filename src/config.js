import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULTS = {
  extensions: ['.js', '.jsx'],
  exclude: [],
  testPatterns: ['tests/**/*.test.*', '**/*.test.*']
}

async function buildUserConfig(configPath) {
  const url = pathToFileURL(configPath).href
  const mod = await import(url)
  return mod.default || {}
}

export async function loadConfig(dir) {
  const configPath = join(dir, 'xray.config.js')
  if (!existsSync(configPath))
    return { ...DEFAULTS }

  const userConfig = await buildUserConfig(configPath)

  return { ...DEFAULTS, ...userConfig }
}
