import { existsSync } from 'node:fs'
import { join, dirname, basename, extname } from 'node:path'

export const DEFAULT_TEST_PATTERNS = [
  'tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
  '**/*.{test,spec}.{js,jsx,ts,tsx}',
  '**/__tests__/*.{js,jsx,ts,tsx}',
  'spec/**/*.{js,jsx,ts,tsx}'
]

export function findTestFiles(sourceFile, projectRoot, testPatterns) {
  const patterns = testPatterns || DEFAULT_TEST_PATTERNS
  const ext = extname(sourceFile)
  const sourceName = basename(sourceFile, ext)
  const sourceDir = dirname(sourceFile)

  const candidates = new Set()
  for (const pattern of patterns)
    for (const candidate of candidatesFromPattern(pattern, sourceName, sourceDir))
      if (candidate !== sourceFile)
        candidates.add(candidate)

  return [...candidates]
    .filter(c => existsSync(join(projectRoot, c)))
    .sort()
}

function candidatesFromPattern(pattern, sourceName, sourceDir) {
  const resolvedPattern = resolvePattern(pattern, sourceDir)
  return expandBraces(withSourceName(resolvedPattern, sourceName))
}

function expandBraces(str) {
  const match = str.match(/^(.*?)\{([^}]+)\}(.*)$/)
  if (!match) return [str]
  const [, prefix, alternatives, suffix] = match
  return alternatives.split(',').flatMap(alt => expandBraces(prefix + alt + suffix))
}

function withSourceName(resolvedPattern, sourceName) {
  // Replace the first * in the filename with the source name
  const segments = resolvedPattern.split('/')
  const lastIdx = segments.length - 1
  segments[lastIdx] = segments[lastIdx].replace('*', sourceName)
  return segments.join('/')
}

function resolvePattern(pattern, sourceDir) {
  const parts = pattern.split('**/')
  if (parts.length === 1)
    return pattern
  else if (parts[0] === '')
    return resolveColocatedPattern(parts, sourceDir)
  else
    return resolveMirrorPattern(parts, sourceDir)
}

function resolveColocatedPattern(parts, sourceDir) {
  // Pattern starts with ** → co-located, use sourceDir as-is
  return sourceDir + '/' + parts.slice(1).join('/')
}

function resolveMirrorPattern(parts, sourceDir) {
  // Pattern has a prefix before ** → mirror, strip src/
  const prefix = parts[0]
  const suffix = parts.slice(1).join('/')
  const mirror = mirrorDir(sourceDir)
  return mirror
    ? prefix + mirror + '/' + suffix
    : prefix + suffix
}

function mirrorDir(sourceDir) {
  return sourceDir === 'src' ? ''
    : sourceDir.startsWith('src/') ? sourceDir.slice(4)
    : sourceDir
}
