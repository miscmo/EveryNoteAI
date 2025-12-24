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
      @confirm="handleModalConfirm"
      @cancel="handleModalCancel"
      @close="handleModalClose"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import Modal from '@/components/Modal.vue'
import { globalModal } from '@/composables/useModal'

const settingsStore = useSettingsStore()
const isDarkMode = computed(() => settingsStore.darkMode)

const modalState = globalModal.state
const handleModalConfirm = globalModal.handleConfirm
const handleModalCancel = globalModal.handleCancel
const handleModalClose = globalModal.handleClose

onMounted(async () => {
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
