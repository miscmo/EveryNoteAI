<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-content">
      <div class="error-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h3 class="error-title">{{ title }}</h3>
      <p class="error-message">{{ message }}</p>
      <div class="error-actions">
        <button v-if="showRetry" class="btn btn-primary" @click="handleRetry">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          重试
        </button>
        <button v-if="showBack" class="btn btn-secondary" @click="handleBack">
          返回
        </button>
      </div>
      <details v-if="errorDetails" class="error-details">
        <summary>查看详情</summary>
        <pre>{{ errorDetails }}</pre>
      </details>
    </div>
  </div>
  <slot v-else></slot>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

interface Props {
  title?: string
  message?: string
  showRetry?: boolean
  showBack?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '出错了',
  message: '页面加载时发生错误，请稍后重试',
  showRetry: true,
  showBack: false
})

const emit = defineEmits<{
  'retry': []
  'back': []
  'error': [error: Error]
}>()

const hasError = ref(false)
const errorDetails = ref<string | null>(null)

onErrorCaptured((error: Error) => {
  hasError.value = true
  errorDetails.value = error.stack || error.message
  emit('error', error)
  console.error('ErrorBoundary caught:', error)
  return false // Prevent error from propagating
})

function handleRetry() {
  hasError.value = false
  errorDetails.value = null
  emit('retry')
}

function handleBack() {
  emit('back')
}

// Expose reset method
function reset() {
  hasError.value = false
  errorDetails.value = null
}

defineExpose({ reset, setError: (error: Error) => {
  hasError.value = true
  errorDetails.value = error.stack || error.message
}})
</script>

<style lang="scss" scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 40px;
}

.error-content {
  text-align: center;
  max-width: 400px;
}

.error-icon {
  color: var(--warning);
  margin-bottom: 16px;
}

.error-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.error-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 24px;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}

.error-details {
  margin-top: 24px;
  text-align: left;
  
  summary {
    font-size: 12px;
    color: var(--text-tertiary);
    cursor: pointer;
    
    &:hover {
      color: var(--text-secondary);
    }
  }
  
  pre {
    margin-top: 8px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    font-size: 11px;
    color: var(--text-secondary);
    overflow-x: auto;
    max-height: 200px;
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>
