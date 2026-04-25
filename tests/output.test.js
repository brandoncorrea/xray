import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createConsoleOutput } from '../src/output.js'

function mockWrite(spyOn) {
  return vi.spyOn(spyOn, 'write').mockImplementation(() => true)
}

describe('createConsoleOutput', () => {
  let out, stdoutSpy, stderrSpy

  beforeEach(() => {
    stdoutSpy = mockWrite(process.stdout)
    stderrSpy = mockWrite(process.stderr)
    out = createConsoleOutput()
  })

  afterEach(() => {
    stdoutSpy.mockRestore()
    stderrSpy.mockRestore()
  })

  it('log writes to stdout', () => {
    out.log('hello')
    expect(stdoutSpy).toHaveBeenCalledWith('hello')
  })

  it('error writes to stderr', () => {
    out.error('oops')
    expect(stderrSpy).toHaveBeenCalledWith('oops')
  })
})
