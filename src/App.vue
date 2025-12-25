<template>
  <div class="app-container" :class="{ 'dark-mode': isDarkMode }">
    <router-view />
    
    <!-- Global Modal -->
    <Modal
      v-model:visible="modalState.visible"
      :title="modalState.title"
      :message="modalState.message"
      :type="modalState.type"
      :confirm-text="modalState.confirmText"
      :cancel-text="modalState.cancelText"
      :show-cancel="modalState.showCancel"
      :input-label="modalState.inputLabel"
      :input-placeholder="modalState.inputPlaceholder"
      :input-type="modalState.inputType"
      :input-default-value="modalState.inputDefaultValue"
      :input-validator="modalState.inputValidator"
      @confirm="handleModalConfirm"
      @cancel="handleModalCancel"
      @close="handleModalClose"
    />
    
    <!-- Global Toast -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import Modal from '@/components/Modal.vue'
import Toast from '@/components/Toast.vue'
import { globalModal } from '@/composables/useModal'
import { setToastInstance } from '@/composables/useToast'

const settingsStore = useSettingsStore()
const isDarkMode = computed(() => settingsStore.darkMode)

const modalState = globalModal.state
const handleModalConfirm = globalModal.handleConfirm
const handleModalCancel = globalModal.handleCancel
const handleModalClose = globalModal.handleClose

// Toast instance
const toastRef = ref<InstanceType<typeof Toast> | null>(null)

onMounted(async () => {
  // Initialize toast instance
  setToastInstance(toastRef.value)
  
  await settingsStore.loadSettings()
})
</script>

<style lang="scss">
.app-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}
</style>
