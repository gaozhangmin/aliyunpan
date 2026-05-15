import { runBoxPlayerCli } from '../core/commands.mjs'

export const TOOLS = [
  {
    name: 'files_search',
    description: 'Search for files by name across a cloud drive using server-side search. Returns a JSON array of matching FileItems.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Provider id, e.g. "aliyun", "onedrive", "dropbox", "box", "baidu", "115", "pikpak"', default: 'aliyun' },
        account: { type: 'string', description: 'Account id or "default"', default: 'default' },
        name: { type: 'string', description: 'Filename keyword to search for' },
        query: { type: 'string', description: 'Raw query string for aliyun (e.g. `name = "foo"` or `name match "foo"`). Overrides name for aliyun only.' },
        drive_id: { type: 'string', description: 'Drive id (optional, uses default drive if omitted)' },
        limit: { type: 'number', description: 'Max results to return', default: 100 },
      },
      required: [],
    },
  },
  {
    name: 'files_list',
    description: 'List files in a cloud drive directory. Returns a JSON array of FileItem.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Provider id, e.g. "aliyun"', default: 'aliyun' },
        account: { type: 'string', description: 'Account id or "default"', default: 'default' },
        path: { type: 'string', description: 'Parent folder file_id or "root"', default: 'root' },
        drive_id: { type: 'string', description: 'Drive id (optional, uses default drive if omitted)' },
      },
      required: [],
    },
  },
  {
    name: 'files_walk',
    description: 'Recursively walk a cloud drive directory tree. Returns a JSON array of all FileItems.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', default: 'aliyun' },
        account: { type: 'string', default: 'default' },
        path: { type: 'string', default: 'root' },
        drive_id: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'media_rename_plan',
    description: 'Generate a Jellyfin/Emby/Plex compatible rename plan from a list of FileItems. Returns a rename plan JSON that can be passed to files_rename_apply.',
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Array of FileItem objects (from files_list or files_walk output)',
          items: { type: 'object' },
        },
        provider: { type: 'string', default: 'aliyun' },
        account: { type: 'string', default: 'default' },
        style: { type: 'string', enum: ['jellyfin', 'emby', 'plex'], default: 'jellyfin' },
      },
      required: ['items'],
    },
  },
  {
    name: 'media_scan',
    description: 'Analyze a list of FileItems and produce a media recognition report: movies, series, episodes, subtitles, suspected duplicates, and unrecognized items.',
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Array of FileItem objects (from files_list or files_walk)',
          items: { type: 'object' },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'media_match',
    description: 'For each FileItem, determine the media type (movie/episode/subtitle/folder), extract title/year/season/episode, compute confidence, and return the Jellyfin target filename.',
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Array of FileItem objects',
          items: { type: 'object' },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'media_organize_plan',
    description: 'Generate a combined organize plan (mkdirs + renames + moves) to arrange files into a Jellyfin/Plex directory structure under a root folder.',
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Array of FileItem objects',
          items: { type: 'object' },
        },
        provider: { type: 'string', default: 'aliyun' },
        account: { type: 'string', default: 'default' },
        style: { type: 'string', enum: ['jellyfin', 'emby', 'plex'], default: 'jellyfin' },
        root_file_id: { type: 'string', description: 'Root folder file_id where organized structure will be created', default: 'root' },
        drive_id: { type: 'string', description: 'Drive id (optional, uses default drive if omitted)' },
      },
      required: ['items'],
    },
  },
  {
    name: 'files_rename_apply',
    description: 'Validate and apply a rename plan. Use dry_run=true first to preview changes. Returns { ok, succeeded, failed, operationId } on apply.',
    inputSchema: {
      type: 'object',
      properties: {
        plan: { type: 'object', description: 'Rename plan object from media_rename_plan' },
        dry_run: { type: 'boolean', description: 'If true, only validate without making changes', default: true },
      },
      required: ['plan'],
    },
  },
  {
    name: 'ops_list',
    description: 'List all past operation logs (rename history).',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'ops_show',
    description: 'Show full details of a specific operation log by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Operation id from ops_list' },
      },
      required: ['id'],
    },
  },
  {
    name: 'ops_undo',
    description: 'Generate and apply the inverse rename plan for a completed operation. Use dry_run=true first.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Operation id to undo' },
        dry_run: { type: 'boolean', default: true },
      },
      required: ['id'],
    },
  },
  {
    name: 'auth_list',
    description: 'List all configured accounts in the CLI auth store.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'files_tree',
    description: 'Depth-limited directory tree with file/folder counts and total sizes. More token-efficient than files_walk for understanding structure.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Provider id, e.g. "aliyun"', default: 'aliyun' },
        account: { type: 'string', description: 'Account id or "default"', default: 'default' },
        path: { type: 'string', description: 'Root folder file_id or "root"', default: 'root' },
        depth: { type: 'number', description: 'Max recursion depth', default: 3 },
        drive_id: { type: 'string', description: 'Drive id (optional)' },
      },
      required: [],
    },
  },
  {
    name: 'files_stats',
    description: 'Aggregate statistics for a directory: total files/size, breakdown by category (video, subtitle, image, audio, archive, other), and top extensions.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', default: 'aliyun' },
        account: { type: 'string', default: 'default' },
        path: { type: 'string', default: 'root' },
        depth: { type: 'number', default: 10 },
        drive_id: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'files_info',
    description: 'Get full metadata for a single file or folder by file_id.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', default: 'aliyun' },
        account: { type: 'string', default: 'default' },
        file_id: { type: 'string', description: 'File or folder id' },
        drive_id: { type: 'string' },
      },
      required: ['file_id'],
    },
  },
  {
    name: 'files_mkdir',
    description: 'Create a new folder in a cloud drive.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', default: 'aliyun' },
        account: { type: 'string', default: 'default' },
        name: { type: 'string', description: 'Name of the new folder' },
        parent: { type: 'string', description: 'Parent folder file_id (or "root")' },
        drive_id: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'files_move_apply',
    description: 'Validate and apply a move plan. Use dry_run=true first to preview. Plan items need: file_id, name, from_parent_file_id, to_parent_file_id. Dropbox/Baidu also need from_path and to_folder_path.',
    inputSchema: {
      type: 'object',
      properties: {
        plan: { type: 'object', description: 'Move plan object: { version:1, operation:"move", provider, account_id, items:[...] }' },
        dry_run: { type: 'boolean', description: 'If true, preview only without making changes', default: true },
      },
      required: ['plan'],
    },
  },
  {
    name: 'files_trash_apply',
    description: 'Trash files from a plan. Defaults to dry-run — set apply=true to actually trash. No undo available from CLI.',
    inputSchema: {
      type: 'object',
      properties: {
        plan: { type: 'object', description: 'Trash plan object: { version:1, operation:"trash", provider, account_id, items:[...] }' },
        apply: { type: 'boolean', description: 'Set true to execute; default is dry-run only', default: false },
      },
      required: ['plan'],
    },
  },
]

async function callTool(name, input, env) {
  const argv = buildArgv(name, input)
  if (!argv) return { error: `Unknown tool: ${name}` }
  const result = await runBoxPlayerCli(argv, env)
  if (result.exitCode !== 0) {
    return { error: result.stderr.trim() || 'Command failed', exitCode: result.exitCode }
  }
  try {
    return JSON.parse(result.stdout)
  } catch {
    return result.stdout.trim()
  }
}

function buildArgv(name, input) {
  switch (name) {
    case 'files_search':
      return [
        'files', 'search',
        '--provider', input.provider || 'aliyun',
        '--account', input.account || 'default',
        ...(input.name ? ['--name', input.name] : []),
        ...(input.query ? ['--query', input.query] : []),
        ...(input.drive_id ? ['--drive-id', input.drive_id] : []),
        ...(input.limit ? ['--limit', String(input.limit)] : []),
        '--json',
      ]
    case 'files_list':
      return [
        'files', 'list',
        '--provider', input.provider || 'aliyun',
        '--account', input.account || 'default',
        '--path', input.path || 'root',
        ...(input.drive_id ? ['--drive-id', input.drive_id] : []),
        '--json',
      ]
    case 'files_walk':
      return [
        'files', 'walk',
        '--provider', input.provider || 'aliyun',
        '--account', input.account || 'default',
        '--path', input.path || 'root',
        ...(input.drive_id ? ['--drive-id', input.drive_id] : []),
        '--json',
      ]
    case 'media_rename_plan':
      return null
    case 'media_scan':
      return null
    case 'media_match':
      return null
    case 'media_organize_plan':
      return null
    case 'files_rename_apply':
      return null
    case 'ops_list':
      return ['ops', 'list', '--json']
    case 'ops_show':
      return ['ops', 'show', input.id || '', '--json']
    case 'ops_undo':
      return null
    case 'auth_list':
      return ['auth', 'list', '--json']
    case 'files_tree':
      return [
        'files', 'tree',
        '--provider', input.provider || 'aliyun',
        '--account', input.account || 'default',
        '--path', input.path || 'root',
        ...(input.depth ? ['--depth', String(input.depth)] : []),
        ...(input.drive_id ? ['--drive-id', input.drive_id] : []),
        '--json',
      ]
    case 'files_stats':
      return [
        'files', 'stats',
        '--provider', input.provider || 'aliyun',
        '--account', input.account || 'default',
        '--path', input.path || 'root',
        ...(input.depth ? ['--depth', String(input.depth)] : []),
        ...(input.drive_id ? ['--drive-id', input.drive_id] : []),
        '--json',
      ]
    case 'files_info':
      return [
        'files', 'info',
        '--file-id', input.file_id || '',
        '--provider', input.provider || 'aliyun',
        '--account', input.account || 'default',
        ...(input.drive_id ? ['--drive-id', input.drive_id] : []),
        '--json',
      ]
    case 'files_mkdir':
      return [
        'files', 'mkdir',
        '--name', input.name || '',
        '--provider', input.provider || 'aliyun',
        '--account', input.account || 'default',
        ...(input.parent ? ['--parent', input.parent] : []),
        ...(input.drive_id ? ['--drive-id', input.drive_id] : []),
        '--json',
      ]
    case 'files_move_apply':
      return null
    case 'files_trash_apply':
      return null
    default:
      return null
  }
}

async function callToolDirect(name, input, env) {
  if (name === 'media_rename_plan') {
    const { generateMediaRenamePlan } = await import('../media/mediaRenamePlanner.mjs')
    return generateMediaRenamePlan({
      provider: input.provider || 'aliyun',
      accountId: input.account || 'default',
      items: input.items || [],
      style: input.style || 'jellyfin',
    })
  }

  if (name === 'media_rename_plan') {
    const { generateMediaRenamePlan } = await import('../media/mediaRenamePlanner.mjs')
    return generateMediaRenamePlan({
      provider: input.provider || 'aliyun',
      accountId: input.account || 'default',
      items: input.items || [],
      style: input.style || 'jellyfin',
    })
  }

  if (name === 'media_scan') {
    const { scanMediaItems } = await import('../media/mediaScanner.mjs')
    return scanMediaItems(input.items || [])
  }

  if (name === 'media_match') {
    const { matchMediaItems } = await import('../media/mediaScanner.mjs')
    return matchMediaItems(input.items || [])
  }

  if (name === 'media_organize_plan') {
    const { generateOrganizePlan } = await import('../media/mediaOrganizer.mjs')
    return generateOrganizePlan({
      provider: input.provider || 'aliyun',
      accountId: input.account || 'default',
      items: input.items || [],
      style: input.style || 'jellyfin',
      rootFileId: input.root_file_id || 'root',
      driveId: input.drive_id || '',
    })
  }

  if (name === 'files_rename_apply') {
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { writeFile, unlink } = await import('node:fs/promises')
    const { randomUUID } = await import('node:crypto')
    const planPath = join(tmpdir(), `bpcli-plan-${randomUUID()}.json`)
    try {
      await writeFile(planPath, JSON.stringify(input.plan), 'utf8')
      const argv = ['files', 'rename-apply', planPath, '--json']
      if (input.dry_run !== false) argv.push('--dry-run')
      const result = await runBoxPlayerCli(argv, env)
      if (result.exitCode !== 0) return { error: result.stderr.trim(), exitCode: result.exitCode }
      return JSON.parse(result.stdout)
    } finally {
      await unlink(planPath).catch(() => {})
    }
  }

  if (name === 'ops_undo') {
    const { createOperationLogStore, createUndoRenamePlan, createUndoMovePlan } = await import('../core/operationLog.mjs')
    const store = createOperationLogStore({ configDir: env.configDir })
    const operation = await store.get(input.id)
    if (!operation) return { error: `Unknown operation: ${input.id}` }

    let undoPlan
    let applyCommand
    if (operation.type === 'move') {
      undoPlan = createUndoMovePlan(operation)
      applyCommand = 'move-apply'
    } else {
      undoPlan = createUndoRenamePlan(operation)
      applyCommand = 'rename-apply'
    }

    if (input.dry_run === false) {
      const { tmpdir } = await import('node:os')
      const { join } = await import('node:path')
      const { writeFile, unlink } = await import('node:fs/promises')
      const { randomUUID } = await import('node:crypto')
      const planPath = join(tmpdir(), `bpcli-undo-${randomUUID()}.json`)
      try {
        await writeFile(planPath, JSON.stringify(undoPlan), 'utf8')
        const result = await runBoxPlayerCli(['files', applyCommand, planPath, '--json'], env)
        if (result.exitCode !== 0) return { error: result.stderr.trim(), exitCode: result.exitCode }
        return JSON.parse(result.stdout)
      } finally {
        await unlink(planPath).catch(() => {})
      }
    }
    return { undoPlan, message: 'Set dry_run=false to apply the undo.' }
  }

  if (name === 'files_move_apply') {
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { writeFile, unlink } = await import('node:fs/promises')
    const { randomUUID } = await import('node:crypto')
    const planPath = join(tmpdir(), `bpcli-move-${randomUUID()}.json`)
    try {
      await writeFile(planPath, JSON.stringify(input.plan), 'utf8')
      const argv = ['files', 'move-apply', planPath, '--json']
      if (input.dry_run !== false) argv.push('--dry-run')
      const result = await runBoxPlayerCli(argv, env)
      if (result.exitCode !== 0) return { error: result.stderr.trim(), exitCode: result.exitCode }
      return JSON.parse(result.stdout)
    } finally {
      await unlink(planPath).catch(() => {})
    }
  }

  if (name === 'files_trash_apply') {
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { writeFile, unlink } = await import('node:fs/promises')
    const { randomUUID } = await import('node:crypto')
    const planPath = join(tmpdir(), `bpcli-trash-${randomUUID()}.json`)
    try {
      await writeFile(planPath, JSON.stringify(input.plan), 'utf8')
      const argv = ['files', 'trash-apply', planPath, '--json']
      if (input.apply === true) argv.push('--apply')
      const result = await runBoxPlayerCli(argv, env)
      if (result.exitCode !== 0) return { error: result.stderr.trim(), exitCode: result.exitCode }
      return JSON.parse(result.stdout)
    } finally {
      await unlink(planPath).catch(() => {})
    }
  }

  return callTool(name, input, env)
}

function respond(id, result) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result })
  process.stdout.write(`Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`)
}

function respondError(id, code, message) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })
  process.stdout.write(`Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`)
}

export async function runMcpServer(env = {}) {
  const chunks = []
  let expectedLength = -1

  process.stdin.on('data', async (chunk) => {
    chunks.push(chunk)
    const buf = Buffer.concat(chunks)
    const str = buf.toString('utf8')

    const headerEnd = str.indexOf('\r\n\r\n')
    if (headerEnd === -1) return

    if (expectedLength === -1) {
      const header = str.slice(0, headerEnd)
      const match = header.match(/Content-Length:\s*(\d+)/i)
      if (!match) return
      expectedLength = parseInt(match[1], 10)
    }

    const body = buf.slice(Buffer.byteLength(str.slice(0, headerEnd + 4)))
    if (body.length < expectedLength) return

    chunks.length = 0
    expectedLength = -1

    let req
    try {
      req = JSON.parse(body.slice(0, expectedLength === -1 ? undefined : expectedLength).toString('utf8'))
    } catch {
      respondError(null, -32700, 'Parse error')
      return
    }

    const { id, method, params } = req

    if (method === 'initialize') {
      respond(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'clouddrive-cli', version: '1.0.0' },
      })
      return
    }

    if (method === 'tools/list') {
      respond(id, { tools: TOOLS })
      return
    }

    if (method === 'tools/call') {
      const toolName = params?.name
      const toolInput = params?.arguments || {}
      try {
        const result = await callToolDirect(toolName, toolInput, env)
        respond(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        })
      } catch (e) {
        respondError(id, -32603, e?.message || 'Internal error')
      }
      return
    }

    if (method === 'notifications/initialized') return

    respondError(id, -32601, `Method not found: ${method}`)
  })

  process.stdin.resume()
}
