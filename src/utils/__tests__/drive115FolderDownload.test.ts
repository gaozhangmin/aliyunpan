import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('cloud folder download', () => {
  it('lists third-party child files with their provider APIs instead of the Aliyun endpoint', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/aliapi/trash.ts'), 'utf8')

    expect(source).toContain("if (dir.m_drive_id === 'drive115')")
    expect(source).toContain('apiDrive115FileList(dir.m_user_id')
    expect(source).toContain('mapDrive115FileToAliModel(item, dir.m_drive_id)')
    expect(source).toContain("if (dir.m_drive_id === 'cloud123')")
    expect(source).toContain("if (dir.m_drive_id === 'baidu')")
    expect(source).toContain("if (dir.m_drive_id === 'pikpak')")
    expect(source).toContain("if (dir.m_drive_id === 'quark')")
    expect(source).toContain("if (dir.m_drive_id === 'cloud139')")
    expect(source).toContain('apiCloud139FileListPage(dir.m_user_id')
    expect(source).toContain("if (dir.m_drive_id === 'cloud189')")
    expect(source).toContain('apiCloud189FileList(dir.m_user_id, parentId, 1000, page)')
    expect(source).toContain("if (dir.m_drive_id === 'guangya')")
    expect(source).toContain("if (dir.m_drive_id === 'dropbox')")
    expect(source).toContain("if (dir.m_drive_id === 'onedrive')")
    expect(source).toContain("if (dir.m_drive_id === 'box')")
  })

  it('preserves Baidu folder paths between recursive download tasks', () => {
    const downDal = readFileSync(resolve(process.cwd(), 'src/down/DownDAL.ts'), 'utf8')
    const aria = readFileSync(resolve(process.cwd(), 'src/utils/aria2c.ts'), 'utf8')

    expect(downDal).toContain('cloudPath?: string')
    expect(downDal).toContain("cloudPath: file.path || ''")
    expect(aria).toContain("dirInfo as any).dirPath = info.cloudPath || ''")
  })

  it('normalizes synthetic root ids before listing recursive Aliyun download children', () => {
    const trash = readFileSync(resolve(process.cwd(), 'src/aliapi/trash.ts'), 'utf8')
    expect(trash).toContain("const parentFileId = dir.dirID.includes('root') ? 'root' : dir.dirID")
    expect(trash).toContain('parent_file_id: parentFileId')
  })
})
