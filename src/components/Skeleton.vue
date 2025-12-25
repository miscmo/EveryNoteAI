<template>
  <div class="skeleton" :class="[variant, { animated }]" :style="customStyle">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  animated: true
})

const customStyle = computed(() => {
  const style: Record<string, string> = {}
  
  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  
  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }
  
  return style
})
</script>

<style lang="scss" scoped>
.skeleton {
  background: var(--bg-tertiary);
  
  &.animated {
    background: linear-gradient(
      90deg,
      var(--bg-tertiary) 25%,
      var(--bg-hover) 50%,
      var(--bg-tertiary) 75%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
  }
  
  &.text {
    height: 1em;
    border-radius: var(--radius-sm);
    width: 100%;
  }
  
  &.circular {
    border-radius: 50%;
  }
  
  &.rectangular {
    border-radius: 0;
  }
  
  &.rounded {
    border-radius: var(--radius-md);
  }
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
