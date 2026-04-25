import { readFileSync } from 'node:fs'
import { Parser } from 'acorn'
import acornJsx from 'acorn-jsx'
import output from './output.js'

const JSX_EXTENSIONS = ['.jsx', '.tsx']
export const jsxParser = Parser.extend(acornJsx())
const PARSER_OPTIONS = { sourceType: 'module', ecmaVersion: 'latest' }

export function analyzeFile(filePath) {
  const ast = parseFileAst(filePath)
  const exports = []
  const reExports = []
  const imports = []

  for (const node of ast) {
    if (node.type === 'ImportDeclaration')
      imports.push(node.source.value)
    else if (node.type === 'ExportNamedDeclaration') {
      collectNamedExports(exports, node)
      if (node.source)
        imports.push(node.source.value)
    } else if (node.type === 'ExportDefaultDeclaration')
      exports.push('default')
    else if (node.type === 'ExportAllDeclaration') {
      reExports.push(node.source.value)
      imports.push(node.source.value)
    }
  }

  return { exports, reExports, imports }
}

export function selectParser(filePath) {
  return isJsx(filePath) ? jsxParser : Parser
}

function parseFileAst(filePath) {
  try {
    const source = readFileSync(filePath, 'utf-8')
    return selectParser(filePath).parse(source, PARSER_OPTIONS).body
  } catch (err) {
    output.error(`xray: warning: failed to parse ${filePath}: ${err.message}\n`)
    return []
  }
}

function collectNamedExports(exports, node) {
  if (node.declaration)
    exports.push(...nameFromDeclaration(node.declaration))
  for (const { exported } of node.specifiers)
    exports.push(exported.name || exported.value)
}

function nameFromDeclaration({ type, declarations, id }) {
  if (type === 'VariableDeclaration')
    return declarations.map(d => d.id.name)
  return [id.name]
}

function isJsx(path) {
  return JSX_EXTENSIONS.some(ext => path.endsWith(ext))
}
