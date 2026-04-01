import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import madge from 'madge';
import { extractExports } from './exports.js';
import { findTestFiles } from './testFiles.js';

export async function scan(directory) {
  const srcDir = join(directory, 'src');
  if (!existsSync(srcDir)) return {};

  const res = await madge(srcDir);
  const graph = res.obj();

  if (Object.keys(graph).length === 0) return {};

  const index = {};

  for (const file of Object.keys(graph)) {
    const relPath = `src/${file}`;
    const absPath = join(directory, relPath);

    const content = readFileSync(absPath, 'utf-8');
    const lineCount = content === '' ? 0
      : content.endsWith('\n') ? content.split('\n').length - 1
      : content.split('\n').length;

    index[relPath] = {
      exports: extractExports(absPath),
      dependencies: graph[file].map(d => `src/${d}`),
      dependents: res.depends(file).map(d => `src/${d}`),
      tests: findTestFiles(relPath, directory),
      lines: lineCount,
    };
  }

  return index;
}
