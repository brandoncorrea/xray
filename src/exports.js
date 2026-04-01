import { readFileSync } from 'node:fs'
import { Parser } from 'acorn'
import acornJsx from 'acorn-jsx'

const jsxParser = Parser.extend(acornJsx())

function nameFromDeclaration(declaration) {
  if (!declaration) return []
  switch (declaration.type) {
    case 'VariableDeclaration':
      return declaration.declarations.map(d => d.id.name)
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
      return declaration.id ? [declaration.id.name] : []
    default:
      return []
  }
}

export function extractExports(filePath) {
  const source = readFileSync(filePath, 'utf-8')
  const isJsx = filePath.endsWith('.jsx') || filePath.endsWith('.tsx')
  const parser = isJsx ? jsxParser : Parser

  let ast
  try {
    ast = parser.parse(source, {
      sourceType: 'module',
      ecmaVersion: 'latest',
    })
  } catch {
    return []
  }

  const exports = []
  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        exports.push(...nameFromDeclaration(node.declaration))
      }
      for (const spec of node.specifiers) {
        const name = spec.exported.name ?? spec.exported.value
        exports.push(name)
      }
    }
  }
  return exports
}
