<template>
  <a-modal
    :visible="visible"
    title="连接到 WebDAV"
    ok-text="连接"
    width="920px"
    modal-class="webdav-connect-modal"
    :ok-loading="loading"
    @ok="handleSubmit"
    @cancel="emit('update:visible', false)"
  >
    <div class="webdav-modal">
      <div class="webdav-grid">
        <div class="panel-card form-section">
          <div class="section-title">基本信息</div>

          <div class="field-row">
            <div class="field-label">名称</div>
            <a-input v-model="form.name" class="field-input" placeholder="例如：NAS 影视库" allow-clear />
          </div>

          <div class="field-row">
            <div class="field-label">挂载路径</div>
            <a-input v-model="form.rootPath" class="field-input" placeholder="默认：/" allow-clear />
          </div>
        </div>

        <div class="panel-card form-section">
          <div class="section-title">登录信息</div>

          <div class="field-row">
            <div class="field-label">用户名</div>
            <a-input v-model="form.username" class="field-input" allow-clear />
          </div>

          <div class="field-row">
            <div class="field-label">密码</div>
            <a-input-password v-model="form.password" class="field-input" allow-clear />
          </div>
        </div>

        <div class="panel-card form-section panel-wide">
          <div class="section-title">服务器地址</div>

          <div class="field-row no-margin">
            <div class="field-label">地址</div>
            <a-input v-model="form.url" class="field-input" placeholder="例如：http://127.0.0.1:5244/dav" allow-clear />
          </div>

          <div class="hint-text">支持 HTTP / HTTPS，建议填写完整 WebDAV 服务地址。</div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import message from '../../utils/message'

const props = defineProps<{
  visible: boolean
  loading?: boolean
  modelValue: {
    name: string
    url: string
    username: string
    password: string
    rootPath: string
  }
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'update:modelValue', value: {
    name: string
    url: string
    username: string
    password: string
    rootPath: string
  }): void
  (event: 'submit'): void
}>()

const form = reactive({
  name: '',
  url: '',
  username: '',
  password: '',
  rootPath: '/'
})

watch(() => props.visible, (visible) => {
  if (!visible) return
  form.name = props.modelValue.name
  form.url = props.modelValue.url
  form.username = props.modelValue.username
  form.password = props.modelValue.password
  form.rootPath = props.modelValue.rootPath
}, { immediate: true })

watch(form, () => {
  emit('update:modelValue', { ...form })
}, { deep: true })

const handleSubmit = () => {
  if (!form.url.trim() || !form.username.trim() || !form.password.trim()) {
    message.error('请至少填写 WebDAV 地址、用户名和密码')
    return
  }
  emit('submit')
}
</script>

<style scoped>
.webdav-modal {
  padding: 6px 4px 2px;
}

.webdav-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
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

.form-section {
  padding: 20px 22px 18px;
}

.section-title {
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.field-row.no-margin {
  margin-bottom: 0;
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

.hint-text {
  margin-top: 12px;
  padding-left: 92px;
  font-size: 13px;
  color: #94a3b8;
}

@media (max-width: 900px) {
  .webdav-grid {
    grid-template-columns: 1fr;
  }
}

[arco-theme='dark'] .panel-card {
  border-color: rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(25, 30, 40, 0.96), rgba(18, 22, 30, 0.94));
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.26);
}

[arco-theme='dark'] .section-title,
[arco-theme='dark'] .field-label {
  color: rgba(244, 247, 252, 0.96);
}

[arco-theme='dark'] .hint-text {
  color: rgba(191, 201, 216, 0.72);
}
</style>
