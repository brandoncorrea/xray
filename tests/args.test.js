import { describe, it, expect } from 'vitest'
import { parseArgs } from '../src/args.js'

describe('parseArgs', () => {
  it('returns empty arrays when no arguments given', () => {
    const result = parseArgs([])
    expect(result.exclude).toEqual([])
    expect(result.include).toEqual([])
    expect(result.unknown).toEqual([])
  })

  it('-h is an alias for --help', () => {
    expect(parseArgs(['-h']).help).toBe(true)
  })

  it('-v is an alias for --version', () => {
    expect(parseArgs(['-v']).version).toBe(true)
  })
})
