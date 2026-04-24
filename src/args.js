export function parseArgs(args) {
  const parsed = { exclude: [], include: [], unknown: [] }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h')
      parsed.help = true
    else if (arg === '--version' || arg === '-v')
      parsed.version = true
    else if (arg === '--output' || arg === '-o')
      parsed.output = args[++i]
    else if (arg === '--file')
      parsed.file = args[++i]
    else if (arg === '--dependents-of')
      parsed.dependentsOf = args[++i]
    else if (arg === '--dependencies-of')
      parsed.dependenciesOf = args[++i]
    else if (arg === '--include')
      parsed.include.push(args[++i])
    else if (arg === '--exclude')
      parsed.exclude.push(args[++i])
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
