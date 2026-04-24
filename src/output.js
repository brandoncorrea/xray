export function createConsoleOutput() {
  return {
    log: (message) => process.stdout.write(message),
    error: (message) => process.stderr.write(message)
  }
}

export function createSilentOutput() {
  return {
    log: () => {},
    error: () => {}
  }
}

function configure(impl) {
  output.log = impl.log
  output.error = impl.error
}

const output = { ...createConsoleOutput(), configure }
export default output
