<template>
  <a-modal
    :visible="visible"
    title="选择 Plex 服务器"
    width="720px"
    modal-class="media-server-modal"
    :ok-text="'保存'"
    :ok-loading="loading"
    :ok-button-props="{ disabled: selectedIds.length === 0 }"
    @ok="handleConfirm"
    @cancel="emit('update:visible', false)"
  >
    <div class="plex-modal">
      <div v-if="resources.length === 0" class="plex-empty">没有可用的 Plex 资源</div>

      <div v-else class="plex-resource-list">
        <button
          v-for="resource in resources"
          :key="resource.clientIdentifier || resource.name"
          type="button"
          class="plex-resource-row"
          :class="{ selected: isSelected(resource) }"
          @click="toggleResource(resource)"
        >
          <div class="plex-resource-left">
            <div class="plex-resource-icon"><i class="iconfont iconserver" /></div>
            <div class="plex-resource-info">
              <div class="plex-resource-name">{{ resource.name }}</div>
              <div class="plex-resource-subtitle">
                {{ getConnectionSummary(resource) }}
              </div>
            </div>
          </div>
          <div class="plex-resource-check">
            <i :class="['iconfont', isSelected(resource) ? 'iconcheckbox-checked' : 'iconcheckbox-unchecked']" />
          </div>
        </button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PlexResource } from '../../types/mediaServerPlex'

const props = defineProps<{
  visible: boolean
  resources: PlexResource[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'confirm', resources: PlexResource[]): void
}>()

const selectedIds = ref<string[]>([])

watch(() => props.visible, (visible) => {
  if (!visible) return
  selectedIds.value = props.resources
    .filter((resource) => !!resource.accessToken)
    .map((resource) => resource.clientIdentifier || resource.name)
}, { immediate: true })

const selectableResources = computed(() => props.resources.filter((resource) => !!resource.accessToken))

const isSelected = (resource: PlexResource) => {
  const id = resource.clientIdentifier || resource.name
  return selectedIds.value.includes(id)
}

const toggleResource = (resource: PlexResource) => {
  if (!resource.accessToken) return
  const id = resource.clientIdentifier || resource.name
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((item) => item !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

const getConnectionSummary = (resource: PlexResource) => {
  const count = resource.connections?.length || 0
  return count > 0 ? `${count} 个可用连接` : '无可用连接'
}

const handleConfirm = () => {
  const selected = selectableResources.value.filter((resource) => selectedIds.value.includes(resource.clientIdentifier || resource.name))
  emit('confirm', selected)
}
</script>

<style scoped>
.plex-modal {
  padding: 4px 0 6px;
}

.plex-empty {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 16px;
}

.plex-resource-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 420px;
  overflow: auto;
  padding-right: 4px;
}

.plex-resource-row {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, rgba(252, 252, 252, 0.98), rgba(241, 243, 247, 0.95));
  border-radius: 18px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
  transition: 0.18s ease;
}

.plex-resource-row:hover,
.plex-resource-row.selected {
  border-color: rgba(22, 119, 255, 0.4);
  box-shadow: 0 10px 24px rgba(22, 119, 255, 0.12);
}

.plex-resource-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.plex-resource-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 181, 71, 0.16);
  color: #b45309;
  font-size: 18px;
  flex-shrink: 0;
}

.plex-resource-info {
  min-width: 0;
}

.plex-resource-name {
  font-size: 17px;
  font-weight: 700;
  color: #111827;
  line-height: 1.4;
}

.plex-resource-subtitle {
  margin-top: 2px;
  font-size: 13px;
  color: #6b7280;
}

.plex-resource-check {
  color: #1677ff;
  font-size: 18px;
  flex-shrink: 0;
}

[arco-theme='dark'] .plex-resource-empty {
  color: rgba(201, 209, 223, 0.72);
}

[arco-theme='dark'] .plex-resource-row {
  border-color: rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(28, 32, 42, 0.96), rgba(20, 24, 33, 0.94));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
}

[arco-theme='dark'] .plex-resource-row:hover,
[arco-theme='dark'] .plex-resource-row.selected {
  border-color: rgba(64, 156, 255, 0.42);
  box-shadow: 0 14px 30px rgba(23, 92, 211, 0.24);
}

[arco-theme='dark'] .plex-resource-icon {
  background: rgba(255, 181, 71, 0.14);
  color: #fbbf24;
}

[arco-theme='dark'] .plex-resource-name {
  color: rgba(244, 247, 252, 0.96);
}

[arco-theme='dark'] .plex-resource-subtitle {
  color: rgba(191, 201, 216, 0.72);
}
</style>
