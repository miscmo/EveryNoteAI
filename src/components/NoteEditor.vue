<template>
  <div class="note-editor">
    <!-- Editor Header -->
    <header class="editor-header">
      <input 
        v-model="title"
        type="text"
        class="title-input"
        placeholder="笔记标题"
        @input="handleTitleChange"
      >
      <div class="header-actions">
        <span v-if="saving" class="save-status">
          <div class="spinner spinner-sm"></div>
          保存中...
        </span>
        <span v-else class="save-status saved">已保存</span>
        
        <!-- AI Actions Dropdown -->
        <div class="dropdown" ref="aiDropdownRef">
          <button class="btn btn-secondary btn-sm" @click="toggleAIDropdown">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              <circle cx="7.5" cy="14.5" r="1.5"/>
              <circle cx="16.5" cy="14.5" r="1.5"/>
            </svg>
            AI 助手
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div v-if="showAIDropdown" class="dropdown-menu">
            <div class="dropdown-item" @click="handleAIAction('summarize')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="21" y1="10" x2="3" y2="10"/>
                <line x1="21" y1="6" x2="3" y2="6"/>
                <line x1="21" y1="14" x2="3" y2="14"/>
                <line x1="21" y1="18" x2="3" y2="18"/>
              </svg>
              生成摘要
            </div>
            <div class="dropdown-item" @click="handleAIAction('tags')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              自动标签
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" @click="handleAIAction('polish')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              润色文本
            </div>
            <div class="dropdown-item" @click="handleAIAction('expand')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
              扩展内容
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" @click="handleAIAction('translate-en')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              翻译为英文
            </div>
            <div class="dropdown-item" @click="handleAIAction('translate-zh')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              翻译为中文
            </div>
          </div>
        </div>
        
        <!-- View Mode Toggle -->
        <div class="view-toggle">
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'edit' }"
            @click="viewMode = 'edit'"
            title="编辑模式"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'split' }"
            @click="viewMode = 'split'"
            title="分屏模式"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="12" y1="3" x2="12" y2="21"/>
            </svg>
          </button>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'preview' }"
            @click="viewMode = 'preview'"
            title="预览模式"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
    
    <!-- Tags Bar -->
    <div class="tags-bar" v-if="noteTags.length > 0">
      <span 
        v-for="tag in noteTags" 
        :key="tag" 
        class="tag tag-removable"
      >
        {{ tag }}
        <button class="tag-remove-btn" @click="handleRemoveTag(tag)" title="移除标签">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </span>
    </div>
    
    <!-- Editor Body -->
    <div class="editor-body" :class="viewMode">
      <!-- Edit Panel -->
      <div v-if="viewMode !== 'preview'" class="edit-panel">
        <textarea
          ref="textareaRef"
          v-model="content"
          class="editor-textarea"
          placeholder="开始写作..."
          @input="handleContentChange"
          @keydown.tab.prevent="handleTab"
        ></textarea>
      </div>
      
      <!-- Preview Panel -->
      <div v-if="viewMode !== 'edit'" class="preview-panel">
        <div class="markdown-body" v-html="renderedContent"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDebounceFn, onClickOutside } from '@vueuse/core'
import { marked } from 'marked'
import hljs from 'highlight.js'
import type { Note } from '@/stores/notes'
import { useSettingsStore } from '@/stores/settings'

interface Props {
  note: Note
  saving: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update': [data: { title?: string; content?: string }]
  'ai-action': [action: string, content: string]
  'remove-tag': [tag: string]
}>()

const settingsStore = useSettingsStore()

const title = ref(props.note.title)
const content = ref(props.note.content)
const viewMode = computed({
  get: () => settingsStore.editorMode,
  set: (value: 'edit' | 'split' | 'preview') => settingsStore.setEditorMode(value)
})
const showAIDropdown = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const aiDropdownRef = ref<HTMLElement | null>(null)

// Configure marked
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch {
        // ignore
      }
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
})

const renderedContent = computed(() => {
  try {
    return marked(content.value || '')
  } catch {
    return content.value
  }
})

const noteTags = computed(() => {
  if (!props.note.tags) return []
  return props.note.tags.split(',').filter(t => t.trim())
})

// Watch for note changes
watch(() => props.note.id, () => {
  title.value = props.note.title
  content.value = props.note.content
})

// Debounced update
const debouncedUpdate = useDebounceFn((data: { title?: string; content?: string }) => {
  emit('update', data)
}, 1000)

function handleTitleChange() {
  debouncedUpdate({ title: title.value })
}

function handleContentChange() {
  debouncedUpdate({ content: content.value })
}

function handleTab(e: KeyboardEvent) {
  const textarea = textareaRef.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  content.value = content.value.substring(0, start) + '  ' + content.value.substring(end)
  
  // Move cursor
  setTimeout(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 2
  }, 0)
}

function toggleAIDropdown() {
  showAIDropdown.value = !showAIDropdown.value
}

function handleAIAction(action: string) {
  showAIDropdown.value = false
  emit('ai-action', action, content.value)
}

function handleRemoveTag(tag: string) {
  emit('remove-tag', tag)
}

// Close dropdown on click outside
onClickOutside(aiDropdownRef, () => {
  showAIDropdown.value = false
})
</script>

<style lang="scss" scoped>
.note-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  overflow: hidden;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  // macOS 窗口控制按钮区域预留空间
  padding-top: calc(var(--titlebar-area-height) + 12px);
  border-bottom: 1px solid var(--border-light);
  -webkit-app-region: drag;
  
  * {
    -webkit-app-region: no-drag;
  }
}

.title-input {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  border: none;
  background: transparent;
  outline: none;
  color: var(--text-primary);
  
  &::placeholder {
    color: var(--text-tertiary);
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
  
  &.saved {
    color: var(--success);
  }
  
  .spinner-sm {
    width: 12px;
    height: 12px;
    border-width: 1.5px;
  }
}

// Dropdown
.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 180px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background var(--transition-fast);
  
  &:hover {
    background: var(--bg-hover);
  }
  
  svg {
    color: var(--text-secondary);
  }
}

.dropdown-divider {
  height: 1px;
  background: var(--border-light);
  margin: 4px 0;
}

// View Toggle
.view-toggle {
  display: flex;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 2px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  
  &:hover {
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--bg-primary);
    color: var(--primary);
    box-shadow: var(--shadow-sm);
  }
}

// Tags Bar
.tags-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--border-light);
  
  .tag-removable {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--text-secondary);
    
    .tag-remove-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      padding: 0;
      border: none;
      background: transparent;
      border-radius: 50%;
      cursor: pointer;
      color: var(--text-tertiary);
      transition: all var(--transition-fast);
      
      &:hover {
        background: var(--bg-hover);
        color: var(--error);
      }
    }
  }
}

// Editor Body
.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  
  &.edit {
    .edit-panel {
      flex: 1;
    }
  }
  
  &.split {
    .edit-panel,
    .preview-panel {
      flex: 1;
    }
    
    .preview-panel {
      border-left: 1px solid var(--border-light);
    }
  }
  
  &.preview {
    .preview-panel {
      flex: 1;
    }
  }
}

.edit-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  padding: 20px;
  font-family: 'SF Mono', 'Fira Code', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  
  &::placeholder {
    color: var(--text-tertiary);
  }
}

.preview-panel {
  overflow-y: auto;
}

.markdown-body {
  padding: 20px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
  
  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
    color: var(--text-primary);
  }
  
  :deep(h1) { font-size: 2em; border-bottom: 1px solid var(--border-light); padding-bottom: 0.3em; }
  :deep(h2) { font-size: 1.5em; border-bottom: 1px solid var(--border-light); padding-bottom: 0.3em; }
  :deep(h3) { font-size: 1.25em; }
  :deep(h4) { font-size: 1em; }
  
  :deep(p) {
    margin-bottom: 16px;
  }
  
  :deep(a) {
    color: var(--primary);
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  :deep(code) {
    padding: 2px 6px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.9em;
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
  }
  
  :deep(pre) {
    padding: 16px;
    overflow-x: auto;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    
    code {
      padding: 0;
      background: transparent;
    }
  }
  
  :deep(blockquote) {
    padding: 0 16px;
    color: var(--text-secondary);
    border-left: 4px solid var(--border-medium);
    margin: 0 0 16px;
  }
  
  :deep(ul), :deep(ol) {
    padding-left: 24px;
    margin-bottom: 16px;
  }
  
  :deep(li) {
    margin-bottom: 4px;
  }
  
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    
    th, td {
      padding: 8px 12px;
      border: 1px solid var(--border-light);
    }
    
    th {
      background: var(--bg-secondary);
      font-weight: 600;
    }
  }
  
  :deep(img) {
    max-width: 100%;
    border-radius: var(--radius-md);
  }
  
  :deep(hr) {
    border: none;
    border-top: 1px solid var(--border-light);
    margin: 24px 0;
  }
}
</style>
