import { describe, it, expect } from 'vitest';
import { extractExports } from '../src/exports.js';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function withTempFile(content) {
  const dir = mkdtempSync(join(tmpdir(), 'xray-exports-'));
  const file = join(dir, 'test.js');
  writeFileSync(file, content);
  return { file, cleanup: () => rmSync(dir, { recursive: true }) };
}

describe('extractExports', () => {
  it('extracts export const', () => {
    const { file, cleanup } = withTempFile('export const foo = 42;\nexport const bar = "hi";\n');
    try {
      const result = extractExports(file);
      expect(result).toEqual(['foo', 'bar']);
    } finally {
      cleanup();
    }
  });

  it('extracts export function', () => {
    const { file, cleanup } = withTempFile('export function bar() {}\n');
    try {
      expect(extractExports(file)).toEqual(['bar']);
    } finally {
      cleanup();
    }
  });

  it('extracts export async function', () => {
    const { file, cleanup } = withTempFile('export async function qux() {}\n');
    try {
      expect(extractExports(file)).toEqual(['qux']);
    } finally {
      cleanup();
    }
  });

  it('extracts export class', () => {
    const { file, cleanup } = withTempFile('export class Baz {}\n');
    try {
      expect(extractExports(file)).toEqual(['Baz']);
    } finally {
      cleanup();
    }
  });

  it('extracts named export list', () => {
    const { file, cleanup } = withTempFile('const a = 1;\nconst b = 2;\nexport { a, b };\n');
    try {
      expect(extractExports(file)).toEqual(['a', 'b']);
    } finally {
      cleanup();
    }
  });

  it('extracts re-exports from another module', () => {
    const { file, cleanup } = withTempFile("export { foo, bar } from './other.js';\n");
    try {
      expect(extractExports(file)).toEqual(['foo', 'bar']);
    } finally {
      cleanup();
    }
  });

  it('extracts aliased named exports', () => {
    const { file, cleanup } = withTempFile("const internal = 1;\nexport { internal as external };\n");
    try {
      expect(extractExports(file)).toEqual(['external']);
    } finally {
      cleanup();
    }
  });

  it('ignores export default', () => {
    const { file, cleanup } = withTempFile('export default function main() {}\nexport const named = 1;\n');
    try {
      expect(extractExports(file)).toEqual(['named']);
    } finally {
      cleanup();
    }
  });

  it('ignores comments that look like exports', () => {
    const { file, cleanup } = withTempFile('// export const fake = 1;\nexport const real = 2;\n');
    try {
      expect(extractExports(file)).toEqual(['real']);
    } finally {
      cleanup();
    }
  });

  it('handles mixed export styles', () => {
    const source = [
      'export const VERSION = "1.0";',
      'export function scan() {}',
      'export class Scanner {}',
      'export async function init() {}',
      'const internal = 42;',
      'export { internal };',
      "export { helper } from './utils.js';",
      'export default class Main {}',
      '// export const commented = true;',
    ].join('\n');
    const { file, cleanup } = withTempFile(source);
    try {
      const result = extractExports(file);
      expect(result).toEqual(['VERSION', 'scan', 'Scanner', 'init', 'internal', 'helper']);
    } finally {
      cleanup();
    }
  });

  it('returns empty array for file with no exports', () => {
    const { file, cleanup } = withTempFile('const x = 1;\n');
    try {
      expect(extractExports(file)).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it('extracts export let and export var', () => {
    const { file, cleanup } = withTempFile('export let a = 1;\nexport var b = 2;\n');
    try {
      expect(extractExports(file)).toEqual(['a', 'b']);
    } finally {
      cleanup();
    }
  });

  it('extracts exports from minified single-line file', () => {
    const { file, cleanup } = withTempFile('export const a=1;export function b(){}export class C{}');
    try {
      expect(extractExports(file)).toEqual(['a', 'b', 'C']);
    } finally {
      cleanup();
    }
  });

  it('ignores block comments containing export syntax', () => {
    const source = '/* export const fake = 1; */\nexport const real = 2;\n';
    const { file, cleanup } = withTempFile(source);
    try {
      expect(extractExports(file)).toEqual(['real']);
    } finally {
      cleanup();
    }
  });

  it('extracts multi-line export list', () => {
    const source = [
      'const a = 1;',
      'const b = 2;',
      'const c = 3;',
      'export {',
      '  a,',
      '  b,',
      '  c',
      '};',
    ].join('\n');
    const { file, cleanup } = withTempFile(source);
    try {
      expect(extractExports(file)).toEqual(['a', 'b', 'c']);
    } finally {
      cleanup();
    }
  });

  it('extracts exports from JSX file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'xray-exports-'));
    const file = join(dir, 'component.jsx');
    writeFileSync(file, 'export function App() { return <div />; }\nexport const name = "app";\n');
    try {
      expect(extractExports(file)).toEqual(['App', 'name']);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
