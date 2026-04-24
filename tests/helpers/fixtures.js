import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import graph, { createMemoryGraph } from '../../src/graph.js'

function parseImports(content, filePath) {
  const imports = []
  const regex = /import\s.*?from\s+['"](\.[^'"]+)['"]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const resolved = join(dirname(filePath), match[1]).replaceAll('\\', '/')
    imports.push(resolved)
  }
  return imports
}

export function setupFixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'xray-test-'))
  const raw = {}

  for (const [filePath, content] of Object.entries(files)) {
    const full = join(root, filePath)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content)
    raw[filePath] = parseImports(content, filePath)
  }

  graph.configure(createMemoryGraph(raw))

  return root
}
