import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import madge from 'madge'
import { extractExports } from './exports.js'
import { findTestFiles } from './testFiles.js'
import { loadConfig } from './config.js'

function getLineCount(path) {
  const content = readFileSync(path, 'utf-8')
  return content === '' ? 0
    : content.endsWith('\n') ? content.split('\n').length - 1
    : content.split('\n').length
}

function buildExcludeRegExp(patterns) {
  if (!patterns.length) return undefined
  return patterns.map(p => new RegExp(`(^|/)${p}/`))
}


async function buildIndex(directory, srcDir, config) {
  const excludeRegExp = buildExcludeRegExp(config.exclude || [])
  const fileExtensions = config.extensions.map(e => e.replace(/^\./, ''))
  const madgeOpts = { baseDir: directory, fileExtensions }
  if (excludeRegExp) madgeOpts.excludeRegExp = excludeRegExp
  const res = await madge(srcDir, madgeOpts)
  const graph = res.obj()
  const index = {}

  for (const file of Object.keys(graph)) {
    if (!file.startsWith('src/')) continue
    const absPath = join(directory, file)
    index[file] = {
      exports: extractExports(absPath),
      dependencies: graph[file],
      dependents: res.depends(file),
      tests: findTestFiles(file, directory),
      lines: getLineCount(absPath)
    }
  }

  return index
}

export async function scan(directory, options = {}) {
  const config = await loadConfig(directory)
  if (options.exclude && options.exclude.length)
    config.exclude = [...new Set([...config.exclude, ...options.exclude])]
  const srcDir = join(directory, 'src')
  if (existsSync(srcDir))
    return buildIndex(directory, srcDir, config)
  return {}
}
