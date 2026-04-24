import { join } from 'node:path'

async function madgeAnalyze(baseDir, config) {
  const target = scanTarget(baseDir, config.include)
  const excludeRegExp = config.exclude.map(toExcludeRegExp)
  const fileExtensions = extensionList(config)
  const { default: madge } = await import('madge')
  const res = await madge(target, { baseDir, fileExtensions, excludeRegExp })
  return wrapGraph(compileGraph(res.obj(), config))
}

export function createMemoryGraph(raw) {
  return {
    analyze: async (_baseDir, config) => wrapGraph(compileGraph(raw, config))
  }
}

let impl = { analyze: madgeAnalyze }

export default {
  analyze: (baseDir, config) => impl.analyze(baseDir, config),
  configure: newImpl => { impl = newImpl }
}

function wrapGraph(graph) {
  const keys = Object.keys(graph)
  return {
    files: () => keys,
    dependencies: file => graph[file] || [],
    dependents: file => keys.filter(k => graph[k].includes(file))
  }
}

function compileGraph(raw, config) {
  const fileExtensions = extensionList(config)
  const excludeRegExp = config.exclude.map(toExcludeRegExp)
  const graph = {}
  for (const file of Object.keys(raw))
    if (shouldIncludeFile(file, fileExtensions, excludeRegExp, config))
      graph[file] = raw[file]
  return graph
}

function shouldIncludeFile(file, fileExtensions, excludeRegExp, config) {
  return hasExtension(file, fileExtensions)
    && !excludeRegExp.some(re => re.test(file))
    && matchesInclude(file, config.include)
}

function extensionList(config) {
  return config.extensions.map(e => e.replace(/^\./, ''))
}

function hasExtension(file, extensions) {
  return extensions.some(ext => file.endsWith('.' + ext))
}

function matchesInclude(file, include) {
  return !include.length
    || include.some(dir => file.startsWith(dir + '/') || file === dir)
}

function toExcludeRegExp(exclusion) {
  return new RegExp(`(^|/)${exclusion}/`)
}

function scanTarget(baseDir, include) {
  if (!include.length) return baseDir
  return include.map(d => join(baseDir, d))
}
