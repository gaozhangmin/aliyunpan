<template>
  <a-modal
    :visible="visible"
    :title="editingServer ? `编辑 ${serverTypeTitle}` : `添加 ${serverTypeTitle}`"
    :ok-text="editingServer ? '保存' : '连接'"
    width="980px"
    modal-class="media-server-modal"
    :ok-loading="loading"
    @ok="handleSubmit"
    @cancel="emit('update:visible', false)"
  >
    <div class="server-modal">
      <div class="server-modal-grid">
        <div class="form-section panel-card">
          <div class="section-title">{{ serverTypeTitle }}</div>

          <div class="field-row">
            <div class="field-label">类型</div>
            <a-select v-model="form.type" class="field-input">
              <a-option value="jellyfin">Jellyfin</a-option>
              <a-option value="emby">Emby</a-option>
              <a-option value="plex">Plex</a-option>
            </a-select>
          </div>

          <div class="field-row">
            <div class="field-label">名称</div>
            <a-input v-model="form.name" class="field-input" placeholder="可选" allow-clear />
          </div>

          <div class="field-row">
            <div class="field-label">备注</div>
            <a-input v-model="form.notes" class="field-input" placeholder="可选" allow-clear />
          </div>
        </div>

        <div class="form-section panel-card">
          <div class="section-title">登录信息</div>

          <div class="field-row">
            <div class="field-label">用户名</div>
            <a-input v-model="form.username" class="field-input" placeholder="可选" allow-clear />
          </div>

          <div class="field-row">
            <div class="field-label">密码</div>
            <a-input-password
              v-model="form.password"
              class="field-input"
              placeholder="可选"
              allow-clear
              :visibility="showPassword"
              @visibility-change="showPassword = $event"
            />
          </div>

<!--          <div class="field-row switch-row compact-switch">-->
<!--            <div class="field-label">同步到云端</div>-->
<!--            <a-switch v-model="form.syncFlag" />-->
<!--          </div>-->
        </div>

        <div class="form-section panel-card panel-wide">
          <div class="section-title">服务器地址</div>

          <div class="address-grid">
            <div class="field-row">
              <div class="field-label">主机</div>
              <a-input v-model="form.host" class="field-input" placeholder="必填，例如 demo.example.com" allow-clear />
            </div>

            <div class="field-row">
              <div class="field-label">路径</div>
              <a-input v-model="form.path" class="field-input" placeholder="可选，例如 /jellyfin" allow-clear />
            </div>

            <div class="field-row">
              <div class="field-label">端口</div>
              <a-input v-model="form.port" class="field-input" placeholder="可选" allow-clear />
            </div>

            <div class="field-row switch-row">
              <div class="field-label">HTTPS</div>
              <a-switch v-model="form.useHttps" @change="handleHttpsChange" />
            </div>
          </div>

          <div class="backup-block">
            <div class="backup-header">
              <div class="section-subtitle">备份服务器</div>
              <a-button type="outline" size="small" class="backup-add-btn" @click="addBackupAddress">
                <template #icon><i class="iconfont iconadd" /></template>
                新增地址
              </a-button>
            </div>

            <div v-if="form.backupAddresses.length === 0" class="backup-empty">暂未添加备份服务器</div>

            <div v-for="(item, index) in form.backupAddresses" :key="index" class="backup-row">
              <a-input v-model="item.name" class="backup-name" placeholder="名称" allow-clear />
              <a-input v-model="item.url" class="backup-url" placeholder="http://127.0.0.1:8096" allow-clear />
              <a-button type="text" status="danger" size="mini" @click="removeBackupAddress(index)">
                <template #icon><i class="iconfont icondelete" /></template>
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import message from '../../utils/message'
import type { MediaServerConfig, MediaServerType } from '../../types/mediaServer'

const props = defineProps<{
  visible: boolean
  loading?: boolean
  editingServer?: MediaServerConfig | null
  defaultType?: MediaServerType
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'submit', payload: {
    type: MediaServerType
    name: string
    baseUrl: string
    notes?: string
    host?: string
    port?: string
    path?: string
    username?: string
    password?: string
    useHttps?: boolean
    syncFlag?: boolean
    backupAddresses?: Record<string, string>
    nameCustomized?: boolean
  }): void
}>()

interface BackupAddressInput {
  name: string
  url: string
}

const form = reactive({
  type: 'jellyfin' as MediaServerType,
  name: '',
  notes: '',
  host: '',
  port: '',
  path: '',
  username: '',
  password: '',
  useHttps: false,
  syncFlag: true,
  backupAddresses: [] as BackupAddressInput[]
})

const showPassword = ref(false)

const defaultPortMap: Record<MediaServerType, string> = {
  jellyfin: '8096',
  emby: '8096',
  plex: '32400'
}

const serverTypeTitle = computed(() => {
  if (form.type === 'jellyfin') return 'Jellyfin'
  if (form.type === 'emby') return 'Emby'
  return 'Plex'
})

const parseBaseUrl = (baseUrl: string) => {
  try {
    const url = new URL(baseUrl)
    return {
      useHttps: url.protocol === 'https:',
      host: url.hostname,
      port: url.port || '',
      path: url.pathname === '/' ? '' : url.pathname
    }
  } catch {
    return {
      useHttps: false,
      host: '',
      port: '',
      path: ''
    }
  }
}

const fillForm = () => {
  if (props.editingServer) {
    const parsed = parseBaseUrl(props.editingServer.baseUrl)
    form.type = props.editingServer.type
    form.name = props.editingServer.name
    form.notes = props.editingServer.notes || ''
    form.host = props.editingServer.host || parsed.host
    form.port = props.editingServer.port || parsed.port
    form.path = props.editingServer.path || parsed.path
    form.username = props.editingServer.username || ''
    form.password = props.editingServer.password || ''
    form.useHttps = props.editingServer.useHttps ?? parsed.useHttps
    form.syncFlag = props.editingServer.syncFlag ?? true
    form.backupAddresses = Object.entries(props.editingServer.backupAddresses || {}).map(([name, url]) => ({ name, url }))
    return
  }
  form.type = props.defaultType || 'jellyfin'
  form.name = ''
  form.notes = ''
  form.host = ''
  form.port = defaultPortMap[form.type]
  form.path = ''
  form.username = ''
  form.password = ''
  form.useHttps = false
  form.syncFlag = true
  form.backupAddresses = []
}

watch(() => props.visible, (visible) => {
  if (visible) fillForm()
}, { immediate: true })

watch(() => props.defaultType, () => {
  if (!props.editingServer && props.visible) fillForm()
})

watch(() => form.type, (type) => {
  if (!props.editingServer && !form.port) {
    form.port = defaultPortMap[type]
  }
})

const handleHttpsChange = (value: string | number | boolean) => {
  const checked = Boolean(value)
  form.useHttps = checked
  if (checked && (!form.port || form.port === defaultPortMap[form.type])) {
    form.port = '443'
  }
  if (!checked && (form.port === '443' || !form.port)) {
    form.port = defaultPortMap[form.type]
  }
}

const addBackupAddress = () => {
  form.backupAddresses.push({ name: '', url: '' })
}

const removeBackupAddress = (index: number) => {
  form.backupAddresses.splice(index, 1)
}

const buildBaseUrl = () => {
  const scheme = form.useHttps ? 'https' : 'http'
  const host = form.host.trim()
  const port = form.port.trim()
  const path = form.path.trim().replace(/^\/?/, '/')
  const normalizedPath = path === '/' || !path.trim() ? '' : path
  return `${scheme}://${host}${port ? `:${port}` : ''}${normalizedPath}`
}

const handleSubmit = () => {
  if (!form.host.trim()) {
    message.error('请填写服务器主机地址')
    return
  }
  const baseUrl = buildBaseUrl()
  const backupAddresses = form.backupAddresses.reduce<Record<string, string>>((acc, item) => {
    const name = item.name.trim()
    const url = item.url.trim()
    if (name && url) acc[name] = url
    return acc
  }, {})
  emit('submit', {
    type: form.type,
    name: form.name.trim() || form.host.trim(),
    nameCustomized: !!form.name.trim(),
    baseUrl,
    notes: form.notes.trim(),
    host: form.host.trim(),
    port: form.port.trim(),
    path: form.path.trim(),
    username: form.username.trim(),
    password: form.password,
    useHttps: form.useHttps,
    syncFlag: form.syncFlag,
    backupAddresses
  })
  emit('update:visible', false)
}
</script>

<style scoped>
.server-modal {
  padding: 6px 4px 2px;
}

.server-modal-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.form-section {
  padding: 20px 22px 18px;
}

.form-section.compact {
  padding-bottom: 0;
}

.panel-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
}

.panel-wide {
  grid-column: 1 / -1;
}

.section-title {
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.section-subtitle {
  font-size: 14px;
  font-weight: 600;
  color: #4b5563;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.field-label {
  width: 78px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.field-input {
  flex: 1;
}

.compact-switch {
  margin-bottom: 0;
}

.switch-row {
  justify-content: space-between;
}

.switch-row .field-label {
  width: auto;
}

.backup-block {
  margin-top: 6px;
  margin-bottom: 0;
}

.backup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.backup-add-btn {
  border-radius: 999px;
}

.backup-empty {
  padding: 14px 16px;
  border: 1px dashed rgba(15, 23, 42, 0.12);
  border-radius: 14px;
  color: #94a3b8;
  font-size: 14px;
}

.backup-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.backup-name {
  width: 160px;
  flex-shrink: 0;
}

.backup-url {
  flex: 1;
}

.address-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 18px;
}

@media (max-width: 900px) {
  .server-modal-grid,
  .address-grid {
    grid-template-columns: 1fr;
  }

  .backup-row {
    flex-wrap: wrap;
  }

  .backup-name,
  .backup-url {
    width: 100%;
  }
}

[arco-theme='dark'] .panel-card {
  border-color: rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(25, 30, 40, 0.96), rgba(18, 22, 30, 0.94));
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.26);
}

[arco-theme='dark'] .section-title,
[arco-theme='dark'] .field-label,
[arco-theme='dark'] .backup-header {
  color: rgba(244, 247, 252, 0.96);
}

[arco-theme='dark'] .desc-text,
[arco-theme='dark'] .hint-text,
[arco-theme='dark'] .backup-empty {
  color: rgba(191, 201, 216, 0.72);
}

[arco-theme='dark'] .backup-empty,
[arco-theme='dark'] .backup-row {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
}
</style>
