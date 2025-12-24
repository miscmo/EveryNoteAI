<template>
  <div class="tree-node">
    <!-- Drop indicator before -->
    <div 
      v-if="dropPosition === 'before'" 
      class="drop-indicator"
    />
    
    <!-- Folder Item -->
    <div 
      v-if="item.type === 'folder'"
      class="tree-item folder-item"
      :class="{ 
        expanded: expandedFolders.has(item.id),
        'drag-over': dropPosition === 'inside',
        'dragging': draggingItem?.id === item.id
      }"
      draggable="true"
      @click="$emit('toggle-folder', item.id)"
      @contextmenu.prevent="$emit('context-menu', $event, 'folder', item, notebookId)"
      @dragstart="handleDragStart($event, 'folder', item.id)"
      @dragover="handleDragOver($event)"
      @dragleave="handleDragLeave"
      @drop="handleDrop($event)"
      @dragend="handleDragEnd"
    >
      <span class="tree-toggle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="expandedFolders.has(item.id) ? '6 9 12 15 18 9' : '9 18 15 12 9 6'"/>
        </svg>
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <span v-if="editingItemId !== item.id" class="tree-label">{{ item.name }}</span>
      <input 
        v-else
        ref="editInputRef"
        :value="editItemName"
        type="text"
        class="input input-sm tree-edit-input"
        @input="$emit('update-edit-name', ($event.target as HTMLInputElement).value)"
        @keyup.enter="$emit('save-edit', 'folder', item.id)"
        @keyup.escape="$emit('cancel-edit')"
        @blur="$emit('save-edit', 'folder', item.id)"
        @click.stop
      >
    </div>
    
    <!-- Note Item -->
    <div 
      v-else
      class="tree-item note-item"
      :class="{ 
        active: currentNoteId === item.id,
        'drag-over': dropPosition === 'inside',
        'dragging': draggingItem?.id === item.id
      }"
      draggable="true"
      @click.stop="$emit('select-note', item.id)"
      @contextmenu.prevent="$emit('context-menu', $event, 'note', item, notebookId)"
      @dragstart="handleDragStart($event, 'note', item.id)"
      @dragover="handleDragOver($event)"
      @dragleave="handleDragLeave"
      @drop="handleDrop($event)"
      @dragend="handleDragEnd"
    >
      <svg v-if="item.is_pinned" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" class="pin-icon">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      </svg>
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <span class="tree-label">{{ item.name }}</span>
    </div>
    
    <!-- Drop indicator after (only for notes or collapsed folders) -->
    <div 
      v-if="dropPosition === 'after' && (item.type === 'note' || !expandedFolders.has(item.id))" 
      class="drop-indicator"
    />
    
    <!-- Children -->
    <div v-if="item.type === 'folder' && expandedFolders.has(item.id) && item.children" class="tree-children">
      <!-- New item input inside folder -->
      <div 
        v-if="newItemInput?.visible && newItemInput?.parentId === item.id" 
        class="new-item-input tree-new-item"
      >
        <svg v-if="newItemInput.type === 'note'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <input 
          :value="newItemInput.name"
          type="text"
          class="input input-sm"
          :placeholder="newItemInput.type === 'note' ? '笔记名称' : '目录名称'"
          @input="$emit('update-new-item-name', ($event.target as HTMLInputElement).value)"
          @keyup.enter="$emit('confirm-new-item')"
          @keyup.escape="$emit('cancel-new-item')"
          @blur="$emit('confirm-new-item')"
          @click.stop
          ref="newItemInputInFolderRef"
        >
      </div>
      
      <TreeNode
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :notebook-id="notebookId"
        :current-note-id="currentNoteId"
        :expanded-folders="expandedFolders"
        :editing-item-id="editingItemId"
        :edit-item-name="editItemName"
        :dragging-item="draggingItem"
        :new-item-input="newItemInput"
        @select-note="$emit('select-note', $event)"
        @toggle-folder="$emit('toggle-folder', $event)"
        @context-menu="(e, t, i, n) => $emit('context-menu', e, t, i, n)"
        @start-drag="(e, t, i, n) => $emit('start-drag', e, t, i, n)"
        @drag-over="(e, t, i, p) => $emit('drag-over', e, t, i, p)"
        @drop="(e, t, i, p) => $emit('drop', e, t, i, p)"
        @drag-end="$emit('drag-end')"
        @update-edit-name="$emit('update-edit-name', $event)"
        @save-edit="(t, i) => $emit('save-edit', t, i)"
        @cancel-edit="$emit('cancel-edit')"
        @update-new-item-name="$emit('update-new-item-name', $event)"
        @confirm-new-item="$emit('confirm-new-item')"
        @cancel-new-item="$emit('cancel-new-item')"
      />
      <div v-if="item.children.length === 0 && !(newItemInput?.visible && newItemInput?.parentId === item.id)" class="tree-empty">
        空目录
      </div>
      
      <!-- Drop indicator at end of folder children -->
      <div 
        v-if="dropPosition === 'after' && item.type === 'folder' && expandedFolders.has(item.id)" 
        class="drop-indicator"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { TreeItem } from './Sidebar.vue'

interface NewItemInput {
  visible: boolean
  type: 'note' | 'folder'
  notebookId: string
  parentId?: string
  name: string
}

interface Props {
  item: TreeItem
  notebookId: string
  currentNoteId: string | null
  expandedFolders: Set<string>
  editingItemId: string | null
  editItemName: string
  draggingItem: { type: 'note' | 'folder'; id: string; notebookId: string } | null
  newItemInput?: NewItemInput
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select-note': [id: string]
  'toggle-folder': [id: string]
  'context-menu': [event: MouseEvent, type: 'folder' | 'note', item: TreeItem, notebookId: string]
  'start-drag': [event: DragEvent, type: 'note' | 'folder', id: string, notebookId: string]
  'drag-over': [event: DragEvent, type: 'folder' | 'note', id: string, position: 'before' | 'after' | 'inside']
  'drop': [event: DragEvent, type: 'folder' | 'note', id: string, position: 'before' | 'after' | 'inside']
  'drag-end': []
  'update-edit-name': [name: string]
  'save-edit': [type: string, id: string]
  'cancel-edit': []
  'update-new-item-name': [name: string]
  'confirm-new-item': []
  'cancel-new-item': []
}>()

const editInputRef = ref<HTMLInputElement | null>(null)
const newItemInputInFolderRef = ref<HTMLInputElement | null>(null)
const dropPosition = ref<'before' | 'after' | 'inside' | null>(null)

function handleDragStart(event: DragEvent, type: 'note' | 'folder', id: string) {
  emit('start-drag', event, type, id, props.notebookId)
}

function handleDragOver(event: DragEvent) {
  if (!props.draggingItem) return
  if (props.draggingItem.id === props.item.id) return
  
  // Folders can't be dropped on notes (inside)
  const canDropInside = props.item.type === 'folder' && 
    !(props.draggingItem.type === 'folder' && isDescendant(props.draggingItem.id, props.item.id))
  
  event.preventDefault()
  
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const y = event.clientY - rect.top
  const height = rect.height
  
  // Determine drop position based on mouse position
  if (canDropInside) {
    // For folders: top 25% = before, middle 50% = inside, bottom 25% = after
    if (y < height * 0.25) {
      dropPosition.value = 'before'
    } else if (y > height * 0.75) {
      dropPosition.value = 'after'
    } else {
      dropPosition.value = 'inside'
    }
  } else {
    // For notes or when can't drop inside: top 50% = before, bottom 50% = after
    dropPosition.value = y < height * 0.5 ? 'before' : 'after'
  }
  
  emit('drag-over', event, props.item.type, props.item.id, dropPosition.value)
}

function handleDragLeave(event: DragEvent) {
  // Only clear if we're actually leaving the element (not entering a child)
  const relatedTarget = event.relatedTarget as HTMLElement
  const currentTarget = event.currentTarget as HTMLElement
  if (!currentTarget.contains(relatedTarget)) {
    dropPosition.value = null
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  
  if (!props.draggingItem || !dropPosition.value) return
  if (props.draggingItem.id === props.item.id) return
  
  emit('drop', event, props.item.type, props.item.id, dropPosition.value)
  dropPosition.value = null
}

function handleDragEnd() {
  dropPosition.value = null
  emit('drag-end')
}

// Check if draggedId is a descendant of targetId (to prevent dropping folder into its own child)
function isDescendant(draggedId: string, targetId: string): boolean {
  if (props.item.type !== 'folder' || !props.item.children) return false
  
  function checkChildren(children: TreeItem[]): boolean {
    for (const child of children) {
      if (child.id === draggedId) return true
      if (child.type === 'folder' && child.children && checkChildren(child.children)) return true
    }
    return false
  }
  
  return checkChildren(props.item.children)
}

watch(() => props.editingItemId, (newId) => {
  if (newId === props.item.id) {
    nextTick(() => {
      editInputRef.value?.focus()
      editInputRef.value?.select()
    })
  }
})

// Auto focus new item input when it appears in this folder
watch(() => props.newItemInput?.parentId, (parentId) => {
  if (parentId === props.item.id && props.newItemInput?.visible) {
    nextTick(() => {
      newItemInputInFolderRef.value?.focus()
    })
  }
})

// Clear drop position when dragging item changes
watch(() => props.draggingItem, (newVal) => {
  if (!newVal) {
    dropPosition.value = null
  }
})
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.tree-node {
  margin-bottom: 1px;
  position: relative;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  font-size: 13px;
  border: 1px solid transparent;
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--bg-active);
    color: var(--primary);
    
    svg {
      color: var(--primary);
    }
  }
  
  &.drag-over {
    background: var(--primary-light);
    border-color: var(--primary);
  }
  
  &.dragging {
    opacity: 0.5;
  }
  
  .tree-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
  
  .tree-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .tree-edit-input {
    flex: 1;
    padding: 2px 6px;
    font-size: 13px;
  }
  
  .pin-icon {
    color: var(--warning);
  }
}

.folder-item {
  font-weight: 500;
}

.note-item {
  padding-left: 24px;
}

.tree-children {
  margin-left: 10px;
  padding-left: 8px;
  border-left: 1px solid var(--border-light);
}

.tree-empty {
  padding: 6px 24px;
  font-size: 12px;
  color: var(--text-tertiary);
  font-style: italic;
}

.drop-indicator {
  height: 2px;
  background: var(--primary);
  border-radius: 1px;
  margin: 2px 8px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: -4px;
    top: -3px;
    width: 8px;
    height: 8px;
    background: var(--primary);
    border-radius: 50%;
  }
}

.new-item-input.tree-new-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin-bottom: 2px;
  
  svg {
    flex-shrink: 0;
    color: var(--text-tertiary);
  }
  
  .input {
    flex: 1;
    min-width: 0;
    padding: 4px 8px;
    font-size: 13px;
  }
}
</style>
