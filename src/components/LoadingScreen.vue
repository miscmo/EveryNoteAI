<template>
  <Transition name="loading-fade">
    <div v-if="visible" class="loading-screen">
      <div class="loading-content">
        <div class="loading-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
        </div>
        <p class="loading-text">{{ message }}</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean
  message?: string
}

withDefaults(defineProps<Props>(), {
  message: '加载中...'
})
</script>

<style lang="scss" scoped>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.loading-logo {
  color: var(--primary);
  animation: logo-pulse 2s ease-in-out infinite;
}

@keyframes logo-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(0.95);
  }
}

.loading-spinner {
  position: relative;
  width: 40px;
  height: 40px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid var(--border-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.3s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
