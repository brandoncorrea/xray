import { analyzeFile } from './parser.js'

export function extractExports(filePath) {
  const { exports, reExports } = analyzeFile(filePath)
  return { exports, reExports }
}
