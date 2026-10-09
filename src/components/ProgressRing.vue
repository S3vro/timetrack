<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ value: number; max: number; size?: number }>()
const size = computed(() => props.size ?? 168)
const stroke = 14
const r = computed(() => (size.value - stroke) / 2)
const c = computed(() => 2 * Math.PI * r.value)
const frac = computed(() => (props.max > 0 ? Math.min(props.value / props.max, 1) : props.value > 0 ? 1 : 0))
const over = computed(() => props.max > 0 && props.value > props.max)
</script>

<template>
  <div class="relative" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :width="size" :height="size" class="-rotate-90">
      <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" :stroke-width="stroke" class="stroke-black/[0.06] dark:stroke-white/10" />
      <circle
        :cx="size / 2" :cy="size / 2" :r="r" fill="none" :stroke-width="stroke" stroke-linecap="round"
        :stroke-dasharray="c" :stroke-dashoffset="c * (1 - frac)"
        :class="over ? 'stroke-ios-green' : 'stroke-accent'"
        style="transition: stroke-dashoffset 0.6s ease"
      />
    </svg>
    <div class="absolute inset-0 grid place-items-center text-center"><div><slot /></div></div>
  </div>
</template>
