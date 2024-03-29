import { IUser } from 'webdav-server/lib/index.v2'
import { useSettingStore } from '../../../store'

export type FileOrFolder = {
  name: string;
  drive_id: string;
  file_id: string;
  parent_file_id: string;
  description: string;
  content_hash?: string;
  content_hash_name?: string;
  proof_code?: string;
  proof_version?: string;
  mime_type?: string;
  size?: number;
  time?: number;
  ext?: string;
  access?: number;
  rootFolderType?: number,
};

export type StructDirectory = {
  files: FileOrFolder[];
  folders: FileOrFolder[];
  current: FileOrFolder;
};

export type Struct = {
  [userId: string]: {
    [path: string]: StructDirectory;
    lastUpdate?: any;
  };
};

class ResourceStruct {
  private struct: Struct

  constructor() {
    this.struct = {}
  }

  setStruct(path: string, uid: string, structDir: any) {
    if (!this.struct) {
      this.struct = {}
    }
    if (!this.struct[uid]) {
      this.struct[uid] = {}
    }
    this.struct[uid][path] = structDir
    this.struct[uid].lastUpdate = Date.now()
  }

  getStruct(path: string, uid: string) {
    return this.struct[uid] && this.struct[uid][path]
  }

  deleteStruct(uid: string) {
    delete this.struct[uid]
  }

  deleteStructs(uids: string[]) {
    uids.forEach(uid => {
      this.deleteStruct(uid)
    })
  }

  setFileObject(path: string, uid: string, newFile: any) {
    this.struct[uid][path].files.push(newFile)
    this.struct[uid].lastUpdate = Date.now()
  }

  setFolderObject(path: string, uid: string, newFile: any) {
    this.struct[uid][path].folders.push(newFile)
    this.struct[uid].lastUpdate = Date.now()
  }

  dropFileObject(Folder: string, uid: string, file: any) {
    this.struct[uid][Folder].files.forEach((el: any) => {
      if (el.file_id == file.file_id) {
        const id = this.struct[uid][Folder].files.indexOf(el)
        this.struct[uid][Folder].files.splice(id, 1)
        this.struct[uid].lastUpdate = Date.now()
      }
    })
  }

  dropFolderObject(Folder: string, uid: string, folder: any) {
    this.struct[uid][Folder].folders.forEach((el: any) => {
      if (el.file_id == folder.file_id) {
        const id = this.struct[uid][Folder].folders.indexOf(el)
        this.struct[uid][Folder].folders.splice(id, 1)
        this.struct[uid].lastUpdate = Date.now()
      }
    })
  }

  dropPath(path: string, uid: string) {
    if (this.struct[uid][path]) {
      delete this.struct[uid][path]
      this.struct[uid].lastUpdate = Date.now()
    }
  }

  checkRename(elementFrom: string, elementTo: string, parentFolderFrom: string, parentFolderTo: string, user: IUser) {
    if (parentFolderFrom != parentFolderTo) return false
    let elementFromIsExist = false
    let elementToIsExist = false
    let structFrom = this.struct[user.uid][parentFolderFrom]
    let structTo = this.struct[user.uid][parentFolderTo]
    structFrom.files.forEach((el: any) => {
      if (elementFrom == el.name) {
        elementFromIsExist = true
      }
    })
    if (!elementFromIsExist) {
      structFrom.folders.forEach((el: any) => {
        if (elementFrom == el.name) {
          elementFromIsExist = true
        }
      })
    }
    if (!elementFromIsExist) return false

    structTo.files.forEach((el: any) => {
      if (elementTo == el.name) {
        elementToIsExist = true
      }
    })
    if (!elementToIsExist) {
      structTo.folders.forEach((el: any) => {
        if (elementTo == el.name) {
          elementToIsExist = true
        }
      })
    }
    if (!elementToIsExist) return true
    return true
  }

  renameFolderObject(element: string, newName: string, parentFolder: string, uid: string) {
    this.struct[uid][parentFolder].folders.forEach((el: any) => {
      if (el.name == element) {
        const id = this.struct[uid][parentFolder].folders.indexOf(el)
        this.struct[uid][parentFolder].folders[id].name = newName
        this.struct[uid].lastUpdate = Date.now()
      }
    })
  }

  renameFileObject(element: string, newName: string, parentFolder: string, uid: string) {
    this.struct[uid][parentFolder].files.forEach((el: any) => {
      if (el.name == element) {
        const id = this.struct[uid][parentFolder].files.indexOf(el)
        this.struct[uid][parentFolder].files[id].name = newName
        this.struct[uid].lastUpdate = Date.now()
      }
    })
  }

  structIsNotExpire(path: string, uid: string) {
    if (!this.struct[uid][path]) {
      return false
    } else {
      const difference = useSettingStore().webDavListCache * 1000
      let lastUpdate = this.struct[uid].lastUpdate
      return (Date.now() - lastUpdate) < difference
    }
  }
}

export default ResourceStruct