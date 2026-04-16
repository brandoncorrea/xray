import { javascript } from 'mutagen/mutators'
import { createVitestRunner } from 'mutagen'

export default {
  mutators: javascript,
  include: ['src/**/*.js'],
  createRunner: (sourceFile, opts = {}) => createVitestRunner(sourceFile, {
    config: 'vitest.config.js',
    ...opts
  }),
  timeout: 10000,
  reportDir: 'reports/mutation'
}
