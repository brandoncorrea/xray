import { existsSync } from 'node:fs'
import { join, dirname, basename, extname } from 'node:path'

const TEST_SUFFIXES = ['.spec', '.test']
const TEST_EXTENSIONS = ['.js', '.jsx']

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
  const dir = dirname(sourceFile)
  const ext = extname(sourceFile)
  const nameWithoutExt = basename(sourceFile, ext)

  // Don't match test files to themselves
  for (const suffix of TEST_SUFFIXES)
    if (nameWithoutExt.endsWith(suffix))
      return []

  // Strip leading src/ to get the relative path within src
  const relPath = dir === 'src' ? ''
    : dir.startsWith('src/') ? dir.slice(4)
    : dir

  const candidates = []

  for (const testExt of TEST_EXTENSIONS) {
    for (const suffix of TEST_SUFFIXES) {
      const testName = `${nameWithoutExt}${suffix}${testExt}`

      // Mirror structure: tests/<relPath>/<name>.test.ext
      const mirrorDir = relPath ? join('tests', relPath) : 'tests'
      const mirrorPath = join(mirrorDir, testName)
      candidates.push(mirrorPath)

      // Co-located: <dir>/<name>.test.ext
      const colocatedPath = join(dir, testName)
      candidates.push(colocatedPath)
    }
  }

  const found = candidates.filter(
    candidate => existsSync(join(projectRoot, candidate))
  )

  return [...new Set(found)].sort()
}
