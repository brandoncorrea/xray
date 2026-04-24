import { readFileSync } from 'node:fs'
import { Parser } from 'acorn'
import acornJsx from 'acorn-jsx'
import output from './output.js'

const JSX_EXTENSIONS = ['.jsx', '.tsx']
const jsxParser = Parser.extend(acornJsx())
const PARSER_OPTIONS = { sourceType: 'module', ecmaVersion: 'latest' }

export function parseFileAst(filePath) {
  try {
    return parseAstBody(filePath)
  } catch(err) {
    output.error(`xray: warning: failed to parse ${filePath}: ${err.message}\n`)
    return []
  }
}

function parseAstBody(filePath) {
  const source = readFileSync(filePath, 'utf-8')
  const parser = isJsx(filePath) ? jsxParser : Parser
  return parser.parse(source, PARSER_OPTIONS).body
}

function isJsx(path) {
  return JSX_EXTENSIONS.some(ext => path.endsWith(ext))
}
