import { join } from 'node:path'

export async function buildDependencyGraph(baseDir, config) {
  const options = madgeOptions(baseDir, config)
  const raw = await createMadgeObj(options)
  return filterGraph(raw, config)
}

function madgeOptions(baseDir, config) {
  const target = scanTarget(baseDir, config.include)
  const excludeRegExp = config.exclude.map(toExcludeRegExp)
  const fileExtensions = extensionList(config)
  return { target, baseDir, fileExtensions, excludeRegExp }
}

async function createMadgeObj({ target, ...config }) {
  const { default: madge } = await import('madge')
  const res = await madge(target, config)
  return res.obj()
}

export function filterGraph(raw, config) {
  const graph = compileGraph(raw, config)
  const graphKeys = Object.keys(graph)
  return {
    files: () => graphKeys,
    dependencies: file => graph[file] || [],
    dependents: file => graphKeys.filter(k => graph[k].includes(file))
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
