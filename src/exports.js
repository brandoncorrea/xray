import { readFileSync } from 'node:fs'

const DECLARATION_RE = /^export\s+(?:async\s+)?(?:const|let|var|function|class)\s+(\w+)/
const NAMED_LIST_RE = /^export\s*\{([^}]+)\}/

function shouldIgnoreLine(line) {
  return line.startsWith('//') || line.startsWith('export default')
}

function exportFromListEntry(entry) {
  const parts = entry.trim().split(/\s+as\s+/)
  const part = parts.length > 1 ? 1 : 0
  return parts[part].trim()
}

function exportsFromNamedList(listMatch) {
  return listMatch[1]
    .split(',')
    .map(exportFromListEntry)
}

function exportsFromLine(line) {
  const trimmed = line.trim()

  if (shouldIgnoreLine(trimmed)) return

  const declMatch = trimmed.match(DECLARATION_RE)
  if (declMatch)
    return [declMatch[1]]

  const listMatch = trimmed.match(NAMED_LIST_RE)
  if (listMatch)
    return exportsFromNamedList(listMatch)
}

export function extractExports(filePath) {
  return readFileSync(filePath, 'utf-8')
    .split('\n')
    .map(exportsFromLine)
    .filter(Boolean)
    .reduce((all, exports) => [...all, ...exports], [])
}
