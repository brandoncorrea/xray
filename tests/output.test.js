import { describe, it, expect, vi } from 'vitest'
import { createConsoleOutput } from '../src/output.js'

describe('createConsoleOutput', () => {
  it('log writes to stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      const out = createConsoleOutput()
      out.log('hello')
      expect(spy).toHaveBeenCalledWith('hello')
    } finally {
      spy.mockRestore()
    }
  })

  it('error writes to stderr', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      const out = createConsoleOutput()
      out.error('oops')
      expect(spy).toHaveBeenCalledWith('oops')
    } finally {
      spy.mockRestore()
    }
  })
})
