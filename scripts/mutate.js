#!/usr/bin/env node

import { createManualRunner } from 'mutagen'
import mutagenConfig from '../mutagen.config.js' 

const runner = createManualRunner(mutagenConfig)
process.exit(await runner.run(process.argv.slice(2)))
