<script setup lang="ts">
import {} from 'vue'
import MySplit from '../layout/MySplit.vue'
import PanLeft from './PanLeft.vue'
import PanRight from './PanRight.vue'

defineProps({
  visible: {
    type: Boolean,
    required: false,
    default: true
  },
  selectedPan: {
    type: String,
    default: 'resource',
    required: false
  }
})
</script>

<template>
  <MySplit :visible="visible">
    <template #first><PanLeft :selectedPan='selectedPan' /></template>
    <template #second><PanRight /></template>
  </MySplit>
</template>

<style></style>
