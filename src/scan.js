import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractExports } from './exports.js'
import { findTestFiles } from './testFiles.js'
import { loadConfig } from './config.js'

export async function scan(directory, options = {}) {
  const config = await loadConfig(directory)
  if (options.include?.length)
    config.include = options.include
  if (options.exclude?.length)
    config.exclude = distinctConcat(config.exclude, options.exclude)
  return buildIndex(directory, config, options.buildGraph)
}

async function madgeBuildGraph(target, opts) {
  const { default: madge } = await import('madge')
  return madge(target, opts)
}

async function buildIndex(baseDir, config, buildGraph) {
  const excludeRegExp = config.exclude.map(toExcludeRegExp)
  const fileExtensions = config.extensions.map(e => e.replace(/^\./, ''))
  const madgeOpts = { baseDir, fileExtensions, excludeRegExp }
  const target = scanTarget(baseDir, config.include)
  const res = buildGraph
    ? await buildGraph()
    : await madgeBuildGraph(target, madgeOpts)
  const graph = res.obj()
  const index = {}

  for (const file of Object.keys(graph)) {
    if (!hasExtension(file, fileExtensions)) continue
    if (excludeRegExp.some(re => re.test(file))) continue
    if (!matchesInclude(file, config.include)) continue
    const absPath = join(baseDir, file)
    const { exports, reExports } = extractExports(absPath)
    index[file] = {
      exports,
      reExports,
      dependencies: graph[file],
      dependents: res.depends(file),
      tests: findTestFiles(file, baseDir, config.testPatterns),
      lines: getLineCount(absPath)
    }
  }

  return index
}

function distinctConcat(coll1, coll2) {
  return [...new Set([...coll1, ...coll2])]
}

function hasExtension(file, extensions) {
  return extensions.some(ext => file.endsWith('.' + ext))
}

function matchesInclude(file, include) {
  if (!include.length) return true
  return include.some(dir => file.startsWith(dir + '/') || file === dir)
}

function toExcludeRegExp(exclusion) {
  return new RegExp(`(^|/)${exclusion}/`)
}

function scanTarget(baseDir, include) {
  if (!include.length) return baseDir
  return include.map(d => join(baseDir, d))
}

function getLineCount(path) {
  const content = readFileSync(path, 'utf-8')
  if (!content) return 0
  const lines = content.split('\n')
  return content.endsWith('\n') ? lines.length - 1 : lines.length
}
