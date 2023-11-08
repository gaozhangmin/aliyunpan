import { app } from 'electron'
import path from 'path'
import { copyFileSync, existsSync, rmSync } from 'fs'
import is from 'electron-is'

let NewCopyed = false
let NewSaved = false

export function getAsarPath(fileName: string) {
  if (is.dev()) {
    const basePath = path.resolve(app.getAppPath())
    return path.join(basePath, fileName)
  } else {
    const basePath = path.resolve(app.getAppPath())
    const baseNew = path.join(basePath, '..', 'app.new')
    const baseSave = path.join(basePath, '..', 'app.asar')
    if (!NewCopyed) {
      // 热更新asar
      if (existsSync(baseNew)) {
        try {
          console.log('copyFileSync', baseNew, '-->', baseSave)
          copyFileSync(baseNew, baseSave)
          rmSync(baseNew, { force: true })
          NewCopyed = true
        } catch (err: any) {
          console.log(err)
        }
      }
    }
    if (!NewSaved) NewSaved = existsSync(baseSave)
    if (NewSaved) return path.join(baseSave, fileName)
    return path.join(basePath, fileName)
  }
}

export function getResourcesPath(fileName: string) {
  let basePath = path.resolve(app.getAppPath(), '..')
  if (is.dev()) basePath = path.resolve(app.getAppPath(), '.')
  return path.join(basePath, fileName)
}

export function getStaticPath(fileName: string) {
  let basePath = path.resolve(app.getAppPath(), '..')
  if (is.dev()) basePath = path.resolve(app.getAppPath(), './static')
  if (fileName.startsWith('icon')) {
    if (fileName == 'icon_256x256.ico' && !is.windows()) {
      fileName = path.join('images', 'icon_24x24.png')
    } else {
      fileName = path.join('images', fileName)
    }
  }
  return path.join(basePath, fileName)
}

export function getUserDataPath(fileName: string) {
  return path.join(app.getPath('userData'), fileName)
}
