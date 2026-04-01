import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findTestFiles } from '../src/testFiles.js';

function setupTempProject(structure) {
  const root = mkdtempSync(join(tmpdir(), 'xray-test-'));
  for (const filePath of structure) {
    const full = join(root, filePath);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, '');
  }
  return root;
}

describe('findTestFiles', () => {
  let root;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('finds mirror-structure .test.js file', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'tests/handlers/feed.test.js',
    ]);
    const result = findTestFiles('src/handlers/feed.js', root);
    expect(result).toEqual(['tests/handlers/feed.test.js']);
  });

  it('finds mirror-structure .spec.js file', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'tests/handlers/feed.spec.js',
    ]);
    const result = findTestFiles('src/handlers/feed.js', root);
    expect(result).toEqual(['tests/handlers/feed.spec.js']);
  });

  it('finds co-located .test.js file', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'src/handlers/feed.test.js',
    ]);
    const result = findTestFiles('src/handlers/feed.js', root);
    expect(result).toEqual(['src/handlers/feed.test.js']);
  });

  it('finds co-located .spec.js file', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
      'src/handlers/feed.spec.js',
    ]);
    const result = findTestFiles('src/handlers/feed.js', root);
    expect(result).toEqual(['src/handlers/feed.spec.js']);
  });

  it('finds .test.jsx and .spec.jsx extensions', () => {
    root = setupTempProject([
      'src/components/Button.jsx',
      'tests/components/Button.test.jsx',
      'tests/components/Button.spec.jsx',
    ]);
    const result = findTestFiles('src/components/Button.jsx', root);
    expect(result).toEqual([
      'tests/components/Button.spec.jsx',
      'tests/components/Button.test.jsx',
    ]);
  });

  it('returns multiple matches across conventions', () => {
    root = setupTempProject([
      'src/utils/parse.js',
      'tests/utils/parse.test.js',
      'src/utils/parse.spec.js',
    ]);
    const result = findTestFiles('src/utils/parse.js', root);
    expect(result).toEqual([
      'src/utils/parse.spec.js',
      'tests/utils/parse.test.js',
    ]);
  });

  it('returns empty array when no test files exist', () => {
    root = setupTempProject([
      'src/handlers/feed.js',
    ]);
    const result = findTestFiles('src/handlers/feed.js', root);
    expect(result).toEqual([]);
  });

  it('handles files in src root (no subdirectory)', () => {
    root = setupTempProject([
      'src/index.js',
      'tests/index.test.js',
    ]);
    const result = findTestFiles('src/index.js', root);
    expect(result).toEqual(['tests/index.test.js']);
  });

  it('does not return the source file itself', () => {
    root = setupTempProject([
      'src/handlers/feed.test.js',
    ]);
    const result = findTestFiles('src/handlers/feed.test.js', root);
    expect(result).toEqual([]);
  });
});
