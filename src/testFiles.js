import { existsSync } from 'node:fs'
import { join, dirname, basename, extname } from 'node:path'

const TEST_SUFFIXES = ['.spec', '.test']
const TEST_EXTENSIONS = ['.js', '.jsx']

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

export function findTestFiles(sourceFile, projectRoot) {
  const ext = extname(sourceFile)
  const nameWithoutExt = basename(sourceFile, ext)
  return findTestsFromSources(sourceFile, projectRoot, nameWithoutExt)
}
