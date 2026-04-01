import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const exec = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const cli = join(__dirname, '..', 'src', 'cli.js');

describe('cli', () => {
  it('prints help with --help', async () => {
    const { stdout } = await exec('node', [cli, '--help']);
    expect(stdout).toContain('Usage: xray');
  });

  it('prints version with --version', async () => {
    const { stdout } = await exec('node', [cli, '--version']);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('exits cleanly with no args', async () => {
    const { stdout } = await exec('node', [cli]);
    expect(stdout).toBeDefined();
  });
});
