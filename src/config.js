import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULTS = {
  extensions: ['.js'],
  exclude: [],
  testPatterns: ['tests/**/*.test.*', '**/*.test.*'],
}

export async function loadConfig(dir) {
  const configPath = join(dir, 'xray.config.js')
  if (!existsSync(configPath))
    return { ...DEFAULTS }

  const url = pathToFileURL(configPath).href
  const mod = await import(url)
  const userConfig = mod.default || {}

  return { ...DEFAULTS, ...userConfig }
}
