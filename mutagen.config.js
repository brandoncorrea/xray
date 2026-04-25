import { createVitestRunner, mutators } from '@bwawan/mutagen'

export default {
  mutators: mutators.javascript,
  include: ['src/**/*.js'],
  testInclude: ['tests/**/*.test.js'],
  createRunner: (sourceFile, opts = {}) => createVitestRunner(sourceFile, {
    config: 'vitest.config.js',
    ...opts
  }),
  timeout: 10000,
  reportDir: 'reports/mutation'
}
