import { Errors, FileSystemSerializer, LocalPropertyManager, ReturnCallback } from 'webdav-server/lib/index.v2'
import AliFileSystem from './AliFileSystem'

// Serializer
class AliFileSystemSerializer implements FileSystemSerializer {
  uid(): string {
    return 'CustomFileSystemSerializer_1.0.0'
  }

  serialize(fs: AliFileSystem, callback: ReturnCallback<any>) {
    callback(Errors.None, { resources: fs.manageResource })
  }

  unserialize(serializedData: any, callback: ReturnCallback<AliFileSystem>) {
    const fs = new AliFileSystem(serializedData.url)
    fs.props = new LocalPropertyManager(serializedData.props)
    callback(Errors.None, fs)
  }
}

export default AliFileSystemSerializer