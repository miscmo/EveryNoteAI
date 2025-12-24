<template>
  <div class="empty-editor">
    <!-- Draggable titlebar area for macOS -->
    <div class="titlebar-drag-area"></div>
    <div class="empty-content">
      <svg class="empty-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
      <h2>选择或创建笔记</h2>
      <p>从左侧列表选择一个笔记开始编辑，或创建一个新笔记</p>
      <button class="btn btn-primary" @click="$emit('create-note')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        新建笔记
      </button>
      <div class="shortcuts">
        <div class="shortcut-item">
          <kbd>⌘</kbd> + <kbd>N</kbd>
          <span>新建笔记</span>
        </div>
        <div class="shortcut-item">
          <kbd>⌘</kbd> + <kbd>F</kbd>
          <span>搜索笔记</span>
        </div>
        <div class="shortcut-item">
          <kbd>⌘</kbd> + <kbd>S</kbd>
          <span>保存笔记</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'create-note': []
}>()
</script>

<style lang="scss" scoped>
.empty-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  position: relative;
}

.titlebar-drag-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: calc(var(--titlebar-area-height) + 12px);
  -webkit-app-region: drag;
}

.empty-content {
  text-align: center;
  max-width: 400px;
  padding: 40px;
}

.empty-icon {
  color: var(--text-tertiary);
  opacity: 0.5;
  margin-bottom: 24px;
}

h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

p {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
}

.shortcuts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  
  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    font-family: inherit;
    font-size: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-sm);
    box-shadow: 0 1px 0 var(--border-light);
  }
  
  span {
    margin-left: 8px;
  }
}
</style>
