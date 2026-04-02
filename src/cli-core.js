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
  --exclude <dir>           Skip directory during scan (repeatable)
  --compact                 Force compact (single-line) JSON output
  --pretty                  Force pretty-printed JSON output
  --help, -h                Show this help message
  --version, -v             Show version`

export function parseArgs(argv) {
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
    else if (arg === '--exclude') {
      if (!parsed.exclude) parsed.exclude = []
      parsed.exclude.push(argv[++i])
    }
    else if (arg === '--compact')
      parsed.compact = true
    else if (arg === '--pretty')
      parsed.pretty = true
    else if (!arg.startsWith('-'))
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
  return entry ? { [dependenciesOf]: entry.dependencies } : {}
}

function selectQuery(args, index) {
  if (args.file) return filterFile(args.file, index)
  if (args.dependentsOf) return filterDependents(args.dependentsOf, index)
  if (args.dependenciesOf) return filterDependencies(args.dependenciesOf, index)
  return index
}

function shouldPrettyPrint(args) {
  if (args.pretty) return true
  if (args.compact) return false
  return args.output || Boolean(process.stdout.isTTY)
}

function writeOutput(data, args) {
  const indent = shouldPrettyPrint(args) ? 2 : undefined
  const json = JSON.stringify(data, null, indent) + '\n'
  if (args.output)
    writeFileSync(args.output, json)
  else
    process.stdout.write(json)
}

async function doScan(args) {
  const { scan } = await import('./scan.js')
  const options = {}
  if (args.exclude) options.exclude = args.exclude
  const index = await scan(resolve(args.dir || '.'), options)
  writeOutput(selectQuery(args, index), args)
}

export async function main(argv) {
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
