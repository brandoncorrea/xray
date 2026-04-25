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

  it('--transitive sets transitive flag', () => {
    expect(parseArgs(['--transitive']).transitive).toBe(true)
  })

  it('--transitive is undefined when not provided', () => {
    expect(parseArgs([]).transitive).toBeUndefined()
  })

  it('--tests-for captures the file path', () => {
    expect(parseArgs(['--tests-for', 'src/utils.js']).testsFor).toBe('src/utils.js')
  })

  it('--tests-for is undefined when not provided', () => {
    expect(parseArgs([]).testsFor).toBeUndefined()
  })

  it('throws when --output has no value', () => {
    expect(() => parseArgs(['--output'])).toThrow('--output requires a value')
  })

  it('throws when --file has no value', () => {
    expect(() => parseArgs(['--file'])).toThrow('--file requires a value')
  })

  it('throws when --exclude has no value', () => {
    expect(() => parseArgs(['--exclude'])).toThrow('--exclude requires a value')
  })
})
