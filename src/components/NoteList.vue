<template>
  <div class="note-list">
    <div class="note-list-header">
      <div class="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input 
          type="text" 
          v-model="searchText"
          placeholder="搜索笔记..."
          @input="handleSearch"
        >
        <button v-if="searchText" class="clear-btn" @click="clearSearch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <button class="btn btn-primary btn-sm" @click="$emit('create-note')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        新建
      </button>
    </div>
    
    <div class="note-list-content">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>加载中...</span>
      </div>
      
      <div v-else-if="notes.length === 0" class="empty-state">
        <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        <p class="empty-title">暂无笔记</p>
        <p class="empty-description">点击"新建"按钮创建你的第一篇笔记</p>
      </div>
      
      <template v-else>
        <!-- Pinned Notes -->
        <div v-if="pinnedNotes.length > 0" class="note-group">
          <div class="group-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            <span>置顶</span>
          </div>
          <NoteItem
            v-for="note in pinnedNotes"
            :key="note.id"
            :note="note"
            :active="currentNoteId === note.id"
            @click="$emit('select-note', note.id)"
            @delete="$emit('delete-note', note.id)"
            @toggle-pin="$emit('toggle-pin', note.id)"
          />
        </div>
        
        <!-- Other Notes -->
        <div class="note-group">
          <div v-if="pinnedNotes.length > 0" class="group-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>
            <span>笔记</span>
          </div>
          <NoteItem
            v-for="note in unpinnedNotes"
            :key="note.id"
            :note="note"
            :active="currentNoteId === note.id"
            @click="$emit('select-note', note.id)"
            @delete="$emit('delete-note', note.id)"
            @toggle-pin="$emit('toggle-pin', note.id)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import NoteItem from './NoteItem.vue'
import type { Note } from '@/stores/notes'

interface Props {
  notes: Note[]
  currentNoteId: string | null
  loading: boolean
  searchQuery: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select-note': [id: string]
  'create-note': []
  'delete-note': [id: string]
  'toggle-pin': [id: string]
  'search': [query: string]
}>()

const searchText = ref(props.searchQuery)

const pinnedNotes = computed(() => props.notes.filter(n => n.is_pinned))
const unpinnedNotes = computed(() => props.notes.filter(n => !n.is_pinned))

const debouncedSearch = useDebounceFn((query: string) => {
  emit('search', query)
}, 300)

function handleSearch() {
  debouncedSearch(searchText.value)
}

function clearSearch() {
  searchText.value = ''
  emit('search', '')
}
</script>

<style lang="scss" scoped>
.note-list {
  width: var(--note-list-width);
  height: 100%;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.note-list-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  
  svg {
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
  
  input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 13px;
    color: var(--text-primary);
    
    &::placeholder {
      color: var(--text-tertiary);
    }
  }
  
  .clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-tertiary);
    border-radius: var(--radius-sm);
    
    &:hover {
      background: var(--bg-hover);
      color: var(--text-secondary);
    }
  }
}

.note-list-content {
  flex: 1;
  overflow-y: auto;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.note-group {
  .group-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    
    svg {
      opacity: 0.7;
    }
  }
}
</style>
