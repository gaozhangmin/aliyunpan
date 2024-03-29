import ResourceStruct, { FileOrFolder, StructDirectory } from './ResourceStruct'
import Parser from '../helper/propertyParser'
import Request from '../request'
import {
  CopyInfo,
  CreateInfo,
  DeleteInfo,
  Errors,
  IContextInfo,
  IUser,
  LastModifiedDateInfo,
  MimeTypeInfo,
  MoveInfo,
  OpenReadStreamInfo,
  OpenWriteStreamInfo,
  RequestContext,
  ResourceType,
  SimplePathPrivilegeManager,
  SizeInfo,
  TypeInfo
} from 'webdav-server/lib/index.v2'
import StreamWrite from '../helper/writable'
import UserDAL from '../../../user/userdal'
import { usePanTreeStore } from '../../../store'

class VirtualFileResources {
  public struct_cache: ResourceStruct
  private created_now: any[]

  constructor() {
    this.struct_cache = new ResourceStruct()
    this.created_now = []
  }

  async getRootFolder(ctx: IContextInfo, user: any) {
    const structRoot: any = {
      files: [],
      folders: [],
      current: {}
    }
    try {
      let rootStructDir = await Request.getStructDirectory(ctx, '', 'root')
      if (Array.isArray(rootStructDir)) {
        for (let structDir of rootStructDir) {
          structRoot.folders.push(structDir.current)
        }
      }
      return structRoot
    } catch (error) {
      return Errors.ResourceNotFound
    }
  }

  findFolder(struct: any, element: string): FileOrFolder | null {
    try {
      return struct.folders.find((folder: any) => folder.name == element)
    } catch (error) {
      return null
    }
  }

  findFile(struct: any, element: string): FileOrFolder | null {
    try {
      return struct.files.find((file: any) => file.name == element)
    } catch (error) {
      return null
    }
  }

  fastExistCheck(path: string, ctx: RequestContext) {
    if (path == '/') {
      return true
    }
    const user = ctx.user
    let { element, parentFolder } = Parser.parsePath(path)
    let struct = this.struct_cache.getStruct(parentFolder, user.uid)
    if (struct) {
      if (this.findFile(struct, element) || this.findFolder(struct, element)) {
        return true
      }
    }
    return false
  }

  async create(ctx: CreateInfo, path: string) {
    console.error('create.ctx', ctx)
    const user = ctx.context.user
    let { element, parentFolder } = Parser.parsePath(path)
    let current = this.struct_cache.getStruct(parentFolder, user.uid).current
    if (ctx.type.isDirectory) {
      let createdObj = await Request.createFolder(ctx, current.drive_id, current.file_id, element)
      this.struct_cache.setFolderObject(parentFolder, user.uid, createdObj)
      await this.readDir(ctx, path)
    }
    if (ctx.type.isFile) {
      let fileExt = Parser.parseFileExt(element)
      let newFile: any = {}
      if (fileExt == 'txt') {
        newFile = await Request.createFile(ctx, current.drive_id, current.file_id, element, '')
      } else {
        newFile = {
          name: element,
          drive_id: current.drive_id,
          file_id: '',
          parent_file_id: current.file_id,
          size: 0
        }
      }
      this.created_now.push(newFile)
      this.struct_cache.setFileObject(parentFolder, user.uid, newFile)
    }
  }

  async delete(ctx: DeleteInfo, path: string) {
    console.log('delete', ctx.context.user.username, path)
    const user = ctx.context.user
    let { element, parentFolder } = Parser.parsePath(path)
    const struct = this.struct_cache.getStruct(parentFolder, user.uid)
    try {
      const folder = this.findFolder(struct, element)
      if (folder) {
        const resp = await Request.deleteFolder(ctx, folder.drive_id, folder.file_id)
        this.struct_cache.dropFolderObject(parentFolder, user.uid, folder)
        this.struct_cache.dropPath(path, user.uid)
      }
      const file = this.findFile(struct, element)
      if (file) {
        const resp = await Request.deleteFile(ctx, file.drive_id, file.file_id)
        this.struct_cache.dropFileObject(parentFolder, user.uid, file)
        return true
      }
    } catch (error: any) {
      console.error('delete', error)
      throw new Error(error)
    }
  }

  private addPrivilege(ctx: IContextInfo,
                       sPath: string,
                       title: string,
                       parent_file_id: string,
                       access: number,
                       rootFolderType?: number) {
    let path = ''
    let privilageList = []
    if (parent_file_id.length > 0) {
      path = sPath + title
      privilageList = ['all']
    } else if (parent_file_id.length == 0) {
      if (rootFolderType == 1 || rootFolderType == 5) {
        path = sPath + '/' + title
        privilageList = ['all']
      } else {
        path = sPath + '/' + title
        privilageList = ['canRead']
      }
    } else switch (access) {
      case 0:
        path = sPath + '/' + title
        privilageList = ['all']
        break
      case 1:
        path = sPath + '/' + title
        privilageList = ['canRead', 'canWriteContent', 'canWriteProperties', 'canWriteLocks']
        break
      default:
        path = sPath + '/' + title
        privilageList = ['canRead']
        break
    }
    const privilegeManager = ctx.context.server.privilegeManager as SimplePathPrivilegeManager
    privilegeManager.setRights(ctx.context.user, path, privilageList)
  }

  addStructPrivilege(ctx: IContextInfo, path: string, struct: any) {
    struct.folders.forEach((el: any) => {
      this.addPrivilege(ctx, path, el.name, el.parent_file_id, el.access, el.rootFolderType)
    })

    struct.files.forEach((el: any) => {
      this.addPrivilege(ctx, path, el.name, el.parent_file_id, el.access)
    })
  }

  async readDir(ctx: IContextInfo, path: string) {
    const user = ctx.context.user
    if (path == '/') {
      let virtualRootFolder = this.struct_cache.getStruct(path, user.uid)
      if (virtualRootFolder) {
        return virtualRootFolder
      }
      virtualRootFolder = {
        files: [],
        current: { name: 'webdav', description: '', file_id: '-1', parent_file_id: '', drive_id: '', ext: '' },
        folders: [{
          name: 'webdav',
          description: '',
          drive_id: '',
          file_id: '0',
          parent_file_id: '-1',
          ext: ''
        }]
      }
      this.struct_cache.setStruct(path, user.uid, virtualRootFolder)
      this.addStructPrivilege(ctx, path, virtualRootFolder)
      return this.struct_cache.getStruct(path, user.uid)
    }

    if (path == '/' + 'webdav') {
      try {
        let rootFolder = this.struct_cache.getStruct(path, user.uid)
        if (rootFolder) {
          return rootFolder
        }
        rootFolder = await this.getRootFolder(ctx, user)
        this.struct_cache.setStruct(path, user.uid, rootFolder)
        this.addStructPrivilege(ctx, path, rootFolder)
        return this.struct_cache.getStruct(path, user.uid)
      } catch (error) {
        throw Errors.ResourceNotFound
      }
    }
    const { element, parentFolder } = Parser.parsePath(path)
    let struct: StructDirectory | Error = this.struct_cache.getStruct(parentFolder, user.uid)
    if (!struct) {
      struct = await this.readDir(ctx, parentFolder)
      if (!struct || struct instanceof Error) {
        return Errors.ResourceNotFound
      } else {
        const folder = this.findFolder(struct, element)
        if (folder) {
          try {
            const structDirectory = await Request.getStructDirectory(ctx, folder.drive_id, folder.file_id)
            if (structDirectory instanceof Error) {
              return Errors.ResourceNotFound
            } else {
              this.struct_cache.setStruct(path, user.uid, structDirectory)
              this.addStructPrivilege(ctx, path, structDirectory)
              return this.struct_cache.getStruct(path, user.uid)
            }
          } catch (error) {
            throw Errors.ResourceNotFound
          }
        }
      }
    }
    const folder = this.findFolder(struct, element)
    if (folder) {
      if (this.struct_cache.structIsNotExpire(path, user.uid)) {
        return this.struct_cache.getStruct(path, user.uid)
      }
      try {
        const structDirectory = await Request.getStructDirectory(ctx, folder.drive_id, folder.file_id)
        if (structDirectory instanceof Error) {
          return Errors.ResourceNotFound
        } else {
          this.struct_cache.setStruct(path, user.uid, structDirectory)
          this.addStructPrivilege(ctx, path, structDirectory)
          return this.struct_cache.getStruct(path, user.uid)
        }
      } catch (error) {
        throw Errors.ResourceNotFound
      }
    }
    throw Errors.ResourceNotFound
  }

  async getReadStream(ctx: OpenReadStreamInfo, path: string) {
    console.log('getReadStream', ctx.context.user.username, path)
    const user = ctx.context.user
    const { element, parentFolder } = Parser.parsePath(path)
    const file = this.findFile(this.struct_cache.getStruct(parentFolder, user.uid), element)
    if (file) {
      let readStream = await Request.getReadStream(ctx, file)
      if (readStream instanceof Error) {
        throw Errors.ResourceNotFound
      }
      return readStream
    } else {
      throw Errors.ResourceNotFound
    }
  }

  async writeFile(ctx: OpenWriteStreamInfo, path: string) {
    console.error('writeFile.ctx', ctx)
    const token = await UserDAL.GetUserTokenFromDB(usePanTreeStore().user_id)
    if (ctx.estimatedSize && ctx.estimatedSize > 0) { // 有内容
      const user = ctx.context.user
      const { element, parentFolder } = Parser.parsePath(path)
      const struct = this.struct_cache.getStruct(parentFolder, user.uid)
      const file = this.findFile(struct, element)!!
      const positionId = this.created_now.findIndex(v => v.name === file.name)
      let uploadFileInfo: any
      if (positionId !== -1) {
        uploadFileInfo = this.created_now[positionId]
        this.created_now = this.created_now.splice(positionId + 1, 1)
      }
      return new StreamWrite(ctx, token, [], uploadFileInfo, this.created_now)
    } else {
      return new StreamWrite(ctx, token, [], undefined, [])
    }
  }

  async copy(ctx: CopyInfo, pathFrom: string, pathTo: string) {
    console.log('copy', ctx.context.user.username, pathFrom, pathTo)
    const user = ctx.context.user
    const { element, parentFolder } = Parser.parsePath(pathFrom)
    pathTo = Parser.parsePathTo(pathTo)
    const structTo = this.struct_cache.getStruct(pathTo, user.uid)
    if (!structTo) {
      throw Errors.ResourceNotFound
    }
    const currentId = structTo.current.file_id
    const structFrom = this.struct_cache.getStruct(parentFolder, user.uid)
    const folder = this.findFolder(structFrom, element)
    if (folder) {
      try {
        const resp = await Request.copyFolder(ctx, folder.drive_id, currentId, folder.file_id)
        if (resp.file_id) {
          return true
        } else {
          return false
        }
      } catch (error: any) {
        console.error('copyFolder', error)
        throw new Error(error)
      }
    }
    const file = this.findFile(structFrom, element)
    if (file) {
      try {
        const resp = await Request.copyFile(ctx, file.drive_id, currentId, file.file_id)
        if (resp.file_id) {
          return true
        } else {
          return false
        }
      } catch (error: any) {
        console.error('copyFile', error)
        throw new Error(error)
      }
    }
    return false
  }

  async rename(ctx: MoveInfo, path: string, newName: string) {
    console.log('rename', ctx.context.user.username, path, newName)
    const user = ctx.context.user
    const { element, parentFolder } = Parser.parsePath(path)
    const struct = this.struct_cache.getStruct(parentFolder, user.uid)
    const folder = this.findFolder(struct, element)
    if (folder) {
      try {
        const resp = await Request.renameFolder(ctx, folder.drive_id, folder.file_id, newName)
        if (resp.file_id) {
          this.struct_cache.renameFolderObject(element, newName, parentFolder, user.uid)
          folder.name = newName
          return true
        } else {
          return false
        }
      } catch (error: any) {
        console.error('renameFolder', error)
        throw new Error(error)
      }
    }
    const file = this.findFile(struct, element)
    if (file) {
      try {
        const resp = await Request.renameFile(ctx, file.drive_id, file.file_id, newName)
        if (resp.file_id) {
          this.struct_cache.renameFileObject(element, newName, parentFolder, user.uid)
          file.name = newName
          return true
        } else {
          return false
        }
      } catch (error: any) {
        console.error('renameFile', error)
        throw new Error(error)
      }
    }
    return false
  }

  async move(ctx: MoveInfo, pathFrom: string, pathTo: string) {
    console.log('move', ctx.context.user.username, pathFrom, pathTo)
    pathTo = Parser.parsePathTo(pathTo)
    const { element: elementFrom, parentFolder: parentFolderFrom } = Parser.parsePath(pathFrom)
    const { element: elementTo, parentFolder: parentFolderTo } = Parser.parsePath(pathTo)
    const user: IUser = ctx.context.user
    let isRename = false
    if (parentFolderFrom == parentFolderTo) {
      isRename = this.struct_cache.checkRename(elementFrom, elementTo, parentFolderFrom, parentFolderTo, user)
    }
    if (isRename) {
      try {
        return this.rename(ctx, pathFrom, elementTo)
      } catch (error: any) {
        console.error('move.rename', error)
        throw new Error(error)
      }
    }
    if (!this.struct_cache.getStruct(parentFolderTo, user.uid)) {
      throw Errors.ResourceNotFound
    }
    const toFileId = this.struct_cache.getStruct(parentFolderTo, user.uid).current.file_id
    const structFrom = this.struct_cache.getStruct(parentFolderFrom, user.uid)
    const folder = this.findFolder(structFrom, elementFrom)
    if (folder) {
      try {
        const moveResponse = await Request.moveFolder(ctx, folder.drive_id, folder.file_id, toFileId)
        if (moveResponse.file_id) {
          this.struct_cache.dropFolderObject(parentFolderFrom, user.uid, folder)
          this.struct_cache.dropPath(pathFrom, user.uid)
          this.struct_cache.setFolderObject(parentFolderTo, user.uid, {
            drive_id: moveResponse.drive_id,
            file_id: moveResponse.file_id,
            name: folder.name,
            parent_file_id: toFileId
          })
          return true
        } else {
          return false
        }
      } catch (error: any) {
        console.error('moveFolder', error)
        throw new Error(error)
      }
    }
    const file = this.findFile(structFrom, elementFrom)
    if (file) {
      try {
        const moveResponse = await Request.moveFile(ctx, file.drive_id, file.file_id, toFileId)
        if (moveResponse.file_id) {
          this.struct_cache.dropFileObject(parentFolderFrom, user.uid, file)
          this.struct_cache.setFileObject(parentFolderTo, user.uid, {
            drive_id: moveResponse.drive_id,
            file_id: moveResponse.file_id,
            name: file.name,
            parent_file_id: toFileId
          })
          return true
        } else {
          return false
        }
      } catch (error: any) {
        console.error('moveFile', error)
        throw new Error(error)
      }
    }
    return false
  }

  getType(path: string, ctx: TypeInfo) {
    const user = ctx.context.user
    const { element, parentFolder } = Parser.parsePath(path)
    if (parentFolder == '/' || parentFolder == '/' + 'webdav') {
      return ResourceType.Directory
    }
    const struct = this.struct_cache.getStruct(parentFolder, user.uid)
    const folder = this.findFolder(struct, element)
    if (folder) {
      return ResourceType.Directory
    }
    const file = this.findFile(struct, element)
    if (file) {
      return ResourceType.File
    }
  }

  getMimeType(path: string, ctx: MimeTypeInfo) {
    const user = ctx.context.user
    const { element, parentFolder } = Parser.parsePath(path)
    const struct = this.struct_cache.getStruct(parentFolder, user.uid)
    const file = this.findFile(struct, element)
    if (file) {
      return file.mime_type || 'application/octet-stream'
    }
    return 'application/octet-stream'
  }

  getSize(path: string, ctx: SizeInfo) {
    const { element, parentFolder } = Parser.parsePath(path)
    const user = ctx.context.user
    const struct = this.struct_cache.getStruct(parentFolder, user.uid)
    const folder = this.findFolder(struct, element)
    if (folder) {
      return folder.size
    }
    const file = this.findFile(struct, element)
    if (file) {
      return file.size
    }
  }

  getLastModifiedDate(path: string, ctx: LastModifiedDateInfo) {
    const modifyDateZero = new Date(0, 0, 0, 0, 0, 0).getDate()
    if (path == '/' || path == '/' + 'webdav') {
      return modifyDateZero
    }
    const { element, parentFolder } = Parser.parsePath(path)
    const user = ctx.context.user
    const struct = this.struct_cache.getStruct(parentFolder, user.uid)
    const folder = this.findFolder(struct, element)
    if (folder) {
      return folder.time || modifyDateZero
    }
    const file = this.findFile(struct, element)
    if (file) {
      return file.time || modifyDateZero
    }
    return -1
  }
}

export default VirtualFileResources