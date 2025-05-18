<script lang="ts">
import AliShare from '../../aliapi/share'
import { getFromClipboard } from '../../utils/electronhelper'
import message from '../../utils/message'
import { modalCloseAll, modalSelectPanDir } from '../../utils/modal'
import { defineComponent, ref, reactive } from 'vue'
import PanDAL from '../../pan/pandal'
import { useUserStore, useModalStore } from '../../store'
import AliDirFileList from '../../aliapi/dirfilelist'

export default defineComponent({
  props: {
    visible: {
      type: Boolean,
      required: true
    }
  },
  setup(props) {
    const okLoading = ref(false)
    const formRef = ref()
    const logRef = ref<string[]>([])
    const processedCount = ref(0)
    const totalCount = ref(0)
    const autoClose = ref(false)
    const savePathId = ref('')
    const savePathName = ref('')

    const form = reactive({
      shareLinks: '',
      savePath: ''
    })

    const handleOpen = () => {
      setTimeout(() => {
        document.getElementById('DaoRuShareMultiInput')?.focus()
      }, 200)

      // Try to get links from clipboard
      const text = getFromClipboard()
      if (text && text.includes('aliyundrive.com/s/')) {
        form.shareLinks = text
      }
    }

    const handleClose = () => {
      if (okLoading.value) okLoading.value = false
      formRef.value.resetFields()
      logRef.value = []
      processedCount.value = 0
      totalCount.value = 0
      savePathId.value = ''
      savePathName.value = ''
    }

    const onPaste = (e: any) => {
      e.stopPropagation() 
      e.preventDefault() 
      const text = getFromClipboard()
      if (text) {
        form.shareLinks = text
      }
    }

    const addLog = (message: string) => {
      logRef.value.push(`[${new Date().toLocaleTimeString()}] ${message}`)
      // Keep only the last 100 logs
      if (logRef.value.length > 100) {
        logRef.value.shift()
      }
      // Scroll to bottom
      setTimeout(() => {
        const logElement = document.getElementById('multiShareLog')
        if (logElement) {
          logElement.scrollTop = logElement.scrollHeight
        }
      }, 50)
    }

    return { 
      okLoading, 
      form, 
      formRef, 
      logRef,
      processedCount,
      totalCount,
      autoClose,
      savePathId,
      savePathName,
      handleOpen, 
      handleClose, 
      onPaste,
      addLog
    }
  },
  methods: {
    handleHide() {
      modalCloseAll()
    },
    
    handleSelectDir() {
      const modalStore = useModalStore()
      const currentModal = modalStore.modalName
      
      modalSelectPanDir('batch', '', (user_id: string, drive_id: string, dirID: string, dirName: string) => {
        this.savePathId = dirID
        this.savePathName = dirName
        this.form.savePath = dirName
        
        if (currentModal) {
          setTimeout(() => {
            useModalStore().showModal(currentModal, {})
          }, 100)
        }
      })
    },
    
    async handleOK() {
      this.formRef.validate(async (errors: any) => {
        if (errors) return
        
        if (!this.savePathId) {
          const modalStore = useModalStore()
          const currentModal = modalStore.modalName
          
          modalSelectPanDir('batch', '', async (user_id: string, drive_id: string, dirID: string, dirName: string) => {
            this.savePathId = dirID
            this.savePathName = dirName
            this.form.savePath = dirName
            
            if (currentModal) {
              setTimeout(() => {
                useModalStore().showModal(currentModal, {})
                setTimeout(() => {
                  this.processLinks(user_id, drive_id, dirID)
                }, 200)
              }, 100)
            }
          })
        } else {
          const userStore = useUserStore()
          const user_id = userStore.user_id
          const userToken = userStore.GetUserToken
          const drive_id = userToken.default_drive_id
          
          await this.processLinks(user_id, drive_id, this.savePathId)
        }
      })
    },
    
    async processLinks(user_id: string, drive_id: string, dirID: string) {
      this.okLoading = true
      this.logRef = []
      this.processedCount = 0
      
      const lines = this.form.shareLinks.split('\n').filter(line => line.trim() !== '')
      this.totalCount = lines.length
      
      if (lines.length === 0) {
        message.error('请输入至少一个分享链接')
        this.okLoading = false
        return
      }
      
      this.addLog(`开始处理 ${lines.length} 个分享链接，保存到 ${this.savePathName || '选定目录'}`)
      
      // 首先获取目标目录中的文件列表，用于检查是否存在同名文件
      const existingFilesMap = new Map<string, boolean>()
      
      try {
        // 查询目标目录下所有文件
        const resp = await AliDirFileList.ApiDirFileList(user_id, drive_id, dirID, '目标目录', '', '')
        if (resp && resp.items) {
          // 创建文件名到文件的映射，方便快速查找
          for (const item of resp.items) {
            existingFilesMap.set(item.name.toLowerCase(), true)
          }
          this.addLog(`目标文件夹包含 ${existingFilesMap.size} 个文件/文件夹`)
        }
      } catch (err: any) {
        this.addLog(`获取目标目录文件列表失败: ${err.message || err}`)
      }
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        try {
          const parts = line.split(/\s+/)
          let link = parts[0]
          let password = parts.length > 1 ? parts[1] : ''
          
          if (link.length === 11) {
            link = 'aliyundrive.com/s/' + link
          }
          
          if (link.indexOf('aliyundrive.com/s/') < 0) {
            this.addLog(`第 ${i+1} 行: 链接格式错误，必须包含 "aliyundrive.com/s/" - ${link}`)
            this.processedCount++
            continue
          }
          
          const share_id = link.split(/\.com\/s\/([\w]+)/)[1]
          if (!share_id) {
            this.addLog(`第 ${i+1} 行: 无法提取分享ID - ${link}`)
            this.processedCount++
            continue
          }
          
          this.addLog(`处理第 ${i+1} 行: ${link} ${password ? '(有提取码)' : '(无提取码)'}`)
          
          const share_token = await AliShare.ApiGetShareToken(share_id, password)
          
          if (!share_token || share_token.startsWith('，')) {
            this.addLog(`第 ${i+1} 行: 获取分享token失败 - ${share_token || '未知错误'}`)
          } else {
            this.addLog(`第 ${i+1} 行: 获取分享token成功`)
            
            const resp = await AliShare.ApiShareFileList(share_id, share_token, 'root')
            if (resp.next_marker === '') {
              // 过滤掉已存在同名的文件
              const filteredItems = resp.items.filter(item => {
                const exists = existingFilesMap.has(item.name.toLowerCase())
                if (exists) {
                  this.addLog(`第 ${i+1} 行: 跳过已存在的文件/文件夹 "${item.name}"`)
                }
                return !exists
              })
              
              if (filteredItems.length === 0) {
                this.addLog(`第 ${i+1} 行: 所有文件/文件夹已存在，跳过保存`)
              } else {
                const file_ids = filteredItems.map(item => item.file_id)
                this.addLog(`第 ${i+1} 行: 找到 ${resp.items.length} 个文件/文件夹，其中 ${filteredItems.length} 个需要保存`)
                
                if (file_ids.length > 0) {
                  const result = await AliShare.ApiSaveShareFilesBatch(share_id, share_token, user_id, drive_id, dirID, file_ids)
                  
                  if (result === 'success' || result === 'async') {
                    this.addLog(`第 ${i+1} 行: 保存成功${result === 'async' ? '(异步任务)' : ''}`)
                  } else {
                    this.addLog(`第 ${i+1} 行: 保存失败 - ${result}`)
                  }
                } else {
                  this.addLog(`第 ${i+1} 行: 分享链接中没有文件`)
                }
              }
            } else {
              this.addLog(`第 ${i+1} 行: 获取文件列表失败 - ${resp.next_marker}`)
            }
          }
        } catch (err: any) {
          this.addLog(`第 ${i+1} 行: 处理出错 - ${err.message || err}`)
        }
        
        this.processedCount++
        
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      this.addLog(`全部处理完成: ${this.processedCount}/${this.totalCount}`)
      
      PanDAL.aReLoadOneDirToRefreshTree(user_id, drive_id, dirID)
      
      this.okLoading = false
      
      if (this.autoClose && this.processedCount === this.totalCount) {
        setTimeout(() => {
          this.handleHide()
        }, 2000)
      }
    }
  }
})
</script>

<template>
  <a-modal :visible="visible" modal-class="modalclass" :footer="false" :unmount-on-close="true" :mask-closable="false" @cancel="handleHide" @before-open="handleOpen" @close="handleClose">
    <template #title>
      <span class="modaltitle">批量导入阿里云盘分享链接</span>
    </template>
    <div class="modalbody" style="width: 600px">
      <a-form ref="formRef" :model="form" layout="horizontal" auto-label-width>
        <a-form-item
          field="shareLinks"
          label="分享链接："
          :rules="[
            { required: true, message: '请输入分享链接' }
          ]">
          <a-textarea 
            v-model="form.shareLinks" 
            placeholder="输入多条分享链接和密码，每行一条记录，格式：分享链接 密码（无密码可不填）
例如：
aliyundrive.com/s/umaDDMR7w4F 1234
aliyundrive.com/s/abcDEFghi12" 
            allow-clear 
            :auto-size="{ minRows: 6, maxRows: 12 }" 
            :input-attrs="{ id: 'DaoRuShareMultiInput', autofocus: 'autofocus' }" 
            @paste.stop.prevent="onPaste" 
          />
        </a-form-item>
        <a-form-item field="savePath" label="保存路径：">
          <div style="display: flex; align-items: center;">
            <a-input v-model.trim="form.savePath" placeholder="请选择保存目录" allow-clear readonly />
            <a-button type="outline" size="small" style="margin-left: 8px;" @click="handleSelectDir">选择</a-button>
          </div>
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model="autoClose">全部完成后自动关闭</a-checkbox>
        </a-form-item>
      </a-form>
      
      <div v-if="logRef.length > 0 || okLoading" style="margin-top: 10px;">
        <div style="font-weight: bold; margin-bottom: 5px;">
          处理日志 ({{processedCount}}/{{totalCount}})
        </div>
        <div 
          id="multiShareLog"
          style="height: 150px; overflow-y: auto; background-color: #f5f5f5; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all;">
          <div v-for="(log, index) in logRef" :key="index">{{ log }}</div>
        </div>
      </div>
    </div>
    <div class="modalfoot">
      <div style="flex-grow: 1"></div>
      <a-button v-if="!okLoading" type="outline" size="small" @click="handleHide">取消</a-button>
      <a-button type="primary" size="small" :loading="okLoading" @click="handleOK">开始批量导入</a-button>
    </div>
  </a-modal>
</template>

<style>
#multiShareLog::-webkit-scrollbar {
  width: 6px;
}
#multiShareLog::-webkit-scrollbar-track {
  background: #f1f1f1;
}
#multiShareLog::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}
#multiShareLog::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
