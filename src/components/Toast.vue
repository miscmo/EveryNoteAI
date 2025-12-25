<template>
  <Teleport to="body">
    <TransitionGroup 
      name="toast" 
      tag="div" 
      class="toast-container"
      @before-leave="onBeforeLeave"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`, { 'toast-with-action': toast.action }]"
        :data-id="toast.id"
        role="alert"
        :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
      >
        <div class="toast-icon">
          <!-- Success -->
          <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <!-- Error -->
          <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <!-- Warning -->
          <svg v-else-if="toast.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <!-- Info -->
          <svg v-else-if="toast.type === 'info'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <!-- Loading -->
          <div v-else-if="toast.type === 'loading'" class="toast-spinner"></div>
        </div>
        
        <div class="toast-content">
          <div class="toast-message">{{ toast.message }}</div>
          <div v-if="toast.description" class="toast-description">{{ toast.description }}</div>
        </div>
        
        <div class="toast-actions">
          <button 
            v-if="toast.action" 
            class="toast-action-btn"
            @click="handleAction(toast)"
          >
            {{ toast.action.label }}
          </button>
          <button 
            v-if="toast.dismissible !== false && toast.type !== 'loading'"
            class="toast-close-btn"
            @click="dismiss(toast.id)"
            aria-label="关闭"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <!-- Progress bar for auto-dismiss -->
        <div 
          v-if="toast.duration && toast.type !== 'loading'" 
          class="toast-progress"
          :style="{ animationDuration: `${toast.duration}ms` }"
        ></div>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'loading'
  message: string
  description?: string
  duration?: number
  dismissible?: boolean
  action?: ToastAction
}

const toasts = ref<Toast[]>([])
const timers = new Map<string, number>()

function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function show(options: Omit<Toast, 'id'> | string): string {
  const toast: Toast = typeof options === 'string' 
    ? { id: generateId(), type: 'info', message: options, duration: 3000 }
    : { id: generateId(), duration: 3000, ...options }
  
  // Limit max toasts
  if (toasts.value.length >= 5) {
    const oldest = toasts.value[0]
    dismiss(oldest.id)
  }
  
  toasts.value.push(toast)
  
  // Auto dismiss
  if (toast.duration && toast.type !== 'loading') {
    const timer = window.setTimeout(() => {
      dismiss(toast.id)
    }, toast.duration)
    timers.set(toast.id, timer)
  }
  
  return toast.id
}

function dismiss(id: string) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

function dismissAll() {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
  toasts.value = []
}

function update(id: string, options: Partial<Omit<Toast, 'id'>>) {
  const toast = toasts.value.find(t => t.id === id)
  if (toast) {
    Object.assign(toast, options)
    
    // Reset timer if duration changed
    if (options.duration && options.type !== 'loading') {
      const oldTimer = timers.get(id)
      if (oldTimer) clearTimeout(oldTimer)
      
      const timer = window.setTimeout(() => {
        dismiss(id)
      }, options.duration)
      timers.set(id, timer)
    }
  }
}

function handleAction(toast: Toast) {
  toast.action?.onClick()
  dismiss(toast.id)
}

function onBeforeLeave(el: Element) {
  const htmlEl = el as HTMLElement
  const rect = htmlEl.getBoundingClientRect()
  htmlEl.style.width = `${rect.width}px`
  htmlEl.style.height = `${rect.height}px`
}

// Convenience methods
const success = (message: string, options?: Partial<Toast>) => 
  show({ type: 'success', message, ...options })

const error = (message: string, options?: Partial<Toast>) => 
  show({ type: 'error', message, duration: 5000, ...options })

const warning = (message: string, options?: Partial<Toast>) => 
  show({ type: 'warning', message, ...options })

const info = (message: string, options?: Partial<Toast>) => 
  show({ type: 'info', message, ...options })

const loading = (message: string, options?: Partial<Toast>) => 
  show({ type: 'loading', message, duration: 0, dismissible: false, ...options })

// Promise-based toast
const promise = async <T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((err: Error) => string)
  }
): Promise<T> => {
  const id = loading(messages.loading)
  
  try {
    const result = await promise
    update(id, {
      type: 'success',
      message: typeof messages.success === 'function' ? messages.success(result) : messages.success,
      duration: 3000,
      dismissible: true
    })
    return result
  } catch (err) {
    update(id, {
      type: 'error',
      message: typeof messages.error === 'function' ? messages.error(err as Error) : messages.error,
      duration: 5000,
      dismissible: true
    })
    throw err
  }
}

// Expose API
defineExpose({
  show,
  dismiss,
  dismissAll,
  update,
  success,
  error,
  warning,
  info,
  loading,
  promise
})

onUnmounted(() => {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
})
</script>

<style lang="scss">
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;
  max-width: 420px;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg), 0 0 0 1px rgba(0, 0, 0, 0.05);
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  
  &-success {
    border-color: var(--success);
    
    .toast-icon {
      color: var(--success);
    }
    
    .toast-progress {
      background: var(--success);
    }
  }
  
  &-error {
    border-color: var(--danger);
    
    .toast-icon {
      color: var(--danger);
    }
    
    .toast-progress {
      background: var(--danger);
    }
  }
  
  &-warning {
    border-color: var(--warning);
    
    .toast-icon {
      color: var(--warning);
    }
    
    .toast-progress {
      background: var(--warning);
    }
  }
  
  &-info {
    border-color: var(--primary);
    
    .toast-icon {
      color: var(--primary);
    }
    
    .toast-progress {
      background: var(--primary);
    }
  }
  
  &-loading {
    .toast-icon {
      color: var(--primary);
    }
  }
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
}

.toast-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: toast-spin 0.8s linear infinite;
}

@keyframes toast-spin {
  to {
    transform: rotate(360deg);
  }
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-message {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
}

.toast-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

.toast-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.toast-action-btn {
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary);
  background: transparent;
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--primary);
    color: white;
  }
}

.toast-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  transform-origin: left;
  animation: toast-progress linear forwards;
}

@keyframes toast-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

// Transition animations
.toast-enter-active {
  animation: toast-enter 0.3s cubic-bezier(0.21, 1.02, 0.73, 1);
}

.toast-leave-active {
  animation: toast-leave 0.2s cubic-bezier(0.06, 0.71, 0.55, 1) forwards;
}

.toast-move {
  transition: transform 0.3s cubic-bezier(0.21, 1.02, 0.73, 1);
}

@keyframes toast-enter {
  0% {
    opacity: 0;
    transform: translateX(100%);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toast-leave {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>
