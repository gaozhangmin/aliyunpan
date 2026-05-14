#!/usr/bin/env node
import { runBoxPlayerCli } from '../src/boxplayer-cli/core/commands.mjs'

const result = await runBoxPlayerCli(process.argv.slice(2))
if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
process.exitCode = result.exitCode
