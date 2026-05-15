import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { generateMediaRenamePlan } from '../media/mediaRenamePlanner.mjs'
import { scanMediaItems, matchMediaItems } from '../media/mediaScanner.mjs'
import { generateOrganizePlan } from '../media/mediaOrganizer.mjs'
import { runBoxPlayerCli } from '../core/commands.mjs'

import type { MediaFileItem } from '../media/mediaRenamePlanner.mjs'

function makeItem(overrides: Partial<MediaFileItem>): MediaFileItem {
  return {
    file_id: 'file-1',
    parent_file_id: 'parent-1',
    drive_id: 'drive-1',
    type: 'file',
    name: '',
    ...overrides,
  }
}

describe('generateMediaRenamePlan - movies', () => {
  it('normalizes a dot-separated movie filename with year', () => {
    const items = [makeItem({ name: 'The.Dark.Knight.2008.1080p.BluRay.mkv' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].new_name).toBe('The Dark Knight (2008).mkv')
  })

  it('normalizes a movie filename without year', () => {
    const items = [makeItem({ name: 'Inception.BluRay.1080p.x264.mkv' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].new_name).toBe('Inception.mkv')
  })

  it('skips a file that already matches target format', () => {
    const items = [makeItem({ name: 'The Dark Knight (2008).mkv' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(0)
    expect(plan.skipped).toHaveLength(1)
    expect(plan.skipped[0].reason).toMatch(/already matches/)
  })

  it('skips non-media files', () => {
    const items = [makeItem({ name: 'readme.txt' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(0)
    expect(plan.skipped[0].reason).toMatch(/Not a recognized media/)
  })
})

describe('generateMediaRenamePlan - episodes', () => {
  it('normalizes SxxExx format', () => {
    const items = [makeItem({ name: 'The.Last.of.Us.S01E01.1080p.WEBRip.mkv' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].new_name).toBe('The Last of Us - S01E01.mkv')
  })

  it('normalizes episode with year', () => {
    const items = [makeItem({ name: 'Succession.2018.S03E04.HDTV.mkv' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].new_name).toBe('Succession (2018) - S03E04.mkv')
  })

  it('normalizes NxNN season-episode format', () => {
    const items = [makeItem({ name: 'Breaking.Bad.3x07.BluRay.mkv' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].new_name).toBe('Breaking Bad - S03E07.mkv')
  })

  it('normalizes EP-only episode (no season → defaults to S01)', () => {
    const items = [makeItem({ name: 'Some.Show.EP03.720p.mkv' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].new_name).toBe('Some Show - S01E03.mkv')
  })

  it('normalizes Chinese episode marker', () => {
    const items = [makeItem({ name: '知否知否应是绿肥红瘦第03集.mp4' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].new_name).toMatch(/S01E03/)
  })
})

describe('generateMediaRenamePlan - folders', () => {
  it('normalizes a series folder with year', () => {
    const items = [makeItem({ type: 'folder', name: 'Breaking.Bad.2008' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].new_name).toBe('Breaking Bad (2008)')
  })

  it('normalizes a Season folder', () => {
    const items = [makeItem({ type: 'folder', name: 'Season 1' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].new_name).toBe('Season 01')
  })

  it('normalizes a Season folder from Chinese', () => {
    const items = [makeItem({ type: 'folder', name: '第1季' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].new_name).toBe('Season 01')
  })
})

describe('generateMediaRenamePlan - subtitles', () => {
  it('renames subtitle to match sibling video filename', () => {
    const video = makeItem({ file_id: 'v1', name: 'The Last of Us - S01E01.mkv' })
    const sub = makeItem({ file_id: 's1', name: 'The.Last.of.Us.S01E01.srt' })
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items: [video, sub] })
    const subItem = plan.items.find((i) => i.file_id === 's1')
    expect(subItem).toBeDefined()
    expect(subItem!.new_name).toBe('The Last of Us - S01E01.srt')
  })

  it('falls back to episode naming when no sibling video matches', () => {
    const sub = makeItem({ file_id: 's1', name: 'Show.S02E05.srt' })
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items: [sub] })
    const subItem = plan.items.find((i) => i.file_id === 's1')
    expect(subItem).toBeDefined()
    expect(subItem!.new_name).toMatch(/S02E05\.srt$/)
  })
})

describe('generateMediaRenamePlan - plan metadata', () => {
  it('includes version, operation, provider, account_id, style, created_at', () => {
    const items = [makeItem({ name: 'Movie.2020.mkv' })]
    const plan = generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items, style: 'plex' })
    expect(plan.version).toBe(1)
    expect(plan.operation).toBe('rename')
    expect(plan.provider).toBe('aliyun')
    expect(plan.account_id).toBe('acc1')
    expect(plan.style).toBe('plex')
    expect(typeof plan.created_at).toBe('string')
  })

  it('throws when provider is missing', () => {
    expect(() =>
      generateMediaRenamePlan({ provider: '', accountId: 'acc1', items: [makeItem({ name: 'a.mkv' })] })
    ).toThrow('provider is required')
  })

  it('throws when items is empty', () => {
    expect(() =>
      generateMediaRenamePlan({ provider: 'aliyun', accountId: 'acc1', items: [] })
    ).toThrow('items must be a non-empty array')
  })
})

describe('media rename-plan CLI command', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'bpcli-media-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('generates a rename plan JSON from --input file', async () => {
    const items = [
      { file_id: 'f1', parent_file_id: 'p1', drive_id: 'd1', type: 'file', name: 'The.Dark.Knight.2008.BluRay.mkv' },
      { file_id: 'f2', parent_file_id: 'p1', drive_id: 'd1', type: 'file', name: 'Inception.2010.1080p.mkv' },
    ]
    const inputPath = join(tmpDir, 'files.json')
    await writeFile(inputPath, JSON.stringify(items), 'utf8')

    const result = await runBoxPlayerCli(
      ['media', 'rename-plan', '--input', inputPath, '--provider', 'aliyun', '--account', 'acc1', '--json'],
      { configDir: tmpDir }
    )

    expect(result.exitCode).toBe(0)
    const plan = JSON.parse(result.stdout)
    expect(plan.version).toBe(1)
    expect(plan.operation).toBe('rename')
    expect(plan.items.length).toBeGreaterThan(0)
    const darkKnight = plan.items.find((i: { old_name: string }) => i.old_name.includes('Dark.Knight'))
    expect(darkKnight.new_name).toBe('The Dark Knight (2008).mkv')
  })

  it('writes output file when --output is specified', async () => {
    const items = [
      { file_id: 'f1', parent_file_id: 'p1', drive_id: 'd1', type: 'file', name: 'Dune.2021.2160p.mkv' },
    ]
    const inputPath = join(tmpDir, 'files.json')
    const outputPath = join(tmpDir, 'plan.json')
    await writeFile(inputPath, JSON.stringify(items), 'utf8')

    const result = await runBoxPlayerCli(
      ['media', 'rename-plan', '--input', inputPath, '--output', outputPath, '--json'],
      { configDir: tmpDir }
    )

    expect(result.exitCode).toBe(0)
    const { readFile: rf } = await import('node:fs/promises')
    const written = JSON.parse(await rf(outputPath, 'utf8'))
    expect(written.items[0].new_name).toBe('Dune (2021).mkv')
  })

  it('returns error when --input is missing', async () => {
    const result = await runBoxPlayerCli(
      ['media', 'rename-plan'],
      { configDir: tmpDir }
    )
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/--input/)
  })

  it('returns error for unknown media subcommand', async () => {
    const result = await runBoxPlayerCli(
      ['media', 'unknown'],
      { configDir: tmpDir }
    )
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/Unknown media command/)
  })
})

describe('scanMediaItems', () => {
  it('classifies movies, episodes, subtitles, and unrecognized', () => {
    const items = [
      makeItem({ file_id: 'f1', name: 'Inception.2010.1080p.mkv' }),
      makeItem({ file_id: 'f2', name: 'Breaking.Bad.S01E01.mkv' }),
      makeItem({ file_id: 'f3', name: 'Breaking.Bad.S01E01.srt' }),
      makeItem({ file_id: 'f4', name: 'readme.txt' }),
    ]
    const report = scanMediaItems(items)
    expect(report.summary.movies).toBe(1)
    expect(report.summary.episodes).toBe(1)
    expect(report.summary.subtitles).toBe(1)
    expect(report.summary.unrecognized).toBe(1)
    expect(report.movies[0].title).toBe('Inception')
    expect(report.movies[0].year).toBe(2010)
  })

  it('detects season folders and series folders', () => {
    const items = [
      makeItem({ file_id: 'f1', type: 'folder', name: 'Breaking.Bad.2008' }),
      makeItem({ file_id: 'f2', type: 'folder', name: 'Season 1' }),
    ]
    const report = scanMediaItems(items)
    expect(report.season_folders).toHaveLength(1)
    expect(report.season_folders[0].season).toBe(1)
    expect(Object.keys(report.series)).toHaveLength(1)
  })

  it('detects suspected duplicates', () => {
    const items = [
      makeItem({ file_id: 'f1', name: 'Breaking.Bad.S01E01.1080p.mkv' }),
      makeItem({ file_id: 'f2', name: 'Breaking.Bad.S01E01.720p.mkv' }),
    ]
    const report = scanMediaItems(items)
    expect(report.suspected_duplicates).toHaveLength(1)
    expect(report.suspected_duplicates[0].items).toHaveLength(2)
  })

  it('groups episodes by series', () => {
    const items = [
      makeItem({ file_id: 'f1', name: 'The.Last.of.Us.S01E01.mkv' }),
      makeItem({ file_id: 'f2', name: 'The.Last.of.Us.S01E02.mkv' }),
    ]
    const report = scanMediaItems(items)
    const key = Object.keys(report.series)[0]
    expect(report.series[key].episode_count).toBe(2)
    expect(report.series[key].seasons).toContain(1)
  })
})

describe('matchMediaItems', () => {
  it('returns high-confidence movie match with year', () => {
    const items = [makeItem({ name: 'The.Dark.Knight.2008.1080p.mkv' })]
    const matches = matchMediaItems(items)
    expect(matches[0].match.type).toBe('movie')
    expect(matches[0].match.title).toBe('The Dark Knight')
    expect(matches[0].match.year).toBe(2008)
    expect(matches[0].match.confidence).toBe('high')
    expect(matches[0].match.jellyfin_name).toBe('The Dark Knight (2008).mkv')
  })

  it('returns episode match with season and episode', () => {
    const items = [makeItem({ name: 'Breaking.Bad.S03E07.BluRay.mkv' })]
    const matches = matchMediaItems(items)
    expect(matches[0].match.type).toBe('episode')
    expect(matches[0].match.season).toBe(3)
    expect(matches[0].match.episode).toBe(7)
    expect(matches[0].match.jellyfin_name).toMatch(/S03E07/)
  })

  it('returns subtitle match with episode info', () => {
    const items = [makeItem({ name: 'Show.S02E05.srt' })]
    const matches = matchMediaItems(items)
    expect(matches[0].match.type).toBe('subtitle')
    expect(matches[0].match.season).toBe(2)
    expect(matches[0].match.episode).toBe(5)
    expect(matches[0].match.jellyfin_name).toMatch(/S02E05\.srt$/)
  })

  it('returns season folder match', () => {
    const items = [makeItem({ type: 'folder', name: '第2季' })]
    const matches = matchMediaItems(items)
    expect(matches[0].match.type).toBe('season_folder')
    expect(matches[0].match.jellyfin_name).toBe('Season 02')
  })

  it('returns none confidence for non-media files', () => {
    const items = [makeItem({ name: 'document.pdf' })]
    const matches = matchMediaItems(items)
    expect(matches[0].match.confidence).toBe('none')
  })
})

describe('generateOrganizePlan', () => {
  it('throws when provider is missing', () => {
    expect(() => generateOrganizePlan({ provider: '', accountId: 'acc1', items: [makeItem({ name: 'a.mkv' })] }))
      .toThrow('provider is required')
  })

  it('throws when items is empty', () => {
    expect(() => generateOrganizePlan({ provider: 'aliyun', accountId: 'acc1', items: [] }))
      .toThrow('items must be a non-empty array')
  })

  it('generates mkdirs for movie structure', () => {
    const items = [makeItem({ file_id: 'f1', name: 'Inception.2010.mkv' })]
    const plan = generateOrganizePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.operation).toBe('organize')
    expect(plan.mkdirs.some((d) => d.path === 'Movies')).toBe(true)
    expect(plan.mkdirs.some((d) => d.path.includes('Inception'))).toBe(true)
    expect(plan.moves).toHaveLength(1)
    expect(plan.moves[0].to_path).toContain('Movies/Inception')
  })

  it('generates mkdirs for TV series structure', () => {
    const items = [makeItem({ file_id: 'f1', name: 'Breaking.Bad.S02E05.mkv' })]
    const plan = generateOrganizePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.mkdirs.some((d) => d.path === 'TV Shows')).toBe(true)
    expect(plan.mkdirs.some((d) => d.path.includes('Breaking Bad'))).toBe(true)
    expect(plan.mkdirs.some((d) => d.path.includes('Season 02'))).toBe(true)
    expect(plan.moves[0].to_path).toMatch(/TV Shows\/.*Season 02/)
  })

  it('includes renames in the plan', () => {
    const items = [makeItem({ file_id: 'f1', name: 'Dune.2021.2160p.BluRay.mkv' })]
    const plan = generateOrganizePlan({ provider: 'aliyun', accountId: 'acc1', items })
    expect(plan.renames).toHaveLength(1)
    expect(plan.renames[0].new_name).toBe('Dune (2021).mkv')
  })

  it('respects custom root_file_id', () => {
    const items = [makeItem({ file_id: 'f1', name: 'Inception.2010.mkv' })]
    const plan = generateOrganizePlan({ provider: 'aliyun', accountId: 'acc1', items, rootFileId: 'my-media-folder' })
    const moviesDir = plan.mkdirs.find((d) => d.path === 'Movies')
    expect(moviesDir?.parent_file_id).toBe('my-media-folder')
  })
})

describe('media scan / match / organize-plan CLI commands', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'bpcli-media-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('media scan produces summary JSON', async () => {
    const items = [
      { file_id: 'f1', parent_file_id: 'p', drive_id: 'd', type: 'file', name: 'Dune.2021.mkv' },
      { file_id: 'f2', parent_file_id: 'p', drive_id: 'd', type: 'file', name: 'Show.S01E01.mkv' },
      { file_id: 'f3', parent_file_id: 'p', drive_id: 'd', type: 'file', name: 'note.txt' },
    ]
    const inputPath = join(tmpDir, 'files.json')
    await writeFile(inputPath, JSON.stringify(items), 'utf8')

    const result = await runBoxPlayerCli(['media', 'scan', '--input', inputPath, '--json'], { configDir: tmpDir })

    expect(result.exitCode).toBe(0)
    const report = JSON.parse(result.stdout)
    expect(report.summary.movies).toBe(1)
    expect(report.summary.episodes).toBe(1)
    expect(report.summary.unrecognized).toBe(1)
    expect(report.movies[0].title).toBe('Dune')
  })

  it('media match returns per-item matches', async () => {
    const items = [
      { file_id: 'f1', parent_file_id: 'p', drive_id: 'd', type: 'file', name: 'The.Dark.Knight.2008.mkv' },
    ]
    const inputPath = join(tmpDir, 'files.json')
    await writeFile(inputPath, JSON.stringify(items), 'utf8')

    const result = await runBoxPlayerCli(['media', 'match', '--input', inputPath, '--json'], { configDir: tmpDir })

    expect(result.exitCode).toBe(0)
    const matches = JSON.parse(result.stdout)
    expect(matches).toHaveLength(1)
    expect(matches[0].match.type).toBe('movie')
    expect(matches[0].match.jellyfin_name).toBe('The Dark Knight (2008).mkv')
  })

  it('media organize-plan writes output file', async () => {
    const items = [
      { file_id: 'f1', parent_file_id: 'p', drive_id: 'd', type: 'file', name: 'Inception.2010.1080p.mkv' },
    ]
    const inputPath = join(tmpDir, 'files.json')
    const outputPath = join(tmpDir, 'organize-plan.json')
    await writeFile(inputPath, JSON.stringify(items), 'utf8')

    const result = await runBoxPlayerCli(
      ['media', 'organize-plan', '--input', inputPath, '--output', outputPath, '--provider', 'aliyun', '--account', 'acc1'],
      { configDir: tmpDir }
    )

    expect(result.exitCode).toBe(0)
    const { readFile } = await import('node:fs/promises')
    const plan = JSON.parse(await readFile(outputPath, 'utf8'))
    expect(plan.operation).toBe('organize')
    expect(plan.mkdirs.length).toBeGreaterThan(0)
    expect(plan.moves.length).toBeGreaterThan(0)
  })

  it('media scan returns error when --input is missing', async () => {
    const result = await runBoxPlayerCli(['media', 'scan'], { configDir: tmpDir })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/--input/)
  })
})
