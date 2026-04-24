<template>
  <div class="statistics-row">
    <div class="stat-card">
      <strong>{{ statistics.libraryCount }}</strong>
      <span>媒体库</span>
    </div>
    <div class="stat-card">
      <strong>{{ statistics.movieCount }}</strong>
      <span>电影</span>
    </div>
    <div class="stat-card">
      <strong>{{ statistics.seriesCount }}</strong>
      <span>剧集</span>
    </div>
    <div class="stat-card">
      <strong>{{ statistics.episodeCount }}</strong>
      <span>集</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MediaServerHomeStatistics } from '../../../types/mediaServerContent'

defineProps<{
  statistics: MediaServerHomeStatistics
}>()
</script>

<style scoped>
.statistics-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 4px;
}

.stat-card {
  padding: 18px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(15, 23, 42, 0.08);
  text-align: center;
}

.stat-card strong {
  display: block;
  margin-bottom: 6px;
  font-size: 22px;
  color: #111827;
}

.stat-card span {
  color: #64748b;
  font-size: 13px;
}

@media (max-width: 1280px) {
  .statistics-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

[arco-theme='dark'] .stat-card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

[arco-theme='dark'] .stat-card strong {
  color: rgba(244, 247, 252, 0.96);
}

[arco-theme='dark'] .stat-card span {
  color: rgba(191, 201, 216, 0.72);
}
</style>
