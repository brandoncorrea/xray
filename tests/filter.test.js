import { describe, it, expect } from 'vitest'
import { filterIndex } from '../src/filter.js'

const index = {
  'src/app.js': { dependencies: ['src/utils.js'], exports: ['main'] },
  'src/utils.js': { dependencies: [], exports: ['helper'] }
}

const chainIndex = {
  'src/a.js': { dependencies: [], exports: ['a'] },
  'src/b.js': { dependencies: ['src/a.js'], exports: ['b'] },
  'src/c.js': { dependencies: ['src/b.js'], exports: ['c'] },
  'src/d.js': { dependencies: ['src/c.js'], exports: ['d'] },
  'src/unrelated.js': { dependencies: [], exports: ['x'] }
}

describe('filterIndex', () => {
  it('--file for unknown file returns empty object', () => {
    const result = filterIndex({ file: 'src/nope.js' }, index)
    expect(result).toEqual({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('--dependencies-of for unknown file returns empty object', () => {
    const result = filterIndex({ dependenciesOf: 'src/nope.js' }, index)
    expect(result).toEqual({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  describe('--dependents-of --transitive', () => {
    it('returns only direct dependents without --transitive', () => {
      const result = filterIndex({ dependentsOf: 'src/a.js' }, chainIndex)
      expect(Object.keys(result)).toEqual(['src/b.js'])
    })

    it('returns full transitive closure with --transitive', () => {
      const result = filterIndex({ dependentsOf: 'src/a.js', transitive: true }, chainIndex)
      expect(Object.keys(result).sort()).toEqual(['src/b.js', 'src/c.js', 'src/d.js'])
    })

    it('transitive from middle of chain returns downstream dependents', () => {
      const result = filterIndex({ dependentsOf: 'src/b.js', transitive: true }, chainIndex)
      expect(Object.keys(result).sort()).toEqual(['src/c.js', 'src/d.js'])
    })

    it('transitive for leaf file returns empty object', () => {
      const result = filterIndex({ dependentsOf: 'src/d.js', transitive: true }, chainIndex)
      expect(result).toEqual({})
    })

    it('transitive for unknown file returns empty object', () => {
      const result = filterIndex({ dependentsOf: 'src/nope.js', transitive: true }, chainIndex)
      expect(result).toEqual({})
    })

    it('--transitive without --dependents-of has no effect', () => {
      const result = filterIndex({ file: 'src/a.js', transitive: true }, chainIndex)
      expect(Object.keys(result)).toEqual(['src/a.js'])
    })
  })
})
