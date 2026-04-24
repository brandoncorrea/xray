import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractExports } from './exports.js'
import { findTestFiles } from './testFiles.js'
import { loadConfig } from './config.js'
import { buildGraph } from './graph.js'

export async function scan(directory, options = {}) {
  const config = await loadConfig(directory)
  if (options.include?.length)
    config.include = options.include
  if (options.exclude?.length)
    config.exclude = distinctConcat(config.exclude, options.exclude)
  const graph = buildGraph(directory, config)
  return buildIndex(directory, graph, config.testPatterns)
}

function buildIndex(baseDir, graph, testPatterns) {
  const index = {}
  for (const file of graph.files()) {
    const absPath = join(baseDir, file)
    const { exports, reExports } = extractExports(absPath)
    index[file] = {
      exports,
      reExports,
      dependencies: graph.dependencies(file),
      dependents: graph.dependents(file),
      tests: findTestFiles(file, baseDir, testPatterns),
      lines: getLineCount(absPath)
    }
  }
  return index
}

function distinctConcat(coll1, coll2) {
  return [...new Set([...coll1, ...coll2])]
}

function getLineCount(path) {
  const content = readFileSync(path, 'utf-8')
  if (!content) return 0
  const lines = content.split('\n')
  return content.endsWith('\n') ? lines.length - 1 : lines.length
}
