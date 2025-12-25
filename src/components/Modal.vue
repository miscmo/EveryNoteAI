<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div 
        v-if="visible" 
        class="modal-overlay" 
        @click.self="handleOverlayClick"
        @keydown.esc="handleEscKey"
        tabindex="-1"
        ref="overlayRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'modal-title' : undefined"
      >
        <Transition name="modal-scale">
          <div v-if="visible" class="modal-container" :class="[type, size]">
            <div class="modal-header" v-if="title || showClose">
              <h3 v-if="title" id="modal-title">{{ title }}</h3>
              <button 
                v-if="showClose" 
                class="modal-close" 
                @click="handleClose"
                aria-label="关闭"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div class="modal-body">
              <div v-if="type !== 'default' && type !== 'prompt'" class="modal-icon" :class="type">
                <svg v-if="type === 'confirm' || type === 'warning'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <svg v-else-if="type === 'danger'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <svg v-else-if="type === 'success'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <svg v-else-if="type === 'info'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div class="modal-content">
                <slot>
                  <p v-if="message">{{ message }}</p>
                </slot>
                
                <!-- Input field for prompt type -->
                <div v-if="type === 'prompt'" class="modal-input-wrapper">
                  <label v-if="inputLabel" class="modal-input-label">{{ inputLabel }}</label>
                  <input
                    ref="inputRef"
                    v-model="inputValue"
                    :type="inputType"
                    :placeholder="inputPlaceholder"
                    class="modal-input"
                    @keydown.enter="handleInputEnter"
                  />
                  <p v-if="inputError" class="modal-input-error">{{ inputError }}</p>
                </div>
              </div>
            </div>
            
            <div class="modal-footer" v-if="showFooter">
              <button 
                v-if="showCancel" 
                class="btn btn-secondary" 
                @click="handleCancel"
              >
                {{ cancelText }}
              </button>
              <button 
                class="btn" 
                :class="confirmButtonClass" 
                :disabled="loading"
                @click="handleConfirm"
                ref="confirmBtnRef"
              >
                <span v-if="loading" class="btn-spinner"></span>
                {{ confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

interface Props {
  visible: boolean
  title?: string
  message?: string
  type?: 'default' | 'confirm' | 'warning' | 'danger' | 'success' | 'info' | 'prompt'
  size?: 'sm' | 'md' | 'lg'
  showClose?: boolean
  showCancel?: boolean
  showFooter?: boolean
  confirmText?: string
  cancelText?: string
  closeOnOverlay?: boolean
  closeOnEsc?: boolean
  loading?: boolean
  // Prompt specific props
  inputLabel?: string
  inputPlaceholder?: string
  inputType?: string
  inputDefaultValue?: string
  inputValidator?: (value: string) => string | null
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  size: 'sm',
  showClose: true,
  showCancel: true,
  showFooter: true,
  confirmText: '确定',
  cancelText: '取消',
  closeOnOverlay: true,
  closeOnEsc: true,
  loading: false,
  inputType: 'text',
  inputPlaceholder: ''
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'confirm': [value?: string]
  'cancel': []
  'close': []
}>()

const confirmBtnRef = ref<HTMLButtonElement | null>(null)
const overlayRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref('')
const inputError = ref('')

const confirmButtonClass = computed(() => {
  if (props.type === 'danger') return 'btn-danger'
  if (props.type === 'warning') return 'btn-warning'
  return 'btn-primary'
})

function handleClose() {
  if (props.loading) return
  emit('update:visible', false)
  emit('close')
}

function handleCancel() {
  if (props.loading) return
  emit('update:visible', false)
  emit('cancel')
}

function handleConfirm() {
  if (props.loading) return
  
  // Validate input for prompt type
  if (props.type === 'prompt') {
    if (props.inputValidator) {
      const error = props.inputValidator(inputValue.value)
      if (error) {
        inputError.value = error
        inputRef.value?.focus()
        return
      }
    }
    emit('update:visible', false)
    emit('confirm', inputValue.value)
  } else {
    emit('update:visible', false)
    emit('confirm')
  }
}

function handleOverlayClick() {
  if (props.closeOnOverlay && !props.loading) {
    handleClose()
  }
}

function handleEscKey(event: KeyboardEvent) {
  if (props.closeOnEsc && !props.loading && event.key === 'Escape') {
    event.preventDefault()
    handleClose()
  }
}

function handleInputEnter() {
  handleConfirm()
}

// Auto focus and keyboard trap
watch(() => props.visible, (val) => {
  if (val) {
    // Reset input state
    inputValue.value = props.inputDefaultValue || ''
    inputError.value = ''
    
    nextTick(() => {
      // Focus overlay for ESC key handling
      overlayRef.value?.focus()
      
      // Focus input for prompt type, otherwise focus confirm button
      if (props.type === 'prompt') {
        inputRef.value?.focus()
        inputRef.value?.select()
      } else {
        confirmBtnRef.value?.focus()
      }
    })
  }
})

// Clear input error when typing
watch(inputValue, () => {
  if (inputError.value) {
    inputError.value = ''
  }
})
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.modal-container {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  &.sm {
    width: 380px;
    max-width: 90vw;
  }
  
  &.md {
    width: 500px;
    max-width: 90vw;
  }
  
  &.lg {
    width: 700px;
    max-width: 90vw;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  
  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  }
  
  .modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--text-secondary);
    transition: all var(--transition-fast);
    
    &:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
  }
}

.modal-body {
  padding: 24px 20px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.modal-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.confirm, &.warning {
    background: rgba(234, 179, 8, 0.1);
    color: var(--warning);
  }
  
  &.danger {
    background: rgba(239, 68, 68, 0.1);
    color: var(--error);
  }
  
  &.success {
    background: rgba(34, 197, 94, 0.1);
    color: var(--success);
  }
  
  &.info {
    background: rgba(59, 130, 246, 0.1);
    color: var(--primary);
  }
}

.modal-content {
  flex: 1;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  
  p {
    margin: 0;
  }
}

// Input styles for prompt type
.modal-input-wrapper {
  margin-top: 16px;
}

.modal-input-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: var(--text-tertiary);
  }
}

.modal-input-error {
  font-size: 12px;
  color: var(--error);
  margin-top: 6px;
  margin-bottom: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

// Button spinner
.btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: btn-spin 0.6s linear infinite;
  margin-right: 6px;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

// Button styles for modal
.btn-danger {
  background: var(--error);
  color: white;
  
  &:hover {
    background: #dc2626;
  }
}

.btn-warning {
  background: var(--warning);
  color: white;
  
  &:hover {
    background: #d97706;
  }
}

// Transitions
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all 0.2s ease;
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
