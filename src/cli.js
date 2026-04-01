#!/usr/bin/env node

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const HELP = `xray - dependency analysis tool

Usage: xray <dir> [options]

Options:
  <dir>                     Root directory to scan (required)
  -o, --output <file>       Write JSON to file instead of stdout
  --file <path>             Show detail for a single source file
  --dependents-of <path>    List files that import the given module
  --dependencies-of <path>  List modules imported by the given file
  --help, -h                Show this help message
  --version, -v             Show version`

function parseArgs(argv) {
  const parsed = { dir: null, output: null, file: null, dependentsOf: null, dependenciesOf: null, help: false, version: false }
  let i = 0
  while (i < argv.length) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') { parsed.help = true }
    else if (arg === '--version' || arg === '-v') { parsed.version = true }
    else if (arg === '--output' || arg === '-o') { parsed.output = argv[++i] }
    else if (arg === '--file') { parsed.file = argv[++i] }
    else if (arg === '--dependents-of') { parsed.dependentsOf = argv[++i] }
    else if (arg === '--dependencies-of') { parsed.dependenciesOf = argv[++i] }
    else if (!arg.startsWith('-')) { parsed.dir = arg }
    i++
  }
  return parsed
}

function output(data, outputPath) {
  const json = JSON.stringify(data, null, 2) + '\n'
  if (outputPath) {
    writeFileSync(outputPath, json)
  } else {
    process.stdout.write(json)
  }
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

  if (!args.dir) {
    process.stderr.write('Usage: xray <dir> [options]\n')
    return 1
  }

  const { scan } = await import('./scan.js')
  const dir = resolve(args.dir)
  const index = await scan(dir)

  if (args.file) {
    const entry = index[args.file]
    output(entry ? { [args.file]: entry } : {}, args.output)
  } else if (args.dependentsOf) {
    const filtered = {}
    for (const [file, info] of Object.entries(index)) {
      if (info.dependencies.includes(args.dependentsOf)) {
        filtered[file] = info
      }
    }
    output(filtered, args.output)
  } else if (args.dependenciesOf) {
    const entry = index[args.dependenciesOf]
    output(entry ? { [args.dependenciesOf]: entry.dependencies } : {}, args.output)
  } else {
    output(index, args.output)
  }

  return 0
}

const result = await main(process.argv.slice(2))
process.exit(result)
