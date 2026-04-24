import { parseFileAst } from './parser.js'

export function extractExports(filePath) {
  const ast = parseFileAst(filePath)
  const result = { exports: [], reExports: [] }
  for (const node of ast)
    collectExports(result, node)
  return result
}

function nameFromDeclaration({ type, declarations, id }) {
  if (type === 'VariableDeclaration')
    return declarations.map(d => d.id.name)
  return [id.name]
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
