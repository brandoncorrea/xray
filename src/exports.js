import { readFileSync } from 'node:fs'
import { Parser } from 'acorn'
import acornJsx from 'acorn-jsx'

const JSX_EXTENSIONS = ['.jsx', '.tsx']
const jsxParser = Parser.extend(acornJsx())
const PARSER_OPTIONS = {
  sourceType: 'module',
  ecmaVersion: 'latest'
}

export function extractExports(filePath) {
  const ast = loadAstBody(filePath)
  const result = { exports: [], reExports: [] }
  for (const node of ast)
    collectExports(result, node)
  return result
}

function loadAstBody(filePath) {
  try {
    return parseAstBody(filePath)
  } catch (err) {
    process.stderr.write(`xray: warning: failed to parse ${filePath}: ${err.message}\n`)
    return []
  }
}

function parseAstBody(filePath) {
  const source = readFileSync(filePath, 'utf-8')
  const parser = isJsx(filePath) ? jsxParser : Parser
  return parser.parse(source, PARSER_OPTIONS).body
}

function nameFromDeclaration({ type, declarations, id }) {
  if (type === 'VariableDeclaration')
    return declarations.map(d => d.id.name)
  return [id.name]
}

function isJsx(path) {
  return JSX_EXTENSIONS.some(ext => path.endsWith(ext))
}

function collectExports(result, node) {
  const { type, source } = node
  if (type === 'ExportNamedDeclaration')
    collectNamedExports(result, node)
  else if (type === 'ExportDefaultDeclaration')
    result.exports.push('default')
  else if (type === 'ExportAllDeclaration')
    result.reExports.push(source.value)
}

function collectNamedExports(result, { declaration, specifiers }) {
  if (declaration)
    result.exports.push(...nameFromDeclaration(declaration))
  for (const { exported } of specifiers)
    result.exports.push(exported.name || exported.value)
}
