<script setup lang="ts">
import useSettingStore, { DanmakuApiSetting, DanmakuMode } from './settingstore'
import MySwitch from '../layout/MySwitch.vue'

const settingStore = useSettingStore()

const update = (partial: Partial<typeof settingStore.$state>) => {
  settingStore.updateStore(partial)
}

const createId = () => {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `danmaku-api-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const updateApis = (apis: DanmakuApiSetting[]) => {
  update({ danmakuApis: apis })
}

const addApi = () => {
  updateApis([...settingStore.danmakuApis, { id: createId(), name: '', url: '' }])
}

const removeApi = (id: string) => {
  updateApis(settingStore.danmakuApis.filter((api) => api.id !== id))
}

const patchApi = (id: string, partial: Partial<DanmakuApiSetting>) => {
  updateApis(settingStore.danmakuApis.map((api) => api.id === id ? { ...api, ...partial } : api))
}

const modeOptions: Array<{ label: string, value: DanmakuMode }> = [
  { label: '滚动', value: 0 },
  { label: '顶部', value: 1 },
  { label: '底部', value: 2 }
]
</script>

<template>
  <div class="settingcard play-settings-card">
    <div class="play-settings-intro">
      <div class="play-settings-kicker">Danmaku</div>
      <div class="play-settings-copy">配置弹幕库 API、自动匹配和 ArtPlayer 弹幕显示参数。</div>
    </div>

    <div class="play-setting-group">
      <div class="play-setting-header">
        <div class="settinghead">弹幕库 API</div>
        <a-button type="primary" size="small" tabindex="-1" @click="addApi">新增 API</a-button>
      </div>
      <div v-if="settingStore.danmakuApis.length === 0" class="settingrow play-setting-row">
        <span class="hitText">还没有配置弹幕库 API。配置后，播放器会默认使用第一个 API 自动搜索弹幕。</span>
      </div>
      <div v-for="(api, index) in settingStore.danmakuApis" :key="api.id" class="settingrow play-setting-row danmaku-api-row">
        <span class="opblue">#{{ index + 1 }}</span>
        <a-input
          tabindex="-1"
          :style="{ width: '180px' }"
          placeholder="名称"
          :model-value="api.name"
          @update:model-value="patchApi(api.id, { name: $event })"
        />
        <a-input
          tabindex="-1"
          :style="{ width: '420px' }"
          placeholder="https://example.com"
          :model-value="api.url"
          @update:model-value="patchApi(api.id, { url: $event })"
        />
        <a-button type="outline" size="small" status="danger" tabindex="-1" @click="removeApi(api.id)">删除</a-button>
      </div>
    </div>

    <div class="play-setting-group">
      <div class="play-setting-header">
        <div class="settinghead">弹幕显示参数</div>
      </div>
      <div class="settingrow play-setting-row danmaku-grid">
        <label>持续时间</label>
        <a-input-number tabindex="-1" :min="1" :max="10" :step="1" :model-value="settingStore.danmakuSpeed" @update:model-value="update({ danmakuSpeed: Number($event) })" />
        <label>上边距</label>
        <a-input-number tabindex="-1" :min="0" :max="200" :step="1" :model-value="settingStore.danmakuMarginTop" @update:model-value="update({ danmakuMarginTop: Number($event) })" />
        <label>下边距</label>
        <a-input tabindex="-1" :model-value="settingStore.danmakuMarginBottom" @update:model-value="update({ danmakuMarginBottom: $event })" />
        <label>透明度</label>
        <a-input-number tabindex="-1" :min="0" :max="1" :step="0.1" :model-value="settingStore.danmakuOpacity" @update:model-value="update({ danmakuOpacity: Number($event) })" />
        <label>字体大小</label>
        <a-input-number tabindex="-1" :min="12" :max="80" :step="1" :model-value="settingStore.danmakuFontSize" @update:model-value="update({ danmakuFontSize: Number($event) })" />
        <label>默认颜色</label>
        <a-input tabindex="-1" :model-value="settingStore.danmakuColor" @update:model-value="update({ danmakuColor: $event })" />
        <label>默认模式</label>
        <a-radio-group type="button" tabindex="-1" :model-value="settingStore.danmakuMode" @update:model-value="update({ danmakuMode: $event as DanmakuMode })">
          <a-radio v-for="mode in modeOptions" :key="mode.value" tabindex="-1" :value="mode.value">{{ mode.label }}</a-radio>
        </a-radio-group>
        <label>可见模式</label>
        <a-checkbox-group tabindex="-1" :model-value="settingStore.danmakuModes" @update:model-value="update({ danmakuModes: $event as DanmakuMode[] })">
          <a-checkbox v-for="mode in modeOptions" :key="mode.value" tabindex="-1" :value="mode.value">{{ mode.label }}</a-checkbox>
        </a-checkbox-group>
        <label>主题</label>
        <a-radio-group type="button" tabindex="-1" :model-value="settingStore.danmakuTheme" @update:model-value="update({ danmakuTheme: $event })">
          <a-radio tabindex="-1" value="dark">Dark</a-radio>
          <a-radio tabindex="-1" value="light">Light</a-radio>
        </a-radio-group>
      </div>
      <div class="settingrow play-setting-row danmaku-switches">
        <MySwitch :value="settingStore.danmakuVisible" @update:value="update({ danmakuVisible: $event })">默认显示弹幕</MySwitch>
        <MySwitch :value="settingStore.danmakuAntiOverlap" @update:value="update({ danmakuAntiOverlap: $event })">防重叠</MySwitch>
        <MySwitch :value="settingStore.danmakuSynchronousPlayback" @update:value="update({ danmakuSynchronousPlayback: $event })">同步播放速度</MySwitch>
        <MySwitch :value="settingStore.danmakuHeatmap" @update:value="update({ danmakuHeatmap: $event })">热力图</MySwitch>
      </div>
      <div class="settingrow play-setting-row play-setting-row--stack">
        <div class="settinghead">过滤字符串</div>
        <a-input
          tabindex="-1"
          :model-value="settingStore.danmakuFilterText"
          placeholder="多个关键词用英文逗号分割，例如：广告,剧透"
          @update:model-value="update({ danmakuFilterText: $event })"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.danmaku-api-row {
  gap: 10px;
  align-items: center;
}

.danmaku-grid {
  display: grid;
  grid-template-columns: 92px minmax(160px, 1fr) 92px minmax(160px, 1fr);
  gap: 12px 16px;
  align-items: center;
}

.danmaku-grid label {
  color: #516070;
}

.danmaku-switches {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
</style>
