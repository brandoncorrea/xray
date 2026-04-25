import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import output, { createConsoleOutput, createSilentOutput } from '../src/output.js'

function mockWrite(spyOn) {
  return vi.spyOn(spyOn, 'write').mockImplementation(() => true)
}

describe('Output', () => {
  let stdoutSpy, stderrSpy, oldOutput

  beforeEach(() => {
    oldOutput = output.getImpl()
    stdoutSpy = mockWrite(process.stdout)
    stderrSpy = mockWrite(process.stderr)
  })

  afterEach(() => {
    output.configure(oldOutput)
    stdoutSpy.mockRestore()
    stderrSpy.mockRestore()
  })

  describe('Console', () => {
    beforeEach(() => {
      output.configure(createConsoleOutput())
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

  describe('Silent', () => {
    beforeEach(() => {
      output.configure(createSilentOutput())
    })

    it('log does nothing', () => {
      output.log('hello')
      expect(stdoutSpy).not.toHaveBeenCalled()
      expect(stderrSpy).not.toHaveBeenCalled()
    })
    
    it('error does nothing', () => {
      output.error('oops')
      expect(stdoutSpy).not.toHaveBeenCalled()
      expect(stderrSpy).not.toHaveBeenCalled()
    })
  })
})
