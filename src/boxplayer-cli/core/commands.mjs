import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

import { createAuthStore } from './authStore.mjs'
import { createOperationLogStore } from './operationLog.mjs'
import { dryRunRenamePlan } from './renamePlan.mjs'

function defaultConfigDir() {
  return join(homedir(), '.boxplayer-cli')
}

function hasFlag(argv, flag) {
  return argv.includes(flag)
}

function readOption(argv, flag) {
  const index = argv.indexOf(flag)
  if (index < 0) return ''
  return argv[index + 1] || ''
}

function jsonOut(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function ok(value, json = true) {
  return {
    exitCode: 0,
    stdout: json ? jsonOut(value) : `${String(value)}\n`,
    stderr: '',
  }
}

function fail(message, exitCode = 1) {
  return {
    exitCode,
    stdout: '',
    stderr: `${message}\n`,
  }
}

async function readJsonFile(path) {
  if (!path) throw new Error('Missing JSON file path')
  return JSON.parse(await readFile(path, 'utf8'))
}

async function handleAuth(argv, env) {
  const store = createAuthStore({ configDir: env.configDir })
  const subcommand = argv[1]
  if (subcommand === 'list') {
    return ok(await store.listAccounts(), hasFlag(argv, '--json'))
  }
  if (subcommand === 'default') {
    const provider = argv[2]
    const accountId = argv[3]
    if (!provider || !accountId) return fail('Usage: boxplayer-cli auth default <provider> <account-id>')
    await store.setDefaultAccount(provider, accountId)
    const accounts = await store.listAccounts()
    return ok(accounts.find((account) => account.provider === provider && account.accountId === accountId), hasFlag(argv, '--json'))
  }
  return fail(`Unknown auth command: ${subcommand || ''}`.trim())
}

async function handleFiles(argv) {
  const subcommand = argv[1]
  if (subcommand !== 'rename-apply') return fail(`Unknown files command: ${subcommand || ''}`.trim())
  const planPath = argv[2]
  if (!planPath) return fail('Usage: boxplayer-cli files rename-apply <plan.json> [--current current.json] [--dry-run]')
  const plan = await readJsonFile(planPath)
  const currentPath = readOption(argv, '--current')
  const currentItems = currentPath ? await readJsonFile(currentPath) : []
  if (!hasFlag(argv, '--dry-run')) {
    return fail('Only --dry-run is implemented for rename-apply in this phase', 5)
  }
  const result = dryRunRenamePlan(plan, currentItems)
  return ok(result, hasFlag(argv, '--json'))
}

async function handleOps(argv, env) {
  const store = createOperationLogStore({ configDir: env.configDir })
  const subcommand = argv[1]
  if (subcommand === 'list') return ok(await store.list(), hasFlag(argv, '--json'))
  if (subcommand === 'show') {
    const operation = await store.get(argv[2])
    if (!operation) return fail(`Unknown operation: ${argv[2] || ''}`.trim())
    return ok(operation, hasFlag(argv, '--json'))
  }
  return fail(`Unknown ops command: ${subcommand || ''}`.trim())
}

export async function runBoxPlayerCli(argv, env = {}) {
  const runtime = {
    ...env,
    configDir: env.configDir || process.env.BOXPLAYER_CLI_CONFIG_DIR || defaultConfigDir(),
  }
  try {
    const command = argv[0]
    if (command === 'auth') return await handleAuth(argv, runtime)
    if (command === 'files') return await handleFiles(argv, runtime)
    if (command === 'ops') return await handleOps(argv, runtime)
    return fail(`Unknown command: ${command || ''}`.trim())
  } catch (error) {
    return fail(error?.message || 'Unknown error')
  }
}
