import { readdirSync } from 'node:fs'
import { join, dirname, normalize, relative } from 'node:path'
import { parseFileAst } from './parser.js'

export function buildGraph(baseDir, config) {
  return wrapGraph(compileSources(baseDir, config))
}

function compileSources(baseDir, config) {
  const graph = {}
  for (const file of discoverFiles(baseDir, config))
    graph[file] = extractImports(join(baseDir, file), baseDir)
  return graph
}

function wrapGraph(graph) {
  const keys = Object.keys(graph)
  return {
    files: () => keys,
    dependencies: file => graph[file] || [],
    dependents: file => keys.filter(k => graph[k].includes(file))
  }
}

function discoverFiles(baseDir, config) {
  const excludeRegExp = config.exclude.map(toExcludeRegExp)
  return walk(baseDir, '', config.extensions, excludeRegExp, config.include)
}

function walk(baseDir, relDir, extensions, excludeRegExp, include) {
  const files = []
  for (const entry of fileEntries(baseDir, relDir)) {
    const relPath = toRelativePath(relDir, entry.name)
    if (entry.isDirectory()) {
      if (isIncludedDirectory(entry, excludeRegExp, relPath))
        files.push(...walk(baseDir, relPath, extensions, excludeRegExp, include))
    } else if (isIncludedFile(relPath, extensions, excludeRegExp, include)) {
      files.push(relPath)
    }
  }
  return files
}

function fileEntries(baseDir, relDir) {
  const absDir = toAbsoluteDirectory(baseDir, relDir)
  return readdirSync(absDir, { withFileTypes: true })
}

function toAbsoluteDirectory(baseDir, relDir) {
  return relDir ? join(baseDir, relDir) : baseDir
}

function toRelativePath(relDir, entryName) {
  return relDir ? relDir + '/' + entryName : entryName
}

function isIncludedDirectory(entry, excludeRegExp, relPath) {
  return entry.name !== 'node_modules'
    && !excludeRegExp.some(re => re.test(relPath + '/'))
}

function isIncludedFile(relPath, extensions, excludeRegExp, include) {
  return hasExtension(relPath, extensions)
    && !excludeRegExp.some(re => re.test(relPath))
    && matchesInclude(relPath, include)
}

function hasExtension(file, extensions) {
  return extensions.some(ext => file.endsWith(ext))
}

function matchesInclude(file, include) {
  return !include.length
    || include.some(dir => file.startsWith(dir + '/') || file === dir)
}

function toExcludeRegExp(exclusion) {
  return new RegExp(`(^|/)${exclusion}/`)
}

function extractImports(absPath, baseDir) {
  const rawImports = []
  for (const node of parseFileAst(absPath)) {
    if (node.type === 'ImportDeclaration')
      rawImports.push(node.source.value)
    else if (node.type === 'ExportNamedDeclaration' && node.source)
      rawImports.push(node.source.value)
    else if (node.type === 'ExportAllDeclaration')
      rawImports.push(node.source.value)
  }
  return resolveImports(rawImports, absPath, baseDir)
}

function resolveImports(rawImports, absPath, baseDir) {
  const relDir = relative(baseDir, dirname(absPath))
  return rawImports
    .filter(imp => imp.startsWith('.'))
    .map(imp => normalize(join(relDir, imp)).replaceAll('\\', '/'))
    .filter(resolved => !resolved.startsWith('..'))
}
