export function filterIndex(args, index) {
  if (args.file)
    return filterFile(args.file, index)
  if (args.dependentsOf)
    return args.transitive
      ? filterDependentsTransitive(args.dependentsOf, index)
      : filterDependents(args.dependentsOf, index)
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

function filterDependentsTransitive(target, index) {
  const result = {}
  const queue = [target]
  const visited = new Set([target])
  while (queue.length) {
    const current = queue.shift()
    for (const [file, info] of Object.entries(index)) {
      if (!visited.has(file) && info.dependencies.includes(current)) {
        visited.add(file)
        result[file] = info
        queue.push(file)
      }
    }
  }
  return result
}

function filterDependencies(dependenciesOf, index) {
  const entry = index[dependenciesOf]
  return entry ? { [dependenciesOf]: entry } : {}
}
