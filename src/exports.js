import { readFileSync } from 'node:fs';

const DECLARATION_RE = /^export\s+(?:async\s+)?(?:const|let|var|function|class)\s+(\w+)/;
const NAMED_LIST_RE = /^export\s*\{([^}]+)\}/;

export function extractExports(filePath) {
  const source = readFileSync(filePath, 'utf-8');
  const lines = source.split('\n');
  const exports = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('export default')) continue;

    const declMatch = trimmed.match(DECLARATION_RE);
    if (declMatch) {
      exports.push(declMatch[1]);
      continue;
    }

    const listMatch = trimmed.match(NAMED_LIST_RE);
    if (listMatch) {
      const names = listMatch[1].split(',').map((entry) => {
        const parts = entry.trim().split(/\s+as\s+/);
        return parts.length > 1 ? parts[1].trim() : parts[0].trim();
      });
      exports.push(...names);
    }
  }

  return exports;
}
