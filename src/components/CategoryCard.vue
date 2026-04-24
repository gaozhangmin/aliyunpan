<template>
  <div
    class="category-card"
    :class="`category-card--${type}`"
    @click="$emit('click', { name, type, count })"
    @contextmenu.prevent="$emit('contextmenu', $event, { name, type, count })"
  >
    <div class="category-card__background" :style="{ background: gradient }"></div>

    <!-- 封面图层 -->
    <div v-if="coverImage" class="category-card__cover">
      <img :src="coverImage" :alt="name" />
      <div class="category-card__overlay"></div>
    </div>

    <div class="category-card__content">
      <h3 class="category-card__name">{{ name }}</h3>
      <div class="category-card__count">
        <span class="category-card__number">{{ count }}</span>
        <span class="category-card__label">个项目</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  name: string
  count: number
  type: 'genre' | 'rating' | 'year'
  gradient?: string
  coverImage?: string  // 新增封面图属性
}

interface Emits {
  (e: 'click', data: { name: string; type: string; count: number }): void
  (e: 'contextmenu', event: MouseEvent, data: { name: string; type: string; count: number }): void
}

const props = withDefaults(defineProps<Props>(), {
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
})

defineEmits<Emits>()
</script>

<style scoped>
.category-card {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 184px;
  border-radius: 20px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.52);
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 44px rgba(15, 23, 42, 0.12);
}

.category-card__background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.9;
  transition: opacity 0.3s ease;
}

.category-card:hover .category-card__background {
  opacity: 1;
}

/* 封面图样式 */
.category-card__cover {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.category-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease, filter 0.35s ease;
}

.category-card:hover .category-card__cover img {
  transform: scale(1.03);
  filter: saturate(1.05) contrast(1.02);
}

.category-card__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    180deg,
    rgba(8, 15, 28, 0.2) 0%,
    rgba(8, 15, 28, 0.34) 58%,
    rgba(8, 15, 28, 0.48) 100%
  );
  transition: opacity 0.3s ease;
}

.category-card:hover .category-card__overlay {
  opacity: 0.92;
}

.category-card__content {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: white;
  z-index: 2;
  text-align: center;
}

.category-card__name {
  font-size: 21px;
  font-weight: 800;
  margin: 0;
  text-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-width: 80%;
}

.category-card__count {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  opacity: 1;
  pointer-events: none;
}

.category-card__number {
  font-size: 13px;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  line-height: 1;
}

.category-card__label {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 类型特定样式 */
.category-card--genre {
  --gradient-from: #667eea;
  --gradient-to: #764ba2;
}

.category-card--genre .category-card__background {
  background: linear-gradient(135deg, var(--gradient-from) 0%, var(--gradient-to) 100%);
}

.category-card--rating {
  --gradient-from: #f093fb;
  --gradient-to: #f5576c;
}

.category-card--rating .category-card__background {
  background: linear-gradient(135deg, var(--gradient-from) 0%, var(--gradient-to) 100%);
}

.category-card--year {
  --gradient-from: #4facfe;
  --gradient-to: #00f2fe;
}

.category-card--year .category-card__background {
  background: linear-gradient(135deg, var(--gradient-from) 0%, var(--gradient-to) 100%);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .category-card {
    min-height: 148px;
    border-radius: 18px;
  }

  .category-card__content {
    padding: 18px;
  }

  .category-card__name {
    font-size: 17px;
    max-width: 88%;
  }
}

/* 深色模式适配 */
[arco-theme='dark'] .category-card {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.28);
}

[arco-theme='dark'] .category-card:hover {
  box-shadow: 0 24px 44px rgba(0, 0, 0, 0.34);
}
</style>
