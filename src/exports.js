import { readFileSync } from 'node:fs'
import { Parser } from 'acorn'
import acornJsx from 'acorn-jsx'

const jsxParser = Parser.extend(acornJsx())

function nameFromDeclaration({ type, declarations, id }) {
  if (type === 'VariableDeclaration')
    return declarations.map(d => d.id.name)
  return [id.name]
}

function isJsx(path) {
  return path.endsWith('.jsx') || path.endsWith('.tsx')
}

export function extractExports(filePath) {
  const source = readFileSync(filePath, 'utf-8')
  const parser = isJsx(filePath) ? jsxParser : Parser

  let ast
  try {
    ast = parser.parse(source, {
      sourceType: 'module',
      ecmaVersion: 'latest'
    })
  } catch (err) {
    process.stderr.write(`xray: warning: failed to parse ${filePath}: ${err.message}\n`)
    return { exports: [], reExports: [] }
  }

  const exports = []
  const reExports = []
  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration)
        exports.push(...nameFromDeclaration(node.declaration))
      for (const spec of node.specifiers) {
        const name = spec.exported.name || spec.exported.value
        exports.push(name)
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      exports.push('default')
    } else if (node.type === 'ExportAllDeclaration') {
      reExports.push(node.source.value)
    }
  }
  return { exports, reExports }
}
