import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import output, { createConsoleOutput } from '../src/output.js'

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

describe('default output namespace', () => {
  it('log delegates to impl', () => {
    const spy = mockWrite(process.stdout)
    output.configure(createConsoleOutput())
    try {
      output.log('test message')
      expect(spy).toHaveBeenCalledWith('test message')
    } finally {
      spy.mockRestore()
      output.configure(createConsoleOutput())
    }
  })
})
