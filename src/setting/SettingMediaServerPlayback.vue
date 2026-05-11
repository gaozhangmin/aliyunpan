<script setup lang="ts">
import { reactive, ref } from 'vue'
import useSettingStore from './settingstore'
import {
  DEFAULT_MEDIA_SERVER_CUSTOM_DEVICE_PROFILE,
  MEDIA_SERVER_BITRATE_TEST_SIZE_OPTIONS,
  MEDIA_SERVER_COMPATIBILITY_OPTIONS,
  MEDIA_SERVER_PLAYBACK_QUALITY_OPTIONS,
  normalizeMediaServerCustomDeviceProfile,
  type MediaServerCustomDeviceProfile,
  type MediaServerDeviceProfileEntry
} from '../media-server/playbackQuality'

const settingStore = useSettingStore()
const cb = (val: any) => {
  settingStore.updateStore(val)
}

const showCustomProfileModal = ref(false)
const profileDraft = reactive<MediaServerCustomDeviceProfile>(cloneProfile(settingStore.uiMediaServerCustomDeviceProfile))

function cloneProfile(profile: MediaServerCustomDeviceProfile): MediaServerCustomDeviceProfile {
  return JSON.parse(JSON.stringify(normalizeMediaServerCustomDeviceProfile(profile)))
}

function replaceDraft(profile: MediaServerCustomDeviceProfile) {
  const next = cloneProfile(profile)
  profileDraft.Action = next.Action
  profileDraft.MaxStreamingBitrate = next.MaxStreamingBitrate
  profileDraft.MaxStaticBitrate = next.MaxStaticBitrate
  profileDraft.MusicStreamingTranscodingBitrate = next.MusicStreamingTranscodingBitrate
  profileDraft.DirectPlayProfiles = next.DirectPlayProfiles
  profileDraft.TranscodingProfiles = next.TranscodingProfiles
}

function createProfileEntry(transcoding = false): MediaServerDeviceProfileEntry {
  return transcoding
    ? {
        Type: 'Video',
        Container: 'ts',
        Protocol: 'hls',
        AudioCodec: 'aac,mp3',
        VideoCodec: 'h264',
        Context: 'Streaming',
        MaxAudioChannels: '2',
        MinSegments: '1',
        BreakOnNonKeyFrames: true
      }
    : {
        Type: 'Video',
        Container: 'mp4,m4v,mov',
        VideoCodec: 'h264',
        AudioCodec: 'aac'
      }
}

function openCustomProfileModal() {
  replaceDraft(settingStore.uiMediaServerCustomDeviceProfile)
  showCustomProfileModal.value = true
}

function addDirectPlayProfile() {
  profileDraft.DirectPlayProfiles.push(createProfileEntry(false))
}

function addTranscodingProfile() {
  profileDraft.TranscodingProfiles.push(createProfileEntry(true))
}

function removeDirectPlayProfile(index: number) {
  if (profileDraft.DirectPlayProfiles.length <= 1) return
  profileDraft.DirectPlayProfiles.splice(index, 1)
}

function removeTranscodingProfile(index: number) {
  profileDraft.TranscodingProfiles.splice(index, 1)
}

function resetCustomProfile() {
  replaceDraft(DEFAULT_MEDIA_SERVER_CUSTOM_DEVICE_PROFILE)
}

function saveCustomProfile() {
  cb({ uiMediaServerCustomDeviceProfile: normalizeMediaServerCustomDeviceProfile(profileDraft) })
  showCustomProfileModal.value = false
}
</script>

<template>
  <div class="settingcard play-settings-card">
    <div class="play-settings-intro">
      <div class="play-settings-kicker">Media Server</div>
      <div class="play-settings-copy">
        单独控制 Jellyfin / Emby / Plex 媒体服务器播放质量和兼容性。低码率或兼容模式会让服务器优先返回浏览器更容易播放的转码流。
      </div>
    </div>

    <div class="play-setting-group">
      <div class="play-setting-header">
        <div class="settinghead">默认码率</div>
      </div>
      <div class="settingrow play-setting-row">
        <a-select :model-value="settingStore.uiMediaServerVideoQuality"
                  tabindex="-1"
                  :style="{ width: '252px' }"
                  placeholder="最大码率"
                  :trigger-props="{ autoFitPopupMinWidth: true }"
                  @update:model-value="cb({ uiMediaServerVideoQuality: $event })">
          <a-option v-for="option in MEDIA_SERVER_PLAYBACK_QUALITY_OPTIONS"
                    :key="option.value"
                    :value="option.value">
            {{ option.label }}
          </a-option>
        </a-select>
      </div>
      <div class="hitText">
        限制媒体服务器播放使用的最高码率。选择“最高”时尽量直连；选择较低码率时会请求服务器返回转码播放地址。
      </div>
    </div>

    <div v-if="settingStore.uiMediaServerVideoQuality === 'auto'" class="play-setting-group">
      <div class="play-setting-header">
        <div class="settinghead">测速大小</div>
      </div>
      <div class="settingrow play-setting-row">
        <a-select :model-value="settingStore.uiMediaServerBitrateTestSize"
                  tabindex="-1"
                  :style="{ width: '252px' }"
                  placeholder="测速大小"
                  :trigger-props="{ autoFitPopupMinWidth: true }"
                  @update:model-value="cb({ uiMediaServerBitrateTestSize: $event })">
          <a-option v-for="option in MEDIA_SERVER_BITRATE_TEST_SIZE_OPTIONS"
                    :key="option.value"
                    :value="option.value">
            {{ option.label }}
          </a-option>
        </a-select>
      </div>
      <div class="hitText">
        对应 iOS 的 Auto 码率测速大小设置。桌面端当前保留该偏好，自动码率不会强制限制服务器码率。
      </div>
    </div>

    <div class="play-setting-group">
      <div class="play-setting-header">
        <div class="settinghead">设备配置</div>
      </div>
      <div class="settingrow play-setting-row">
        <a-select :model-value="settingStore.uiMediaServerCompatibilityMode"
                  tabindex="-1"
                  :style="{ width: '252px' }"
                  placeholder="兼容性"
                  :trigger-props="{ autoFitPopupMinWidth: true }"
                  @update:model-value="cb({ uiMediaServerCompatibilityMode: $event })">
          <a-option v-for="option in MEDIA_SERVER_COMPATIBILITY_OPTIONS"
                    :key="option.value"
                    :value="option.value">
            {{ option.label }}
          </a-option>
        </a-select>
      </div>
      <div class="compatibility-help">
        <div v-for="option in MEDIA_SERVER_COMPATIBILITY_OPTIONS" :key="option.value">
          <strong>{{ option.label }}</strong>
          <span>{{ option.description }}</span>
        </div>
      </div>
      <div v-if="settingStore.uiMediaServerCompatibilityMode === 'custom'" class="custom-profile-actions">
        <a-button type="outline" @click="openCustomProfileModal">配置文件</a-button>
        <span>编辑并持久化媒体服务器 PlaybackInfo 使用的 DeviceProfile。</span>
      </div>
    </div>

    <a-modal
      v-model:visible="showCustomProfileModal"
      title="媒体服务器配置文件"
      :footer="false"
      :unmount-on-close="true"
      modal-class="media-server-profile-modal"
      @cancel="showCustomProfileModal = false">
      <div class="profile-modal-body">
        <div class="profile-section">
          <div class="profile-section-head">
            <div>
              <strong>行为</strong>
              <span>与 iOS 的 Add / Replace 保持一致，决定自定义配置如何合并默认配置。</span>
            </div>
          </div>
          <div class="profile-grid">
            <label>
              <span>CustomDeviceProfileAction</span>
              <a-select v-model="profileDraft.Action" :style="{ width: '100%' }">
                <a-option value="add">添加到默认配置</a-option>
                <a-option value="replace">替换默认配置</a-option>
              </a-select>
            </label>
          </div>
        </div>

        <div class="profile-section">
          <div class="profile-section-head">
            <div>
              <strong>码率限制</strong>
              <span>留空表示不在自定义配置中指定，由上方默认码率决定。</span>
            </div>
          </div>
          <div class="profile-grid three">
            <label>
              <span>MaxStreamingBitrate</span>
              <a-input-number v-model="profileDraft.MaxStreamingBitrate" :min="1" :step="1000000" placeholder="空" />
            </label>
            <label>
              <span>MaxStaticBitrate</span>
              <a-input-number v-model="profileDraft.MaxStaticBitrate" :min="1" :step="1000000" placeholder="空" />
            </label>
            <label>
              <span>MusicStreamingTranscodingBitrate</span>
              <a-input-number v-model="profileDraft.MusicStreamingTranscodingBitrate" :min="1" :step="1000000" placeholder="空" />
            </label>
          </div>
        </div>

        <div class="profile-section">
          <div class="profile-section-head">
            <div>
              <strong>DirectPlayProfiles</strong>
              <span>服务器会按这些容器和编码判断是否可以直连。</span>
            </div>
            <a-button size="small" type="outline" @click="addDirectPlayProfile">添加</a-button>
          </div>
          <div class="profile-entry-list">
            <div v-for="(profile, index) in profileDraft.DirectPlayProfiles" :key="`direct-${index}`" class="profile-entry">
              <div class="profile-entry-title">
                <strong>直连规则 {{ index + 1 }}</strong>
                <a-button size="mini" status="danger" type="text" :disabled="profileDraft.DirectPlayProfiles.length <= 1" @click="removeDirectPlayProfile(index)">删除</a-button>
              </div>
              <div class="profile-grid">
                <label>
                  <span>Container</span>
                  <a-input v-model="profile.Container" placeholder="mp4,m4v,mov" />
                </label>
                <label>
                  <span>VideoCodec</span>
                  <a-input v-model="profile.VideoCodec" placeholder="h264,vp9,av1" />
                </label>
                <label>
                  <span>AudioCodec</span>
                  <a-input v-model="profile.AudioCodec" placeholder="aac,mp3,opus" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <div class="profile-section-head">
            <div>
              <strong>TranscodingProfiles</strong>
              <span>服务器需要转码时可返回的目标格式。</span>
            </div>
            <a-button size="small" type="outline" @click="addTranscodingProfile">添加</a-button>
          </div>
          <div class="profile-entry-list">
            <div v-for="(profile, index) in profileDraft.TranscodingProfiles" :key="`transcode-${index}`" class="profile-entry">
              <div class="profile-entry-title">
                <strong>转码规则 {{ index + 1 }}</strong>
                <a-button size="mini" status="danger" type="text" @click="removeTranscodingProfile(index)">删除</a-button>
              </div>
              <div class="profile-grid">
                <label>
                  <span>Container</span>
                  <a-input v-model="profile.Container" placeholder="ts / mp4" />
                </label>
                <label>
                  <span>Protocol</span>
                  <a-input v-model="profile.Protocol" placeholder="hls / http" />
                </label>
                <label>
                  <span>Context</span>
                  <a-input v-model="profile.Context" placeholder="Streaming" />
                </label>
                <label>
                  <span>VideoCodec</span>
                  <a-input v-model="profile.VideoCodec" placeholder="h264" />
                </label>
                <label>
                  <span>AudioCodec</span>
                  <a-input v-model="profile.AudioCodec" placeholder="aac,mp3" />
                </label>
                <label>
                  <span>MaxAudioChannels</span>
                  <a-input v-model="profile.MaxAudioChannels" placeholder="2" />
                </label>
                <label>
                  <span>MinSegments</span>
                  <a-input v-model="profile.MinSegments" placeholder="1" />
                </label>
                <label class="profile-checkbox">
                  <span>BreakOnNonKeyFrames</span>
                  <a-checkbox v-model="profile.BreakOnNonKeyFrames" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="profile-modal-actions">
          <a-button @click="resetCustomProfile">恢复默认</a-button>
          <div>
            <a-button @click="showCustomProfileModal = false">取消</a-button>
            <a-button type="primary" @click="saveCustomProfile">保存</a-button>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.play-settings-card {
  overflow: hidden;
}

.play-settings-intro {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.play-settings-kicker {
  display: inline-flex;
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(88, 130, 255, 0.12);
  color: var(--color-primary-6);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.play-settings-copy {
  max-width: 680px;
  color: var(--color-text-2);
  font-size: 14px;
  line-height: 1.7;
}

.play-setting-group {
  padding: 18px 0;
  border-top: 1px solid rgba(120, 138, 165, 0.14);
}

.play-setting-group:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.play-setting-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.play-setting-row {
  width: 100%;
  min-width: 0 !important;
}

.play-settings-card :deep(.settinghead) {
  width: auto;
  min-width: 0;
  margin: 0;
  padding: 0;
  white-space: normal;
  line-height: 1.35;
}

.play-settings-card :deep(.settinghead::after) {
  display: none;
}

.play-settings-card :deep(.settingrow) {
  margin-top: 0;
}

.hitText,
.compatibility-help {
  max-width: 720px;
  margin-top: 10px;
  padding: 8px 12px;
  border: 1px solid rgba(120, 138, 165, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.36);
  font-size: 13px;
  color: var(--color-text-2);
  line-height: 1.6;
}

.compatibility-help {
  display: grid;
  gap: 6px;
}

.compatibility-help div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
}

.custom-profile-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  color: var(--color-text-2);
  font-size: 13px;
}

.profile-modal-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: min(72vh, 720px);
  overflow: auto;
  padding-right: 4px;
}

.profile-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-section-head,
.profile-entry-title,
.profile-modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.profile-section-head div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-section-head span {
  color: var(--color-text-2);
  font-size: 12px;
}

.profile-entry-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-entry {
  padding: 12px;
  border: 1px solid rgba(120, 138, 165, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.36);
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.profile-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 0;
}

.profile-grid label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.profile-grid label > span {
  color: var(--color-text-2);
  font-size: 12px;
}

.profile-checkbox {
  justify-content: flex-end;
}

.profile-modal-actions {
  position: sticky;
  bottom: 0;
  padding-top: 12px;
  background: var(--color-bg-2);
}

.profile-modal-actions > div {
  display: flex;
  gap: 10px;
}

:global(html.dark) .play-settings-kicker {
  background: rgba(120, 160, 255, 0.2);
  color: #dbe6ff;
}

:global(html.dark) .play-setting-group {
  border-top-color: rgba(140, 158, 183, 0.16);
}

:global(html.dark) .hitText,
:global(html.dark) .compatibility-help {
  background: rgba(32, 39, 52, 0.5);
  border-color: rgba(140, 158, 183, 0.2);
  color: rgba(236, 242, 255, 0.78);
}

:global(html.dark) .profile-entry {
  background: rgba(32, 39, 52, 0.5);
  border-color: rgba(140, 158, 183, 0.2);
}

@media (max-width: 960px) {
  .play-setting-header {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .compatibility-help div {
    grid-template-columns: 1fr;
  }

  .custom-profile-actions,
  .profile-section-head,
  .profile-modal-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-grid,
  .profile-grid.three {
    grid-template-columns: 1fr;
  }
}
</style>
