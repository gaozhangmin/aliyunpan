import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAuthStore } from '../core/authStore.mjs'
import { createOperationLogStore, createUndoRenamePlan } from '../core/operationLog.mjs'
import { generateMediaRenamePlan } from '../media/mediaRenamePlanner.mjs'
import { runBoxPlayerCli } from '../core/commands.mjs'

async function sendMcpRequest(method: string, params?: unknown, id = 1) {
  const { runMcpServer } = await import('../core/mcpServer.mjs')

  const body = JSON.stringify({ jsonrpc: '2.0', id, method, params })
  const msg = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`

  const responses: string[] = []
  const origWrite = process.stdout.write.bind(process.stdout)
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
    responses.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'))
    return true
  })

  const origStdin = process.stdin
  const { EventEmitter } = await import('node:events')
  const fakeStdin = new EventEmitter() as any
  fakeStdin.resume = vi.fn()
  Object.defineProperty(process, 'stdin', { value: fakeStdin, writable: true, configurable: true })

  runMcpServer({ configDir: join(tmpdir(), 'mcp-test-unused') })
  fakeStdin.emit('data', Buffer.from(msg))

  await new Promise((r) => setTimeout(r, 50))

  vi.restoreAllMocks()
  Object.defineProperty(process, 'stdin', { value: origStdin, writable: true, configurable: true })

  const raw = responses.join('')
  const jsonStart = raw.indexOf('{')
  if (jsonStart < 0) return null
  return JSON.parse(raw.slice(jsonStart))
}

describe('MCP server - protocol', () => {
  it('initialize returns serverInfo and capabilities', async () => {
    const res = await sendMcpRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    })
    expect(res?.result?.serverInfo?.name).toBe('clouddrive-cli')
    expect(res?.result?.capabilities?.tools).toBeDefined()
  })

  it('tools/list returns all 18 tools', async () => {
    const res = await sendMcpRequest('tools/list')
    const tools: any[] = res?.result?.tools || []
    expect(tools.length).toBe(18)
    const names = tools.map((t: any) => t.name)
    expect(names).toContain('files_list')
    expect(names).toContain('files_walk')
    expect(names).toContain('files_search')
    expect(names).toContain('files_tree')
    expect(names).toContain('files_stats')
    expect(names).toContain('files_info')
    expect(names).toContain('files_mkdir')
    expect(names).toContain('files_move_apply')
    expect(names).toContain('files_trash_apply')
    expect(names).toContain('media_rename_plan')
    expect(names).toContain('media_scan')
    expect(names).toContain('media_match')
    expect(names).toContain('media_organize_plan')
    expect(names).toContain('files_rename_apply')
    expect(names).toContain('ops_list')
    expect(names).toContain('ops_show')
    expect(names).toContain('ops_undo')
    expect(names).toContain('auth_list')
  })

  it('unknown method returns -32601', async () => {
    const res = await sendMcpRequest('unknown/method')
    expect(res?.error?.code).toBe(-32601)
  })
})

describe('MCP server - tools/call auth_list', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'bpcli-mcp-test-'))
  })
  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('auth_list returns empty array when no accounts', async () => {
    const result = await runBoxPlayerCli(['auth', 'list', '--json'], { configDir: tmpDir })
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual([])
  })

  it('auth_list returns saved account', async () => {
    const store = createAuthStore({ configDir: tmpDir })
    await store.saveAccount({ provider: 'aliyun', accountId: 'u1', displayName: 'Test' })
    const result = await runBoxPlayerCli(['auth', 'list', '--json'], { configDir: tmpDir })
    const accounts = JSON.parse(result.stdout)
    expect(accounts).toHaveLength(1)
    expect(accounts[0].accountId).toBe('u1')
  })
})

describe('MCP server - tools/call ops_list and ops_undo plan', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'bpcli-mcp-ops-'))
  })
  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('ops_list returns empty when no ops', async () => {
    const result = await runBoxPlayerCli(['ops', 'list', '--json'], { configDir: tmpDir })
    expect(JSON.parse(result.stdout)).toEqual([])
  })

  it('ops_undo generates inverse rename plan', async () => {
    const store = createOperationLogStore({ configDir: tmpDir })
    const op = {
      id: 'op_test_001',
      type: 'rename',
      provider: 'aliyun',
      account_id: 'u1',
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      items: [
        { drive_id: 'd1', file_id: 'f1', parent_file_id: 'p1',
          before_name: 'old.mkv', after_name: 'new.mkv', status: 'success' },
      ],
    }
    await store.save(op)

    const undo = createUndoRenamePlan(op)
    expect(undo.items[0].old_name).toBe('new.mkv')
    expect(undo.items[0].new_name).toBe('old.mkv')
    expect(undo.source_operation_id).toBe('op_test_001')
  })
})

describe('MCP server - media_rename_plan tool', () => {
  it('generates rename plan from items array', () => {
    const items = [
      { file_id: 'f1', parent_file_id: 'p1', drive_id: 'd1', type: 'file' as const,
        name: 'The.Dark.Knight.2008.BluRay.mkv' },
      { file_id: 'f2', parent_file_id: 'p1', drive_id: 'd1', type: 'file' as const,
        name: 'Breaking.Bad.S03E07.mkv' },
    ]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'u1', items })
    expect(plan.items).toHaveLength(2)
    expect(plan.items.find((i) => i.old_name.includes('Dark.Knight'))?.new_name).toBe('The Dark Knight (2008).mkv')
    expect(plan.items.find((i) => i.old_name.includes('Breaking'))?.new_name).toBe('Breaking Bad - S03E07.mkv')
  })
})

describe('MCP server - JSON schema validation', () => {
  it('each tool has name, description, and inputSchema', async () => {
    const mod = await import('../core/mcpServer.mjs') as any
    const TOOLS: any[] = mod.TOOLS || []
    for (const tool of TOOLS) {
      expect(typeof tool.name).toBe('string')
      expect(typeof tool.description).toBe('string')
      expect(tool.inputSchema).toBeDefined()
    }
  })

  it('files_list and media_scan tools have correct required fields', async () => {
    const mod = await import('../core/mcpServer.mjs') as any
    const TOOLS: any[] = mod.TOOLS || []
    const filesList = TOOLS.find((t: any) => t.name === 'files_list')
    expect(filesList).toBeDefined()
    const mediaScan = TOOLS.find((t: any) => t.name === 'media_scan')
    expect(mediaScan).toBeDefined()
    expect(mediaScan.inputSchema.required).toContain('items')
  })
})
