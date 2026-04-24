export function filterIndex(args, index) {
  if (args.file)
    return filterFile(args.file, index)
  if (args.dependentsOf)
    return filterDependents(args.dependentsOf, index)
  if (args.dependenciesOf)
    return filterDependencies(args.dependenciesOf, index)
  return index
}

function filterFile(file, index) {
  const entry = index[file]
  return entry ? { [file]: entry } : {}
}

function filterDependents(dependentsOf, index) {
  const filtered = {}
  for (const [file, info] of Object.entries(index))
    if (info.dependencies.includes(dependentsOf))
      filtered[file] = info
  return filtered
}

function filterDependencies(dependenciesOf, index) {
  const entry = index[dependenciesOf]
  return entry ? { [dependenciesOf]: entry } : {}
}
