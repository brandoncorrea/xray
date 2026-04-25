export function filterIndex(args, index) {
  if (args.testsFor)
    return filterTestsFor(normalizePath(args.testsFor), index)
  if (args.file)
    return filterFile(normalizePath(args.file), index)
  if (args.dependentsOf)
    return args.transitive
      ? filterDependentsTransitive(normalizePath(args.dependentsOf), index)
      : filterDependents(normalizePath(args.dependentsOf), index)
  if (args.dependenciesOf)
    return filterDependencies(normalizePath(args.dependenciesOf), index)
  return index
}

function normalizePath(path) {
  return path.replace(/^\.\//, '')
}

function filterFile(file, index) {
  const entry = index[file]
  return entry ? { [file]: entry } : {}
}

function filterDependents(target, index) {
  const filtered = {}
  const entry = index[target]
  if (!entry) return filtered
  for (const dep of entry.dependents || [])
    if (index[dep])
      filtered[dep] = index[dep]
  return filtered
}

function filterDependentsTransitive(target, index) {
  const result = {}
  const queue = [target]
  const visited = new Set([target])
  while (queue.length) {
    const current = queue.shift()
    const entry = index[current]
    if (!entry) continue
    for (const dep of entry.dependents || []) {
      if (!visited.has(dep)) {
        visited.add(dep)
        result[dep] = index[dep]
        queue.push(dep)
      }
    }
  }
  return result
}

function filterTestsFor(target, index) {
  if (!index[target]) return []
  const dependents = filterDependentsTransitive(target, index)
  const files = [target, ...Object.keys(dependents)]
  const tests = new Set()
  for (const file of files)
    for (const test of index[file].tests || [])
      tests.add(test)
  return [...tests]
}

function filterDependencies(dependenciesOf, index) {
  const entry = index[dependenciesOf]
  return entry ? { [dependenciesOf]: entry } : {}
}
