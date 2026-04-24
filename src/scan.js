import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findTestFiles } from './testFiles.js'
import { buildGraph } from './graph.js'

export function scan(directory, options, config) {
  if (options.include?.length)
    config.include = options.include
  if (options.exclude?.length)
    config.exclude = distinctConcat(config.exclude, options.exclude)
  const graph = buildGraph(directory, config)
  return buildIndex(directory, graph, config.testPatterns)
}

function buildIndex(baseDir, graph, testPatterns) {
  const index = {}
  for (const file of graph.files())
    index[file] = compileFileInfo(baseDir, graph, testPatterns, file)
  return index
}

function compileFileInfo(baseDir, graph, testPatterns, file) {
  const absPath = join(baseDir, file)
  const { exports, reExports } = graph.fileExports(file)
  return {
    exports,
    reExports,
    dependencies: graph.dependencies(file),
    dependents: graph.dependents(file),
    tests: findTestFiles(file, baseDir, testPatterns),
    lines: getLineCount(absPath)
  }
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
