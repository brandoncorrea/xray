import { existsSync } from 'node:fs'
import { join, dirname, basename, extname } from 'node:path'

const TEST_SUFFIXES = ['.spec', '.test']
const TEST_EXTENSIONS = ['.js', '.jsx']

function testMatchingSelf(nameWithoutExt) {
  return TEST_SUFFIXES.find(
    suffix => nameWithoutExt.endsWith(suffix))
}

function mirrorDirectory(dir) {
  // Strip leading src/ to get the relative path within src
  const relPath = dir === 'src' ? ''
    : dir.startsWith('src/') ? dir.slice(4)
    : dir

  return relPath ? join('tests', relPath) : 'tests'
}

function findTestsFromSources(sourceFile, projectRoot, nameWithoutExt) {
  const dir = dirname(sourceFile)
  const mirrorDir = mirrorDirectory(dir)
  const candidates = []

  for (const testExt of TEST_EXTENSIONS) {
    for (const suffix of TEST_SUFFIXES) {
      const testName = `${nameWithoutExt}${suffix}${testExt}`
      candidates.push(
        join(mirrorDir, testName),
        join(dir, testName))
    }
  }

  const found = candidates.filter(
    candidate => existsSync(join(projectRoot, candidate))
  )

  return [...new Set(found)].sort()
}

/**
 * Find test files associated with a source file by convention.
 *
 * Conventions checked:
 * - Mirror structure: src/foo/bar.js → tests/foo/bar.test.js
 * - Co-located: src/foo/bar.js → src/foo/bar.test.js
 *
 * @param {string} sourceFile - Relative path to source file from project root
 * @param {string} projectRoot - Absolute path to project root
 * @returns {string[]} Sorted array of matching test file paths (relative)
 */
export function findTestFiles(sourceFile, projectRoot) {
  const ext = extname(sourceFile)
  const nameWithoutExt = basename(sourceFile, ext)
  if (testMatchingSelf(nameWithoutExt))
    return []
  return findTestsFromSources(sourceFile, projectRoot, nameWithoutExt)
}
