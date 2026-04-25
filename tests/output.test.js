import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import output, { createConsoleOutput } from '../src/output.js'

function mockWrite(spyOn) {
  return vi.spyOn(spyOn, 'write').mockImplementation(() => true)
}

describe('createConsoleOutput', () => {
  let stdoutSpy, stderrSpy, oldOutput

  beforeAll(() => {
    oldOutput = output.getImpl()
    output.configure(createConsoleOutput())
    stdoutSpy = mockWrite(process.stdout)
    stderrSpy = mockWrite(process.stderr)
  })

  afterAll(() => {
    output.configure(oldOutput)
    stdoutSpy.mockRestore()
    stderrSpy.mockRestore()
  })

  it('log writes to stdout', () => {
    output.log('hello')
    expect(stdoutSpy).toHaveBeenCalledWith('hello')
  })

  it('error writes to stderr', () => {
    output.error('oops')
    expect(stderrSpy).toHaveBeenCalledWith('oops')
  })
})
