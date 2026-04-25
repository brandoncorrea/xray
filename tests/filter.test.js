import { describe, it, expect } from 'vitest'
import { filterIndex } from '../src/filter.js'

const index = {
  'src/app.js': { dependencies: ['src/utils.js'], exports: ['main'] },
  'src/utils.js': { dependencies: [], exports: ['helper'] }
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
})
