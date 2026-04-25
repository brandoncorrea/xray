import { describe, it, expect } from 'vitest'
import { Parser } from 'acorn'
import { selectParser, jsxParser } from '../src/parser.js'

function testParser(kind, ext, expectedParser) {
  it(`selects the ${kind} parser on ${ext}`, () => {
    const parser = selectParser(`blah${ext}`)
    expect(parser).toBe(expectedParser)
  })
}

describe('Parser', () => {
  testParser('JSX', '.jsx', jsxParser)
  testParser('JSX', '.tsx', jsxParser)
  testParser('default', '.js', Parser)
  testParser('default', '.ts', Parser)
})
