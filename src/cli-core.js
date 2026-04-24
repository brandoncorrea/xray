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
  --include <dir>           Scan only this directory (repeatable)
  --exclude <dir>           Skip directory during scan (repeatable)
  --files-only              Output only file paths as a JSON array
  --compact                 Force compact (single-line) JSON output
  --pretty                  Force pretty-printed JSON output
  --help, -h                Show this help message
  --version, -v             Show version`

function parseArgs(argv) {
  const parsed = { exclude: [], include: [], unknown: [] }
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
    else if (arg === '--include')
      parsed.include.push(argv[++i])
    else if (arg === '--exclude')
      parsed.exclude.push(argv[++i])
    else if (arg === '--files-only')
      parsed.filesOnly = true
    else if (arg === '--compact')
      parsed.compact = true
    else if (arg === '--pretty')
      parsed.pretty = true
    else if (arg.startsWith('-'))
      parsed.unknown.push(arg)
    else
      parsed.dir = arg
  }
  return parsed
}

function filterDependents(dependentsOf, index) {
  const filtered = {}
  for (const [file, info] of Object.entries(index))
    if (info.dependencies.includes(dependentsOf))
      filtered[file] = info
  return filtered
}

function filterFile(file, index) {
  const entry = index[file]
  return entry ? { [file]: entry } : {}
}

function filterDependencies(dependenciesOf, index) {
  const entry = index[dependenciesOf]
  return entry ? { [dependenciesOf]: entry } : {}
}

function selectQuery(args, index) {
  if (args.file)
    return filterFile(args.file, index)
  if (args.dependentsOf)
    return filterDependents(args.dependentsOf, index)
  if (args.dependenciesOf)
    return filterDependencies(args.dependenciesOf, index)
  return index
}

function shouldPrettyPrint(args) {
  if (args.pretty) return true
  if (args.compact) return false
  return args.output || Boolean(process.stdout.isTTY)
}

function defaultWrite(json, outputPath) {
  if (outputPath)
    writeFileSync(outputPath, json)
  else
    process.stdout.write(json)
}

function writeOutput(data, args, write) {
  const indent = shouldPrettyPrint(args) ? 2 : undefined
  const json = JSON.stringify(data, null, indent) + '\n'
  write(json, args.output)
}

async function doScan(args, write) {
  const { scan } = await import('./scan.js')
  const options = { exclude: args.exclude, include: args.include }
  const index = await scan(resolve(args.dir || '.'), options)
  const result = selectQuery(args, index)
  const data = args.filesOnly ? Object.keys(result).sort() : result
  writeOutput(data, args, write)
}

async function getVersion() {
  const { VERSION } = await import('./index.js')
  return VERSION
}

export async function main(argv, { write = defaultWrite } = {}) {
  const args = parseArgs(argv)
  if (args.unknown.length > 0) {
    process.stderr.write(`Unknown flag${args.unknown.length > 1 ? 's' : ''}: ${args.unknown.join(', ')}\n`)
    return 1
  }
  if (args.help)
    write(HELP + '\n')
  else if (args.version)
    write(await getVersion() + '\n')
  else
    await doScan(args, write)
  return 0
}
