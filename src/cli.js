#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`xray - dependency analysis tool

Usage: xray [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  const { VERSION } = await import('./index.js');
  console.log(VERSION);
  process.exit(0);
}
