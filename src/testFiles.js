import { existsSync } from 'node:fs'
import { join, dirname, basename, extname } from 'node:path'

export const DEFAULT_TEST_PATTERNS = [
  'tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
  '**/*.{test,spec}.{js,jsx,ts,tsx}',
  '**/__tests__/*.{js,jsx,ts,tsx}',
  'spec/**/*.{js,jsx,ts,tsx}'
]

function expandBraces(str) {
  const match = str.match(/^(.*?)\{([^}]+)\}(.*)$/)
  if (!match) return [str]
  const [, prefix, alternatives, suffix] = match
  return alternatives.split(',').flatMap(alt => expandBraces(prefix + alt + suffix))
}

function mirrorDir(sourceDir) {
  if (sourceDir === 'src') return ''
  if (sourceDir.startsWith('src/')) return sourceDir.slice(4)
  return sourceDir
}

function candidatesFromPattern(pattern, name, sourceDir) {
  const parts = pattern.split('**/')

  let resolved
  if (parts.length === 1) {
    resolved = pattern
  } else if (parts[0] === '') {
    // Pattern starts with ** → co-located, use sourceDir as-is
    resolved = sourceDir + '/' + parts.slice(1).join('/')
  } else {
    // Pattern has a prefix before ** → mirror, strip src/
    const prefix = parts[0]
    const suffix = parts.slice(1).join('/')
    const mirror = mirrorDir(sourceDir)
    resolved = mirror
      ? prefix + mirror + '/' + suffix
      : prefix + suffix
  }

  // Replace the first * in the filename with the source name
  const segs = resolved.split('/')
  segs[segs.length - 1] = segs[segs.length - 1].replace('*', name)
  resolved = segs.join('/')

  return expandBraces(resolved)
}

export function findTestFiles(sourceFile, projectRoot, testPatterns) {
  const patterns = testPatterns || DEFAULT_TEST_PATTERNS
  const ext = extname(sourceFile)
  const name = basename(sourceFile, ext)
  const dir = dirname(sourceFile)

  const candidates = new Set()
  for (const pattern of patterns) {
    for (const candidate of candidatesFromPattern(pattern, name, dir)) {
      if (candidate !== sourceFile && existsSync(join(projectRoot, candidate))) {
        candidates.add(candidate)
      }
    }
  }

  return [...candidates].sort()
}
