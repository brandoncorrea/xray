export function parseArgs(args) {
  const parsed = { exclude: [], include: [], unknown: [] }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h')
      parsed.help = true
    else if (arg === '--version' || arg === '-v')
      parsed.version = true
    else if (arg === '--output' || arg === '-o')
      parsed.output = requireValue(args, ++i, arg)
    else if (arg === '--file')
      parsed.file = requireValue(args, ++i, arg)
    else if (arg === '--dependents-of')
      parsed.dependentsOf = requireValue(args, ++i, arg)
    else if (arg === '--dependencies-of')
      parsed.dependenciesOf = requireValue(args, ++i, arg)
    else if (arg === '--include')
      parsed.include.push(requireValue(args, ++i, arg))
    else if (arg === '--exclude')
      parsed.exclude.push(requireValue(args, ++i, arg))
    else if (arg === '--tests-for')
      parsed.testsFor = requireValue(args, ++i, arg)
    else if (arg === '--transitive')
      parsed.transitive = true
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

function requireValue(args, index, flag) {
  if (index >= args.length)
    throw new Error(`${flag} requires a value`)
  return args[index]
}
