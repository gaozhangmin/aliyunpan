<script setup lang="ts">
import MySplit from '../layout/MySplit.vue'
import ResPanLeft from './ResPanLeft.vue'
import ResPanRight from './ResPanRight.vue'

defineProps({
  visible: {
    type: Boolean,
    required: false,
    default: true
  },
})
</script>

<template>
  <MySplit :visible="visible">
    <template #first><ResPanLeft /></template>
    <template #second><ResPanRight /></template>
  </MySplit>
</template>

<style></style>
