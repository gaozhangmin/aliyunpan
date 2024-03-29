<script setup lang='ts'>
import { PropType } from 'vue'

const props = defineProps({
  value: { type: Boolean },
  disabled: { type: Boolean },
  beforeChange: {
    type: Function as PropType<(newValue: string | number | boolean) => Promise<boolean | void> | boolean | void>
  }
})
const emits = defineEmits(['update:value', 'change'])
</script>

<template>
  <div class='myswitch'>
    <a-switch type="round" :model-value='value' tabindex='-1'
              :before-change="beforeChange"
              @change="$emit('change', $event)"
              :disabled="disabled"
              @update:model-value="$emit('update:value', $event)">
    </a-switch>
    <span class='myswitchspan' @click="$emit('update:value', !value)">
      <slot></slot>
    </span>
  </div>
</template>
<style>
.myswitch {
  height: 30px;
  align-items: center;
  user-select: none;
  display: inline-flex;
}

.myswitch .arco-switch {
  min-width: 36px;
  height: 18px;
  line-height: 18px;
}

.myswitch .arco-switch-handle {
  width: 12px;
  height: 12px;
  top: 3px;
}

.myswitch .arco-switch-checked .arco-switch-handle {
  left: calc(100% - 16px);
}

.myswitch .arco-icon-loading, .arco-icon-spin {
  width: 12px;
  height: 12px;
  color: rgb(var(--primary-6));
}

.myswitch .arco-switch-text-holder {
  margin: 0 4px 0 22px;
}

.myswitch .arco-switch-checked .arco-switch-text-holder {
  margin: 0 22px 0 4px;
}

.myswitch .arco-switch-text {
  left: 22px;
}

.myswitch .arco-switch-checked .arco-switch-text {
  left: 6px;
}

.myswitchspan {
  padding-left: 8px;
  cursor: pointer;
  height: 20px;
  line-height: 20px;
  user-select: none;
}
</style>
