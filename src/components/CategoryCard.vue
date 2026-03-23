<template>
  <div
    class="category-card"
    :class="`category-card--${type}`"
    @click="$emit('click', { name, type, count })"
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
}

const props = withDefaults(defineProps<Props>(), {
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
})

defineEmits<Emits>()
</script>

<style scoped>
.category-card {
  position: relative;
  width: 180px;
  height: 120px;
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--color-neutral-3);
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
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
  transition: transform 0.3s ease;
}

.category-card:hover .category-card__cover img {
  transform: scale(1.05);
}

.category-card__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.3) 0%,
    rgba(0, 0, 0, 0.6) 100%
  );
  transition: opacity 0.3s ease;
}

.category-card:hover .category-card__overlay {
  opacity: 0.8;
}

.category-card__content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  color: white;
  z-index: 2;
}

.category-card__name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-card__count {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.category-card__number {
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  line-height: 1;
}

.category-card__label {
  font-size: 12px;
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
    width: 160px;
    height: 100px;
  }

  .category-card__content {
    padding: 12px;
  }

  .category-card__name {
    font-size: 14px;
  }

  .category-card__number {
    font-size: 20px;
  }

  .category-card__label {
    font-size: 11px;
  }
}

/* 深色模式适配 */
[arco-theme='dark'] .category-card {
  border-color: var(--color-neutral-4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

[arco-theme='dark'] .category-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
</style>