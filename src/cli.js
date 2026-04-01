#!/usr/bin/env node

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const HELP = `xray - dependency analysis tool

Usage: xray [dir] [options]

Options:
  [dir]                     Root directory to scan (default: current directory)
  -o, --output <file>       Write JSON to file instead of stdout
  --file <path>             Show detail for a single source file
  --dependents-of <path>    List files that import the given module
  --dependencies-of <path>  List modules imported by the given file
  --help, -h                Show this help message
  --version, -v             Show version`

function parseArgs(argv) {
  const parsed = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h')
      parsed.help = true
    else if (arg === '--version' || arg === '-v')
      parsed.version = true
    else if (arg === '--output' || arg === '-o')
      parsed.output = argv[++i]
    else if (arg === '--file')
      parsed.file = argv[++i]
    else if (arg === '--dependents-of')
      parsed.dependentsOf = argv[++i]
    else if (arg === '--dependencies-of')
      parsed.dependenciesOf = argv[++i]
    else if (!arg.startsWith('-'))
      parsed.dir = arg
  }
  return parsed
}

function scanDependents(args, index) {
  const filtered = {}
  for (const [file, info] of Object.entries(index))
    if (info.dependencies.includes(args.dependentsOf))
      filtered[file] = info
  return filtered
}

function scanFile(args, index) {
  const entry = index[args.file]
  return entry ? { [args.file]: entry } : {}
}

function scanDependencies(args, index) {
  const entry = index[args.dependenciesOf]
  return entry ? { [args.dependenciesOf]: entry.dependencies } : {}
}

function output(data, outputPath) {
  const json = JSON.stringify(data, null, 2) + '\n'
  if (outputPath)
    writeFileSync(outputPath, json)
  else
    process.stdout.write(json)
}

async function doScan(args) {
  const { scan } = await import('./scan.js')
  const index = await scan(resolve(args.dir || '.'))
  const writeOut = data => output(data, args.output)

  if (args.file)
    writeOut(scanFile(args, index))
  else if (args.dependentsOf)
    writeOut(scanDependents(args, index))
  else if (args.dependenciesOf)
    writeOut(scanDependencies(args, index))
  else
    writeOut(index)
}

async function main(argv) {
  const args = parseArgs(argv)

  if (args.help) {
    console.log(HELP)
    return 0
  }

  if (args.version) {
    const { VERSION } = await import('./index.js')
    console.log(VERSION)
    return 0
  }

  await doScan(args)
  return 0
}

const result = await main(process.argv.slice(2))
process.exit(result)
