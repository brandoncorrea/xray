import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from './args.js'
import { VERSION } from './index.js'
import { filterIndex } from './filter.js'
import { scan } from './scan.js'

const HELP = `xray - dependency analysis tool

Usage: xray [dir] [options]

Options:
  [dir]                     Root directory to scan (default: current directory)
  -o, --output <file>       Write JSON to file instead of stdout
  --file <path>             Show detail for a single source file
  --dependents-of <path>    List files that import the given module
  --dependencies-of <path>  List modules imported by the given file
  --include <dir>           Scan only this directory (repeatable)
  --exclude <dir>           Skip directory during scan (repeatable)
  --files-only              Output only file paths as a JSON array
  --compact                 Force compact (single-line) JSON output
  --pretty                  Force pretty-printed JSON output
  --help, -h                Show this help message
  --version, -v             Show version`

export async function main(argv, { write = defaultWrite } = {}) {
  const args = parseArgs(argv)
  if (args.unknown.length) {
    process.stderr.write(`Unknown flag${args.unknown.length > 1 ? 's' : ''}: ${args.unknown.join(', ')}\n`)
    return 1
  }
  if (args.help)
    write(HELP + '\n')
  else if (args.version)
    write(VERSION + '\n')
  else
    await doScan(args, write)
  return 0
}

async function doScan(args, write) {
  const options = {
    exclude: args.exclude,
    include: args.include
  }
  const index = await scan(resolve(args.dir || '.'), options)
  const result = filterIndex(args, index)
  const data = args.filesOnly ? Object.keys(result).sort() : result
  writeOutput(data, args, write)
}

function writeOutput(data, args, write) {
  const indent = shouldPrettyPrint(args) ? 2 : undefined
  const json = JSON.stringify(data, null, indent) + '\n'
  write(json, args.output)
}

function defaultWrite(json, outputPath) {
  if (outputPath)
    writeFileSync(outputPath, json)
  else
    process.stdout.write(json)
}

function shouldPrettyPrint(args) {
  if (args.pretty) return true
  if (args.compact) return false
  return args.output || Boolean(process.stdout.isTTY)
}
