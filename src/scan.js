import { join } from 'node:path'
import { findTestFiles } from './testFiles.js'
import { buildGraph } from './graph.js'

export function scan(directory, options, config) {
  const merged = { ...config }
  if (options.include?.length)
    merged.include = options.include
  if (options.exclude?.length)
    merged.exclude = distinctConcat(config.exclude, options.exclude)
  const graph = buildGraph(directory, merged)
  return buildIndex(directory, graph, merged.testPatterns)
}

function buildIndex(baseDir, graph, testPatterns) {
  const index = {}
  for (const file of graph.files())
    index[file] = compileFileInfo(baseDir, graph, testPatterns, file)
  return index
}

function compileFileInfo(baseDir, graph, testPatterns, file) {
  const { exports, reExports } = graph.fileExports(file)
  return {
    exports,
    reExports,
    dependencies: graph.dependencies(file),
    dependents: graph.dependents(file),
    tests: findTestFiles(file, baseDir, testPatterns),
    lines: graph.lines(file)
  }
}

function distinctConcat(coll1, coll2) {
  return [...new Set([...coll1, ...coll2])]
}
