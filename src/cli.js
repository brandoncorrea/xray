#!/usr/bin/env node

const HELP = `xray - dependency analysis tool

Usage: xray [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version`

function isHelp(args) {
  return args.length === 0 || args.includes('--help') || args.includes('-h')
}

function isVersion(args) {
  return args.includes('--version') || args.includes('-v')
}

async function main(args) {
  if (isHelp(args)) {
    console.log(HELP)
  } else if (isVersion(args)) {
    const { VERSION } = await import('./index.js')
    console.log(VERSION)
  }
  return 0
}

const args = process.argv.slice(2)
const result = await main(args)
process.exit(result)
