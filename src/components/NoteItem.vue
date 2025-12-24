<template>
  <div 
    class="note-item" 
    :class="{ active }"
    @click="$emit('click')"
  >
    <div class="note-content">
      <h4 class="note-title">{{ note.title || '无标题' }}</h4>
      <p class="note-preview">{{ preview }}</p>
      <div class="note-meta">
        <span class="note-date">{{ formatDate(note.updated_at) }}</span>
        <div v-if="noteTags.length > 0" class="note-tags">
          <span v-for="tag in noteTags.slice(0, 2)" :key="tag" class="note-tag">
            {{ tag }}
          </span>
          <span v-if="noteTags.length > 2" class="note-tag-more">
            +{{ noteTags.length - 2 }}
          </span>
        </div>
      </div>
    </div>
    <div class="note-actions">
      <button 
        class="action-btn" 
        :class="{ active: note.is_pinned }"
        @click.stop="$emit('toggle-pin')"
        :title="note.is_pinned ? '取消置顶' : '置顶'"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      </button>
      <button 
        class="action-btn danger" 
        @click.stop="$emit('delete')"
        title="删除"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Note } from '@/stores/notes'

interface Props {
  note: Note
  active: boolean
}

const props = defineProps<Props>()

defineEmits<{
  'click': []
  'delete': []
  'toggle-pin': []
}>()

const preview = computed(() => {
  const content = props.note.content || ''
  // Remove markdown syntax for preview
  const cleaned = content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n/g, ' ')
    .trim()
  return cleaned.substring(0, 100) || '暂无内容'
})

const noteTags = computed(() => {
  if (!props.note.tags) return []
  return props.note.tags.split(',').filter(t => t.trim())
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric' 
  })
}
</script>

<style lang="scss" scoped>
.note-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-light);
  transition: background var(--transition-fast);
  
  &:hover {
    background: var(--bg-hover);
    
    .note-actions {
      opacity: 1;
    }
  }
  
  &.active {
    background: var(--bg-active);
    
    .note-title {
      color: var(--primary);
    }
  }
}

.note-content {
  flex: 1;
  min-width: 0;
}

.note-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-preview {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.note-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.note-date {
  color: var(--text-tertiary);
}

.note-tags {
  display: flex;
  gap: 4px;
}

.note-tag {
  padding: 1px 6px;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: var(--radius-sm);
  font-size: 10px;
}

.note-tag-more {
  color: var(--text-tertiary);
}

.note-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
  
  &.active {
    color: var(--warning);
  }
  
  &.danger:hover {
    background: rgba(239, 68, 68, 0.1);
    color: var(--error);
  }
}
</style>
