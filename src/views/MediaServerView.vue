<template>
  <div class="media-server-view">
    <MySplit :visible="props.navVisible ?? true">
      <template #first>
        <div class="media-server-sidebar">
          <div class="media-server-nav">
            <button type="button" class="media-server-title" @click="navigation.openRegistry()">
              <h2>媒体服务器</h2>
            </button>
            <MediaServerNavSection @navigate="handleNavigate" />
          </div>
        </div>
      </template>

      <template #second>
        <div class="media-server-content">
          <MediaServerWorkspace />
        </div>
      </template>
    </MySplit>
  </div>
</template>

<script setup lang="ts">
import MySplit from '../layout/MySplit.vue'
import MediaServerWorkspace from './MediaServerWorkspace.vue'
import MediaServerNavSection from '../components/media-server/MediaServerNavSection.vue'
import useMediaServerNavigationStore from '../store/mediaServerNavigation'
import useMediaServerRegistryStore from '../store/mediaServerRegistry'
import type { MediaServerRoute } from '../types/mediaServer'

const props = defineProps<{
  navVisible?: boolean
}>()

const navigation = useMediaServerNavigationStore()
const registry = useMediaServerRegistryStore()

const handleNavigate = (route: MediaServerRoute) => {
  registry.ensureLoaded()
  switch (route.kind) {
    case 'registry':
      navigation.openRegistry()
      break
    case 'home':
      navigation.goHome()
      break
    case 'search':
      navigation.goSearch(route.query || '')
      break
    case 'library-root':
      navigation.goLibraryRoot()
      break
    default:
      navigation.replace(route)
      break
  }
}
</script>

<style scoped>
.media-server-view,
.media-server-sidebar,
.media-server-content {
  height: 100%;
}

.media-server-sidebar {
  overflow: auto;
  background: var(--color-bg-1);
  border-right: 1px solid var(--color-neutral-3);
}

.media-server-nav {
  min-height: 100%;
  padding: 20px 0 28px;
  background: linear-gradient(180deg, rgba(var(--primary-6), 0.02) 0%, transparent 22%);
}

.media-server-title {
  width: 100%;
  padding: 0 20px 12px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.media-server-title:hover {
  opacity: 0.82;
  transform: translateX(2px);
}

.media-server-title h2 {
  margin: 0;
  color: var(--color-text-1);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.media-server-content {
  overflow: hidden;
}
</style>
