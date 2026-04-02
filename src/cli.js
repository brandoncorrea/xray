#!/usr/bin/env node

import { main } from './cli-core.js'

const result = await main(process.argv.slice(2))
process.exit(result)
