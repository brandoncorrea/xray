import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import madge from 'madge'
import { extractExports } from './exports.js'
import { findTestFiles } from './testFiles.js'
import { loadConfig } from './config.js'

function getLineCount(path) {
  const content = readFileSync(path, 'utf-8')
  if (content === '') return 0
  const lines = content.split('\n')
  return content.endsWith('\n') ? lines.length - 1 : lines.length
}

function toExcludeRegExp(exclusion) {
  return new RegExp(`(^|/)${exclusion}/`)
}

export function buildExcludeRegExp(patterns) {
  return patterns.map(toExcludeRegExp)
}

async function buildIndex(baseDir, srcDir, config) {
  const excludeRegExp = buildExcludeRegExp(config.exclude)
  const fileExtensions = config.extensions.map(e => e.replace(/^\./, ''))
  const madgeOpts = { baseDir, fileExtensions }
  if (excludeRegExp.length) madgeOpts.excludeRegExp = excludeRegExp
  const res = await madge(srcDir, madgeOpts)
  const graph = res.obj()
  const index = {}

  for (const file of Object.keys(graph)) {
    const absPath = join(baseDir, file)
    index[file] = {
      exports: extractExports(absPath),
      dependencies: graph[file],
      dependents: res.depends(file),
      tests: findTestFiles(file, baseDir),
      lines: getLineCount(absPath)
    }
  }

  return index
}

function distinctConcat(coll1, coll2) {
  return [...new Set([...coll1, ...coll2])]
}

export async function scan(directory, options = {}) {
  const config = await loadConfig(directory)
  if (options.exclude?.length)
    config.exclude = distinctConcat(config.exclude, options.exclude)
  return buildIndex(directory, directory, config)
}
