import { FileSystemErrorMessage } from '../../utils/filehelper'
import DebugLog from '../../utils/debuglog'
import message from '../../utils/message'
import fsPromises from 'fs/promises'
import path from 'path'
import fs from 'fs'
import cryptoJS from 'crypto-js'


export async function DoEncryption(dirPath: string, breakSmall: boolean=false,
                                     matchExtList: string[], password:string,
                                     keepOriginFile:boolean=false): Promise<number> {
  const fileList: string[] = []
  await GetAllFiles(dirPath, breakSmall, fileList)
  if (fileList.length == 0) {
    message.error('选择的文件夹下找不到任何文件')
    return 0
  } else {
    const targetFileList:string[] = []
    for (let i = 0, maxi = fileList.length; i < maxi; i++) {
      const file = fileList[i]
      if (matchExtList.length > 0) {
        for (let j = 0; j < matchExtList.length; j++) {
          if (file.endsWith(matchExtList[j])) {
            targetFileList.push(file)
            break
          }
        }
      } else {
        targetFileList.push(file)
      }
    }
    if (targetFileList.length > 0) {
      return encryptFiles(targetFileList, password, keepOriginFile)
    } else {
      message.error('无符合格式的待加密文件')
      return 0
    }
  }
}

export async function DoDecryption(dirPath: string, password:string): Promise<number> {
  const fileList: string[] = []
  await GetAllFiles(dirPath, false, fileList)
  if (fileList.length == 0) {
    message.error('选择的文件夹下找不到任何文件')
    return 0
  } else {
    const targetFileList:string[] = []
    for (let i = 0, maxi = fileList.length; i < maxi; i++) {
      const file = fileList[i]
      if (file.endsWith('.enc')) {
        targetFileList.push(file)
      }
    }
    if (targetFileList.length > 0) {
      return decryptionFiles(targetFileList, password)
    } else {
      message.error('文件夹无待解密文件(.enc)')
      return 0
    }

  }
}


function decryptionFiles(fileList:string[],  password:string):number {
  let count = 0
  fileList.forEach(filePath => {
    try {
      const data = fs.readFileSync(filePath).toString();
      const decryptedData = cryptoJS.AES.decrypt(data, password).toString(cryptoJS.enc.Utf8);
      const decryptedFile = filePath.replace(/\.enc$/, '');
      fs.writeFileSync(decryptedFile, decryptedData);
      count++
      console.log(`文件 ${filePath} 已解密并保存到 ${decryptedFile}`);
    } catch (err) {
      console.error(`文件 ${filePath} 解密失败`);
    }
  });
  return count;
}


function encryptFiles(fileList:string[],  password:string, keepOriginalFile:boolean=false):number {
  let count = 0
  console.log("encryptFiles", fileList, password, keepOriginalFile)
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    let encryptedFile=''
    if (keepOriginalFile) {
      encryptedFile = file + ".enc"
    } else {
      encryptedFile = file
    }
    const data = fs.readFileSync(file); // 读取原始文件数据

    // 使用 AES 对称加密算法加密文件数据
    const encryptedData = cryptoJS.AES.encrypt(data.toString(), password).toString();
    // 将加密后的数据写入保存加密文件的路径
    fs.writeFileSync(encryptedFile, encryptedData);
    count++
    console.log(`文件 ${file} 已加密并保存到 ${encryptedFile}`);
  }
  return count;
}

async function GetAllFiles(dir: string, breakSmall: boolean, fileList: string[]) {
  if (dir.endsWith(path.sep) == false) dir = dir + path.sep
  try {
    const childFiles = await fsPromises.readdir(dir).catch((err: any) => {
      err = FileSystemErrorMessage(err.code, err.message)
      DebugLog.mSaveDanger('XM GetAllFiles文件失败：' + dir, err)
      message.error('跳过文件夹：' + err + ' ' + dir)
      return []
    })

    let allTask: Promise<void>[] = []
    const dirList: string[] = []
    for (let i = 0, maxi = childFiles.length; i < maxi; i++) {
      const name = childFiles[i] as string
      if (name.startsWith('.')) continue
      if (name.startsWith('#')) continue
      const item = dir + name
      allTask.push(
        fsPromises
          .lstat(item)
          .then((stat: any) => {
            if (stat.isDirectory()) dirList.push(item)
            else if (stat.isSymbolicLink()) {
              // donothing
            } else if (stat.isFile()) {
              if (!breakSmall || stat.size > 5 * 1024 * 1024) fileList.push(item)
            }
          })
          .catch()
      )
      if (allTask.length > 10) {
        await Promise.all(allTask).catch(() => {})
        allTask = []
      }
    }

    if (allTask.length > 0) {
      await Promise.all(allTask).catch(() => {})
      allTask = []
    }

    for (let i = 0, maxi = dirList.length; i < maxi; i++) {
      await GetAllFiles(dirList[i], breakSmall, fileList)
    }
  } catch (err: any) {
    DebugLog.mSaveDanger('GetAllFiles' + (err.message || ''))
  }

  return true
}
