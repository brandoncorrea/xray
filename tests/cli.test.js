import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const exec = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const cli = join(__dirname, '..', 'src', 'cli.js');

function run(...args) {
  return exec('node', [cli, ...args]);
}

function runExpectFail(...args) {
  return exec('node', [cli, ...args]).then(
    () => { throw new Error('expected non-zero exit'); },
    (err) => err
  );
}

function setupFixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'xray-cli-'));
  for (const [filePath, content] of Object.entries(files)) {
    const full = join(root, filePath);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

describe('cli', () => {
  it('prints help with --help', async () => {
    const { stdout } = await run('--help');
    expect(stdout).toContain('Usage: xray');
  });

  it('prints help with -h', async () => {
    const { stdout } = await run('-h');
    expect(stdout).toContain('Usage: xray');
  });

  it('prints version with --version', async () => {
    const { stdout } = await run('--version');
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('prints version with -v', async () => {
    const { stdout } = await run('-v');
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('prints usage and exits 1 with no args', async () => {
    const err = await runExpectFail();
    expect(err.code).toBe(1);
    expect(err.stderr || err.stdout).toContain('Usage');
  });

  describe('with fixture directory', () => {
    let root;

    beforeAll(() => {
      root = setupFixture({
        'src/math.js': [
          'export function add(a, b) { return a + b; }',
          'export function subtract(a, b) { return a - b; }',
        ].join('\n'),
        'src/calc.js': [
          "import { add } from './math.js';",
          'export function double(x) { return add(x, x); }',
        ].join('\n'),
        'src/main.js': [
          "import { double } from './calc.js';",
          "import { subtract } from './math.js';",
          'export function run() { return double(subtract(10, 3)); }',
        ].join('\n'),
        'tests/math.test.js': '// test for math\n',
      });
    });

    afterAll(() => {
      if (root) rmSync(root, { recursive: true, force: true });
    });

    it('full scan outputs JSON to stdout', async () => {
      const { stdout } = await run(root);
      const index = JSON.parse(stdout);
      expect(Object.keys(index).sort()).toEqual([
        'src/calc.js', 'src/main.js', 'src/math.js',
      ]);
      expect(index['src/math.js'].exports).toEqual(['add', 'subtract']);
    });

    it('--output writes JSON to file', async () => {
      const outFile = join(root, 'out.json');
      const { stdout } = await run(root, '--output', outFile);
      expect(stdout.trim()).toBe('');
      const content = readFileSync(outFile, 'utf-8');
      const index = JSON.parse(content);
      expect(index['src/math.js'].exports).toEqual(['add', 'subtract']);
    });

    it('-o writes JSON to file', async () => {
      const outFile = join(root, 'out2.json');
      await run(root, '-o', outFile);
      const content = readFileSync(outFile, 'utf-8');
      const index = JSON.parse(content);
      expect(Object.keys(index)).toContain('src/calc.js');
    });

    it('--file shows detail for a single file', async () => {
      const { stdout } = await run(root, '--file', 'src/math.js');
      const result = JSON.parse(stdout);
      expect(Object.keys(result)).toEqual(['src/math.js']);
      expect(result['src/math.js'].exports).toEqual(['add', 'subtract']);
      expect(result['src/math.js'].lines).toBe(2);
    });

    it('--file for unknown file outputs empty object', async () => {
      const { stdout } = await run(root, '--file', 'src/nope.js');
      const result = JSON.parse(stdout);
      expect(result).toEqual({});
    });

    it('--dependents-of lists files that import the target', async () => {
      const { stdout } = await run(root, '--dependents-of', 'src/math.js');
      const result = JSON.parse(stdout);
      expect(Object.keys(result).sort()).toEqual(['src/calc.js', 'src/main.js']);
    });

    it('--dependents-of for leaf file outputs empty object', async () => {
      const { stdout } = await run(root, '--dependents-of', 'src/main.js');
      const result = JSON.parse(stdout);
      expect(result).toEqual({});
    });

    it('--dependencies-of lists modules imported by the target', async () => {
      const { stdout } = await run(root, '--dependencies-of', 'src/main.js');
      const result = JSON.parse(stdout);
      expect(Object.keys(result)).toEqual(['src/main.js']);
      expect(result['src/main.js'].sort()).toEqual(['src/calc.js', 'src/math.js']);
    });

    it('--dependencies-of for file with no deps outputs empty array', async () => {
      const { stdout } = await run(root, '--dependencies-of', 'src/math.js');
      const result = JSON.parse(stdout);
      expect(result['src/math.js']).toEqual([]);
    });

    it('--dependencies-of for unknown file outputs empty object', async () => {
      const { stdout } = await run(root, '--dependencies-of', 'src/nope.js');
      const result = JSON.parse(stdout);
      expect(result).toEqual({});
    });
  });
});
