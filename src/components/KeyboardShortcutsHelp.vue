<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="shortcuts-overlay" @click.self="$emit('close')">
        <Transition name="scale">
          <div v-if="visible" class="shortcuts-panel">
            <div class="shortcuts-header">
              <h2>键盘快捷键</h2>
              <button class="close-btn" @click="$emit('close')" aria-label="关闭">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div class="shortcuts-content">
              <div v-for="(shortcuts, group) in shortcutGroups" :key="group" class="shortcut-group">
                <h3 class="group-title">{{ group }}</h3>
                <div class="shortcut-list">
                  <div v-for="shortcut in shortcuts" :key="shortcut.key" class="shortcut-item">
                    <span class="shortcut-description">{{ shortcut.description }}</span>
                    <kbd class="shortcut-key">{{ formatKey(shortcut.key) }}</kbd>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="shortcuts-footer">
              <p>按 <kbd>?</kbd> 或 <kbd>{{ isMac ? '⌘' : 'Ctrl' }}+/</kbd> 显示此帮助</p>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatShortcut } from '@/composables/useKeyboard'

interface Props {
  visible: boolean
}

defineProps<Props>()
defineEmits<{
  'close': []
}>()

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

// 预定义的快捷键分组
const shortcutGroups = computed(() => ({
  '通用': [
    { key: isMac ? 'cmd+n' : 'ctrl+n', description: '新建笔记' },
    { key: isMac ? 'cmd+s' : 'ctrl+s', description: '保存' },
    { key: isMac ? 'cmd+,' : 'ctrl+,', description: '打开设置' },
    { key: isMac ? 'cmd+k' : 'ctrl+k', description: '快速搜索' },
    { key: 'escape', description: '关闭弹窗/取消' },
  ],
  '编辑': [
    { key: isMac ? 'cmd+z' : 'ctrl+z', description: '撤销' },
    { key: isMac ? 'cmd+shift+z' : 'ctrl+y', description: '重做' },
    { key: isMac ? 'cmd+b' : 'ctrl+b', description: '粗体' },
    { key: isMac ? 'cmd+i' : 'ctrl+i', description: '斜体' },
    { key: isMac ? 'cmd+u' : 'ctrl+u', description: '下划线' },
    { key: '/', description: '插入块（在编辑器中）' },
  ],
  '导航': [
    { key: isMac ? 'cmd+\\' : 'ctrl+\\', description: '切换侧边栏' },
    { key: 'arrowup', description: '上一项' },
    { key: 'arrowdown', description: '下一项' },
    { key: 'enter', description: '打开/确认' },
  ],
}))

function formatKey(key: string): string {
  return formatShortcut(key)
}
</script>

<style lang="scss" scoped>
.shortcuts-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.shortcuts-panel {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 560px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.shortcuts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
  
  h2 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }
  
  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: transparent;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    
    &:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
  }
}

.shortcuts-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.shortcut-group {
  .group-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 12px;
  }
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.shortcut-description {
  font-size: 14px;
  color: var(--text-primary);
}

.shortcut-key {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--text-secondary);
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.shortcuts-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
  
  p {
    font-size: 13px;
    color: var(--text-tertiary);
    margin: 0;
    text-align: center;
    
    kbd {
      display: inline-flex;
      padding: 2px 6px;
      font-size: 11px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      margin: 0 2px;
    }
  }
}
</style>
