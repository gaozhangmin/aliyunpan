import AliHttp from '../../aliapi/alihttp'
import { IAliGetDirModel } from '../../aliapi/alimodels'
import DebugLog from '../../utils/debuglog'
import { Ref } from 'vue'
import { foldericonfn, IScanDriverModel, TreeNodeData } from '../ScanDAL'


export async function GetEnmptyDir(user_id: string, PanData: IScanDriverModel, Processing: Ref<number>, scanCount: Ref<number>) {
  scanCount.value = 0

  const enmpty = new Map<string, IAliGetDirModel>()
  const entries = PanData.DirMap.keys()
  for (let i = 0, maxi = PanData.DirMap.size; i < maxi; i++) {
    const key = entries.next().value
    if (!PanData.DirChildrenMap.has(key)) {

      enmpty.set(key, PanData.DirMap.get(key)!)
    }
  }

  const proAdd = (100 - Processing.value) / ((enmpty.size + 1) / 99)
  let proVal = Processing.value
  const idList: string[] = []
  const keys = enmpty.keys()
  for (let i = 0, maxi = enmpty.size; i < maxi; i++) {
    idList.push(keys.next().value)
    if (idList.length >= 100) {
      proVal += proAdd
      Processing.value = Math.max(50, Math.floor(proVal))
      scanCount.value += await TestEnmptyDir(user_id, PanData, idList)
      idList.length = 0
    }
  }
  if (idList.length > 0) {
    scanCount.value += await TestEnmptyDir(user_id, PanData, idList)
    idList.length = 0
  }
  Processing.value = 99
}

async function TestEnmptyDir(user_id: string, PanData: IScanDriverModel, idList: string[]) {
  const enmptyidList = await ApiTestEnmptyDir(user_id, PanData.drive_id, idList)
  if (enmptyidList.length > 0) {
    for (let i = 0, maxi = enmptyidList.length; i < maxi; i++) {
      let dir = PanData.DirMap.get(enmptyidList[i])
      if (dir) {
        PanData.EnmptyDirMap.set(dir.file_id, 'enmpty')
        while (true) {
          if (!dir || !dir.parent_file_id || PanData.EnmptyDirMap.has(dir.parent_file_id)) break
          PanData.EnmptyDirMap.set(dir.parent_file_id, 'parent')
          dir = PanData.DirMap.get(dir.parent_file_id)
        }
      }
    }
  }
  return enmptyidList.length
}

async function ApiTestEnmptyDir(user_id: string, drive_id: string, idList: string[]) {
  const list: string[] = []
  if (!user_id || !drive_id || idList.length === 0) return []
  for (let i = 0, maxi = idList.length; i < maxi; i++) {
    let id = idList[i].includes('root') ? 'root' : idList[i]
    let postData = {
      drive_id: drive_id,
      limit: 1,
      query: 'parent_file_id="' + id + '"',
      fields: 'thumbnail'
    }
    const url = 'adrive/v3/file/search?jsonmask=next_marker%2Cpunished_file_count%2Ctotal_count%2Citems(name%2Cfile_id%2Cdrive_id%2Ctype%2Csize%2Cupdated_at%2Ccategory%2Cfile_extension%2Cparent_file_id%2Cmime_type%2Cmime_extension%2Cpunish_flag)'
    const resp = await AliHttp.Post(url, postData, user_id, '')
    try {
      if (AliHttp.IsSuccess(resp.code)) {
        const items = resp.body.items
        if (items.length == 0) {
          list.push(id)
        }
        return list
      } else if (!AliHttp.HttpCodeBreak(resp.code)) {
        DebugLog.mSaveWarning('ApiTestEnmptyDir err=' + (resp.code || ''), resp.body)
      }
    } catch (err: any) {
      DebugLog.mSaveWarning('ApiTestEnmptyDir', err)
    }
  }
  return list
}


export function GetTreeNodes(PanData: IScanDriverModel, parent_file_id: string, treeDataMap: Map<string, TreeNodeData>): TreeNodeData[] {
  const data: TreeNodeData[] = []
  const dirList: IAliGetDirModel[] = PanData.DirChildrenMap.get(parent_file_id) || []
  dirList.forEach((item: IAliGetDirModel) => {
    if (PanData.EnmptyDirMap.has(item.file_id)) {
      const node: TreeNodeData = {
        key: item.file_id,
        title: item.name,
        icon: foldericonfn,
        size: item.size,
        children: GetTreeNodes(PanData, item.file_id, treeDataMap)
      }
      data.push(node)
      treeDataMap.set(node.key as string, node)
    }
  })
  data.sort((a, b) => a.title!.localeCompare(b.title!))
  return data
}
