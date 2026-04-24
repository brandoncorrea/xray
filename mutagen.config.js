import { javascript } from '@bwawan/mutagen/mutators'
import { createVitestRunner } from '@bwawan/mutagen'

export default {
  mutators: javascript,
  include: ['src/**/*.js'],
  createRunner: (sourceFile, opts = {}) => createVitestRunner(sourceFile, {
    config: 'vitest.config.js',
    ...opts
  }),
  timeout: 5000,
  reportDir: 'reports/mutation'
}
