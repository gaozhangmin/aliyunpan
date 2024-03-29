import AliLockManager from './AliLockManager'
import VirtualFileResources from '../resource/VirtualFileResource'
import Parser from '../helper/propertyParser'
import { Readable, Writable } from 'node:stream'
import {
  CopyInfo,
  CreateInfo,
  DeleteInfo,
  Errors,
  FileSystem,
  ILockManager,
  IPropertyManager,
  LastModifiedDateInfo,
  LocalLockManager,
  LocalPropertyManager,
  LockManagerInfo,
  MoveInfo,
  OpenReadStreamInfo,
  OpenWriteStreamInfo,
  Path,
  PropertyManagerInfo,
  ReadDirInfo,
  RequestContext,
  ResourceType,
  ReturnCallback,
  SimpleCallback,
  SizeInfo,
  TypeInfo
} from 'webdav-server/lib/index.v2'
import AliFileSystemSerializer from './AliFileSystemSerializer'
import { useSettingStore } from '../../../store'


const fixPath = function(path: Path) {
  if (path.paths[0] !== 'webdav') {
    path.paths.unshift('webdav')
  }
  path.paths = Array.from(new Set(path.paths))
  const removePaths = ['.ini', '.inf', '127.0.0.1', 'http', 'SystemResources']
  path.paths = path.paths.filter(path => !removePaths.some(unwantedPath => path.includes(unwantedPath)))
}


class AliFileSystem extends FileSystem {
  private readonly locks: LocalLockManager
  public manageResource: VirtualFileResources
  public props: LocalPropertyManager

  constructor(public url: string) {
    super(new AliFileSystemSerializer())
    this.props = new LocalPropertyManager()
    this.locks = new AliLockManager()
    this.manageResource = new VirtualFileResources()
  }

  _lockManager(path: Path, ctx: LockManagerInfo, callback: ReturnCallback<ILockManager>) {
    callback(Errors.None, this.locks)
  }

  _propertyManager(path: Path, ctx: PropertyManagerInfo, callback: ReturnCallback<IPropertyManager>) {
    callback(Errors.None, this.props)
  }

  _fastExistCheck(ctx: RequestContext, path: Path, callback: (exists: boolean) => void) {
    fixPath(path)
    const sPath = path.toString()
    const exist = this.manageResource.fastExistCheck(sPath, ctx)
    if (exist) {
      callback(exist)
      return
    }
    (async () => {
      try {
        const { element, parentFolder } = Parser.parsePath(sPath)
        const struct = await this.manageResource.readDir({ context: ctx }, parentFolder)
        // console.log('_fastExistCheck.struct', struct)
        if (!struct || struct instanceof Error) {
          callback(false)
          return
        }
        if (this.manageResource.findFile(struct, element)
          || this.manageResource.findFolder(struct, element)) {
          callback(true)
        } else {
          callback(false)
        }
      } catch (error) {
        callback(false)
      }
    })()
  }

  _create(path: Path, ctx: CreateInfo, callback: SimpleCallback) {
    (async () => {
      fixPath(path)
      const sPath = path.toString()
      try {
        await this.manageResource.create(ctx, sPath)
        callback()
      } catch (error: any) {
        callback(error)
      }
    })()
  }

  _delete(path: Path, ctx: DeleteInfo, callback: SimpleCallback) {
    (async () => {
      fixPath(path)
      const sPath = path.toString()
      try {
        await this.manageResource.delete(ctx, sPath)
        callback()
      } catch (error: any) {
        callback(error)
      }
    })()
  }

  _move(pathFrom: Path, pathTo: Path, ctx: MoveInfo, callback: ReturnCallback<boolean>) {
    (async () => {
      const sPathFrom = pathFrom.toString()
      const sPathTo = pathTo.toString()
      let isMove = false
      try {
        isMove = await this.manageResource.move(ctx, sPathFrom, sPathTo)
        if (!isMove) {
          callback(Errors.InvalidOperation, isMove)
        } else {
          callback(Errors.None, isMove)
        }
      } catch (error: any) {
        callback(error, isMove)
      }
    })()
  }

  _copy(pathFrom: Path, pathTo: Path, ctx: CopyInfo, callback: ReturnCallback<boolean>) {
    (async () => {
      if (pathFrom.paths.length == 1) {
        callback(Errors.NotEnoughPrivilege, false)
        return
      }
      if (pathFrom.paths[pathFrom.paths.length - 1] == pathTo.paths[pathTo.paths.length - 1]) {
        delete pathTo.paths[pathTo.paths.length - 1]
      }
      const sPathFrom = pathFrom.toString()
      const sPathTo = pathTo.toString()
      let isCopy = false
      try {
        isCopy = await this.manageResource.copy(ctx, sPathFrom, sPathTo)
        if (!isCopy) {
          callback(Errors.InvalidOperation, isCopy)
        } else {
          callback(Errors.None, isCopy)
        }
        callback(Errors.None, isCopy)
      } catch (error: any) {
        callback(error, isCopy)
      }
    })()
  }

  _size(path: Path, ctx: SizeInfo, callback: ReturnCallback<number>) {
    fixPath(path)
    const sPath = path.toString()
    const size = this.manageResource.getSize(sPath, ctx)
    callback(Errors.None, size)
  }

  _openWriteStream(path: Path, ctx: OpenWriteStreamInfo, callback: ReturnCallback<Writable>) {
    const sPath = path.toString();
    (async () => {
      try {
        fixPath(path)
        const streamWrite = await this.manageResource.writeFile(ctx, sPath)
        callback(Errors.None, streamWrite)
      } catch (error: any) {
        callback(error, undefined)
      }
    })()
  }

  _openReadStream(path: Path, ctx: OpenReadStreamInfo, callback: ReturnCallback<Readable>) {
    (async () => {
      try {
        fixPath(path)
        const sPath = path.toString()
        let readStream = undefined
        try {
          if (useSettingStore().webDavStrategy === 'proxy') {
            readStream = await this.manageResource.getReadStream(ctx, sPath)
            callback(Errors.None, readStream)
          } else {
            readStream = new Readable({
              read() {
                this.push('')
              },
              autoDestroy: true
            })
            callback(Errors.None, readStream)
          }
        } catch (error: any) {
          callback(error, readStream)
        }
      } catch (error: any) {
        callback(error, undefined)
      }
    })()
  }

  _type(path: Path, ctx: TypeInfo, callback: ReturnCallback<ResourceType>) {
    fixPath(path)
    const sPath = path.toString()
    const type = this.manageResource.getType(sPath, ctx)
    callback(Errors.None, type)
  }

  _lastModifiedDate(path: Path, ctx: LastModifiedDateInfo, callback: ReturnCallback<number>) {
    fixPath(path)
    const sPath = path.toString()
    const date = this.manageResource.getLastModifiedDate(sPath, ctx)
    callback(Errors.None, date)
  }

  _readDir(path: Path, ctx: ReadDirInfo, callback: ReturnCallback<string[] | Path[]>) {
    (async () => {
      fixPath(path)
      const sPath = path.toString()
      const elements: string[] = []
      try {
        // console.log('readDir.path', sPath)
        const struct = await this.manageResource.readDir(ctx, sPath)
        // console.log('_readDir.struct', struct)
        if (struct instanceof Error) {
          callback(struct)
          return
        }
        struct.folders.forEach((el: any) => {
          elements.push(el.name)
        })
        struct.files.forEach((el: any) => {
          elements.push(el.name)
        })
        callback(Errors.None, elements)
      } catch (error: any) {
        console.error('_readDir.error', error)
        callback(error)
      }
    })()
  }
}

export default AliFileSystem