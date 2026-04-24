import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    setupFiles: ['./tests/setup.js'],
    fileParallelism: true,
    testTimeout: 5000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/cli.js'],
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './reports/coverage'
    }
  }
})
