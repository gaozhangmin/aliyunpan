<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Modal } from '@arco-design/web-vue'
import { t } from '../i18n'
import MediaCollectionPicker from './MediaCollectionPicker.vue'
import { createServerPlaylist, deleteServerPlaylist, listServerPlaylists, serverPlaylistMembership, setServerPlaylistMembership, type ServerPlaylistTarget } from '../media-server/playlists'
const target = ref<ServerPlaylistTarget | null>(null)
const rows = ref<{ id: string; title: string; count: number; selected: boolean }[]>([])
const busy = ref(false)
const editing = ref<string | null>(null)
const name = ref('')
const error = ref('')
async function reload(current: ServerPlaylistTarget) {
  const playlists = await listServerPlaylists(current.config)
  const loaded = []
  for (const playlist of playlists) loaded.push({ ...playlist, selected: await serverPlaylistMembership(current.config, playlist.id, current.itemId) })
  if (target.value === current) rows.value = loaded
}
async function run(operation: (current: ServerPlaylistTarget) => Promise<void>) {
  if (busy.value || !target.value) return
  const current = target.value
  busy.value = true; error.value = ''
  try { await operation(current); await reload(current) }
  catch {
    error.value = t('playlist.errorMessage')
    Modal.error({ title: t('playlist.errorTitle'), content: error.value, okText: t('playlist.errorClose') })
  }
  finally { busy.value = false }
}
function open(event: Event) {
  if (busy.value) return
  const value = (event as CustomEvent<ServerPlaylistTarget>).detail
  if (!value?.config || !value.itemId) return
  target.value = { ...value, config: { ...value.config } }; rows.value = []; editing.value = null; name.value = ''; error.value = ''
  void run(async () => {})
}
function close() { if (!busy.value) target.value = null }
function create() {
  if (!name.value.trim()) return
  void run(async current => { await createServerPlaylist(current.config, name.value, current.itemId); editing.value = null; name.value = '' })
}
function toggle(id: string) {
  const row = rows.value.find(row => row.id === id)
  if (row) void run(current => setServerPlaylistMembership(current.config, id, current.itemId, !row.selected))
}
function remove(id: string) {
  Modal.confirm({ title: '删除播放列表', content: '删除服务器上的播放列表？媒体文件不会被删除。', onBeforeOk: async () => {
    await run(current => deleteServerPlaylist(current.config, id))
    return !error.value
  } })
}
onMounted(() => window.addEventListener('boxplayer:server-playlist', open))
onUnmounted(() => window.removeEventListener('boxplayer:server-playlist', open))
</script>
<template>
  <MediaCollectionPicker :visible="!!target" heading="播放列表" :item-title="target?.title || ''" :rows="rows" :editing="editing" v-model:name="name" :busy="busy" :error="error" removable :renamable="false" @close="close" @done="close" @create="editing = ''; name = ''" @toggle="toggle" @remove="remove" @cancel-name="editing = null" @confirm-name="create" />
</template>
