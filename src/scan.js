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

function toRelPath(path) {
  return `src/${path}`
}

async function buildIndex(directory, srcDir, config) {
  const res = await madge(srcDir)
  const graph = res.obj()
  const index = {}

  for (const file of Object.keys(graph)) {
    const relPath = toRelPath(file)
    const absPath = join(directory, relPath)
    index[relPath] = {
      exports: extractExports(absPath),
      dependencies: graph[file].map(toRelPath),
      dependents: res.depends(file).map(toRelPath),
      tests: findTestFiles(relPath, directory),
      lines: getLineCount(absPath)
    }
  }

  return index
}

export async function scan(directory) {
  const config = await loadConfig(directory)
  const srcDir = join(directory, 'src')
  if (existsSync(srcDir))
    return buildIndex(directory, srcDir, config)
  return {}
}
