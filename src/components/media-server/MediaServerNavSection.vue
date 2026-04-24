<template>
  <div class="server-section">
    <div v-if="registry.filteredServers.length > 0" class="nav-section">
      <div class="nav-header">
        <span>服务器列表</span>
      </div>

      <div class="nav-items">
        <div class="server-sublist">
          <div
            v-for="server in registry.filteredServers"
            :key="server.id"
            class="nav-item server-item"
            :class="{ active: registry.currentServer?.id === server.id && isServerPageActive }"
            @click="handleServerClick(server.id)"
          >
            <div class="server-icon-wrap">
              <img class="server-icon" :src="serverDisplayIcon(server)" :alt="serverTypeLabel(server.type)" />
            </div>
            <div class="server-main">
              <div class="server-texts">
                <span class="server-name">{{ server.name }}</span>
                <span class="server-meta">{{ serverTypeLabel(server.type) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import useMediaServerRegistryStore from '../../store/mediaServerRegistry'
import useMediaServerNavigationStore from '../../store/mediaServerNavigation'
import type { MediaServerConfig, MediaServerRoute, MediaServerType } from '../../types/mediaServer'
import jellyfinIcon from '../../assets/media-server/jellyfin.svg'
import embyIcon from '../../assets/media-server/emby.svg'
import plexIcon from '../../assets/media-server/plex.svg'

const emit = defineEmits<{
  (event: 'navigate', route: MediaServerRoute): void
}>()

const registry = useMediaServerRegistryStore()
const navigation = useMediaServerNavigationStore()

const currentRoute = computed(() => navigation.currentRoute)
const isServerPageActive = computed(() => ['home', 'search', 'library-root', 'library-page', 'item-detail', 'person-page', 'collection-page', 'genre-page', 'studio-page'].includes(currentRoute.value.kind))

const serverTypeLabel = (type: MediaServerType) => {
  if (type === 'jellyfin') return 'Jellyfin'
  if (type === 'emby') return 'Emby'
  return 'Plex'
}

const serverTypeIcon = (type: MediaServerType) => {
  if (type === 'jellyfin') return jellyfinIcon
  if (type === 'emby') return embyIcon
  return plexIcon
}

const serverDisplayIcon = (server: MediaServerConfig) => server.customIconUrl || serverTypeIcon(server.type)

const handleServerClick = (serverId: string) => {
  registry.setCurrentServer(serverId)
  emit('navigate', { kind: 'home' })
}

onMounted(() => {
  registry.ensureLoaded()
})
</script>

<style scoped>
.server-section {
  padding-bottom: 12px;
}

.nav-section {
  margin-bottom: 20px;
}

.nav-header {
  display: flex;
  align-items: center;
  padding: 0 20px 10px;
  color: var(--color-text-3);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.nav-items {
  padding: 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: 6px;
  border-radius: 18px;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-2);
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
  position: relative;
  background: transparent;
  min-width: 0;
  white-space: nowrap;
}

.nav-item:hover {
  background: var(--color-fill-2);
  color: var(--color-text-1);
  transform: translateX(2px);
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(var(--primary-6), 0.16), rgba(var(--primary-6), 0.08));
  color: var(--color-primary-6);
  font-weight: 600;
  box-shadow: 0 10px 24px rgba(var(--primary-6), 0.12);
  transform: translateX(2px);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 28px;
  background: linear-gradient(to bottom, var(--color-primary-5), var(--color-primary-6));
  border-radius: 0 2px 2px 0;
}

.nav-item i {
  width: 22px;
  height: 22px;
  font-size: 20px;
  text-align: center;
  line-height: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.nav-item span:first-of-type {
  flex: 1;
  line-height: 1.4;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server-sublist {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.server-item {
  margin-left: 0;
  margin-bottom: 0;
  padding: 12px 16px;
  border-radius: 18px;
  background: transparent;
  border: none;
  box-shadow: none;
  transform: none;
  gap: 14px;
}

.server-item:hover {
  transform: translateX(2px);
}

.server-item.active {
  background: linear-gradient(135deg, rgba(var(--primary-6), 0.16), rgba(var(--primary-6), 0.08));
  box-shadow: 0 10px 24px rgba(var(--primary-6), 0.12);
}

.server-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.server-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-fill-2);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.server-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  display: block;
}

.server-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.server-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
  color: inherit;
}

.server-meta {
  font-size: 12px;
  line-height: 1.4;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.server-item.active .server-meta {
  color: rgba(var(--primary-6), 0.9);
}

[arco-theme='dark'] .nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

[arco-theme='dark'] .nav-item.active {
  background: linear-gradient(135deg, rgba(var(--primary-6), 0.24), rgba(var(--primary-6), 0.14));
}

[arco-theme='dark'] .server-item {
  background: transparent;
  border: none;
  box-shadow: none;
}

[arco-theme='dark'] .server-item.active {
  background: linear-gradient(135deg, rgba(var(--primary-6), 0.24), rgba(var(--primary-6), 0.14));
  box-shadow: 0 10px 24px rgba(var(--primary-6), 0.16);
}

[arco-theme='dark'] .server-icon-wrap {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

[arco-theme='dark'] .server-item.active .server-meta {
  color: rgba(191, 219, 254, 0.92);
}
</style>
