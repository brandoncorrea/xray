let impl = createConsoleOutput()

export function createConsoleOutput() {
  return {
    log: message => process.stdout.write(message),
    error: message => process.stderr.write(message)
  }
}

export function createSilentOutput() {
  return {
    log: () => {},
    error: () => {}
  }
}

export default {
  log(message) { impl.log(message) },
  error(message) { impl.error(message) },
  configure(output) { impl = output }
}
