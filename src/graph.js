import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname, normalize, relative } from 'node:path'
import { Parser } from 'acorn'
import acornJsx from 'acorn-jsx'

const JSX_EXTENSIONS = ['.jsx', '.tsx']
const jsxParser = Parser.extend(acornJsx())
const PARSER_OPTIONS = { sourceType: 'module', ecmaVersion: 'latest' }

export function buildGraph(baseDir, config) {
  const files = discoverFiles(baseDir, config)
  const graph = {}
  for (const file of files)
    graph[file] = extractImports(join(baseDir, file), baseDir)
  return wrapGraph(graph)
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
  const files = []
  walk(baseDir, '', config.extensions, excludeRegExp, config.include, files)
  return files
}

function walk(baseDir, relDir, extensions, excludeRegExp, include, result) {
  const absDir = relDir ? join(baseDir, relDir) : baseDir
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const relPath = relDir ? relDir + '/' + entry.name : entry.name
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      if (excludeRegExp.some(re => re.test(relPath + '/'))) continue
      walk(baseDir, relPath, extensions, excludeRegExp, include, result)
    } else if (isIncludedFile(relPath, extensions, excludeRegExp, include)) {
      result.push(relPath)
    }
  }
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
  const ast = parseFile(absPath)
  if (!ast) return []
  const rawImports = []
  for (const node of ast) {
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

function parseFile(absPath) {
  try {
    const source = readFileSync(absPath, 'utf-8')
    const parser = isJsx(absPath) ? jsxParser : Parser
    return parser.parse(source, PARSER_OPTIONS).body
  } catch {
    return null
  }
}

function isJsx(path) {
  return JSX_EXTENSIONS.some(ext => path.endsWith(ext))
}
