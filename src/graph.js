import { join } from 'node:path'

export async function buildDependencyGraph(baseDir, config) {
  const target = scanTarget(baseDir, config.include)
  const excludeRegExp = config.exclude.map(toExcludeRegExp)
  const fileExtensions = extensionList(config)
  const { default: madge } = await import('madge')
  const res = await madge(target, { baseDir, fileExtensions, excludeRegExp })
  return filterGraph(res.obj(), config)
}

export function filterGraph(raw, config) {
  const fileExtensions = extensionList(config)
  const excludeRegExp = config.exclude.map(toExcludeRegExp)
  const graph = {}
  for (const file of Object.keys(raw)) {
    if (!hasExtension(file, fileExtensions)) continue
    if (excludeRegExp.some(re => re.test(file))) continue
    if (!matchesInclude(file, config.include)) continue
    graph[file] = raw[file]
  }
  return {
    files: () => Object.keys(graph),
    dependencies: (file) => graph[file] || [],
    dependents: (file) => Object.keys(graph).filter(k => graph[k].includes(file))
  }
}

function extensionList(config) {
  return config.extensions.map(e => e.replace(/^\./, ''))
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
