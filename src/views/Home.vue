<template>
  <div class="home-layout">
    <!-- Sidebar with Tree -->
    <Sidebar 
      :notebooks="notebooksStore.notebooks"
      :folders="foldersStore.folders"
      :current-notebook-id="notebooksStore.currentNotebookId"
      :current-note-id="notesStore.currentNoteId"
      :notes="notesStore.notes"
      :tags="tagsStore.tags"
      :style="{ width: sidebarWidth + 'px' }"
      @select-notebook="handleSelectNotebook"
      @select-note="handleSelectNote"
      @create-notebook="handleCreateNotebook"
      @create-note="handleCreateNote"
      @create-folder="handleCreateFolder"
      @rename-notebook="handleRenameNotebook"
      @rename-folder="handleRenameFolder"
      @rename-note="handleRenameNote"
      @delete-notebook="handleDeleteNotebook"
      @delete-folder="handleDeleteFolder"
      @delete-note="handleDeleteNote"
      @toggle-pin="handleTogglePin"
      @move-note="handleMoveNote"
      @move-folder="handleMoveFolder"
      @select-tag="handleSelectTag"
      @create-tag="handleCreateTag"
      @rename-tag="handleRenameTag"
      @delete-tag="handleDeleteTag"
      @search="handleSearch"
      @open-settings="router.push('/settings')"
      @copy-note="handleCopyNote"
      @move-note-to="handleMoveNoteTo"
    />
    
    <!-- Resizer -->
    <div 
      class="resizer"
      :class="{ 'resizing': isResizing }"
      @mousedown="startResize"
    />
    
    <!-- Editor -->
    <div class="editor-container">
      <NoteEditor
        v-if="notesStore.currentNote"
        :note="notesStore.currentNote"
        :saving="notesStore.saving"
        @update="handleUpdateNote"
        @ai-action="handleAIAction"
        @remove-tag="handleRemoveTag"
      />
      <EmptyEditor v-else @create-note="handleCreateNoteFromEmpty" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotebooksStore } from '@/stores/notebooks'
import { useFoldersStore } from '@/stores/folders'
import { useNotesStore } from '@/stores/notes'
import { useTagsStore } from '@/stores/tags'
import { useSettingsStore } from '@/stores/settings'
import { globalModal } from '@/composables/useModal'
import Sidebar from '@/components/Sidebar.vue'
import NoteEditor from '@/components/NoteEditor.vue'
import EmptyEditor from '@/components/EmptyEditor.vue'

const router = useRouter()
const notebooksStore = useNotebooksStore()
const foldersStore = useFoldersStore()
const notesStore = useNotesStore()
const tagsStore = useTagsStore()
const settingsStore = useSettingsStore()

// Resizable sidebar
const MIN_WIDTH = 200
const MAX_WIDTH = 500
const DEFAULT_WIDTH = 280
const sidebarWidth = ref(DEFAULT_WIDTH)
const isResizing = ref(false)

function startResize(e: MouseEvent) {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(e: MouseEvent) {
  if (!isResizing.value) return
  const newWidth = e.clientX
  if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
    sidebarWidth.value = newWidth
  }
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  // Save sidebar width to settings
  window.electronAPI?.settings.set('app.sidebarWidth', sidebarWidth.value)
}

onMounted(async () => {
  await settingsStore.loadSettings()
  // Load saved sidebar width
  const savedWidth = await window.electronAPI?.settings.get('app.sidebarWidth')
  if (savedWidth && savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH) {
    sidebarWidth.value = savedWidth
  }
  await notebooksStore.fetchNotebooks()
  await foldersStore.fetchFolders()
  await tagsStore.fetchTags()
  await notesStore.fetchNotes()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})

function handleSelectNotebook(id: string) {
  notebooksStore.setCurrentNotebook(id)
}

function handleSelectNote(id: string) {
  notesStore.setCurrentNote(id)
}

async function handleCreateNotebook(name: string) {
  await notebooksStore.createNotebook(name)
}

async function handleCreateNote(notebookId: string, folderId?: string, name?: string) {
  await notesStore.createNote({
    title: name || '无标题笔记',
    content: '',
    notebook_id: notebookId,
    folder_id: folderId
  })
}

async function handleCreateFolder(notebookId: string, parentId?: string, name?: string) {
  await foldersStore.createFolder({
    name: name || '新建目录',
    notebook_id: notebookId,
    parent_id: parentId
  })
}

function handleCreateNoteFromEmpty() {
  const notebookId = notebooksStore.currentNotebookId || notebooksStore.notebooks[0]?.id
  if (notebookId) {
    handleCreateNote(notebookId)
  } else {
    globalModal.alert('请先创建一个笔记本')
  }
}

async function handleRenameNotebook(id: string, name: string) {
  await notebooksStore.updateNotebook(id, name)
}

async function handleRenameFolder(id: string, name: string) {
  await foldersStore.updateFolder(id, { name })
}

async function handleRenameNote(id: string, name: string) {
  await notesStore.updateNote(id, { title: name })
}

async function handleDeleteNotebook(id: string) {
  await notebooksStore.deleteNotebook(id)
  await foldersStore.fetchFolders()
  await notesStore.fetchNotes()
}

async function handleDeleteFolder(id: string) {
  await foldersStore.deleteFolder(id)
  await foldersStore.fetchFolders()
  await notesStore.fetchNotes()
}

async function handleDeleteNote(id: string) {
  await notesStore.deleteNote(id)
}

async function handleTogglePin(id: string) {
  await notesStore.togglePin(id)
}

// 复制笔记
async function handleCopyNote(id: string) {
  const note = notesStore.notes.find(n => n.id === id)
  if (!note) return
  
  await notesStore.createNote({
    title: `${note.title} (副本)`,
    content: note.content,
    notebook_id: note.notebook_id,
    folder_id: note.folder_id || undefined
  })
  
  await globalModal.success('笔记已复制')
}

// 移动笔记到其他位置
async function handleMoveNoteTo(noteId: string) {
  // 简单实现：显示一个选择目标的对话框
  // 这里可以扩展为更复杂的选择界面
  const note = notesStore.notes.find(n => n.id === noteId)
  if (!note) return
  
  // 获取所有可用的目标（笔记本和目录）
  const targets: { id: string; name: string; type: 'notebook' | 'folder' }[] = []
  
  for (const notebook of notebooksStore.notebooks) {
    targets.push({ id: notebook.id, name: `📓 ${notebook.name}`, type: 'notebook' })
    
    const notebookFolders = foldersStore.folders.filter(f => f.notebook_id === notebook.id)
    for (const folder of notebookFolders) {
      targets.push({ id: folder.id, name: `  📁 ${folder.name}`, type: 'folder' })
    }
  }
  
  // 暂时使用简单提示，后续可以扩展为更好的UI
  await globalModal.alert('请拖拽笔记到目标位置来移动笔记', '移动笔记')
}

async function handleMoveNote(noteId: string, folderId: string | undefined, targetId: string | undefined, position: 'before' | 'after' | 'inside') {
  const note = notesStore.notes.find(n => n.id === noteId)
  if (!note) return
  
  if (position === 'inside') {
    // Just move to folder
    await notesStore.moveToFolder(noteId, folderId)
  } else {
    // Reorder within the same level
    const notebookId = note.notebook_id
    const targetFolderId = folderId
    
    // Get all items at the same level (same folder)
    const siblingNotes = notesStore.notes
      .filter(n => n.notebook_id === notebookId && n.folder_id === (targetFolderId || null))
      .sort((a, b) => a.sort_order - b.sort_order)
    
    const siblingFolders = foldersStore.folders
      .filter(f => f.notebook_id === notebookId && f.parent_id === (targetFolderId || null))
      .sort((a, b) => a.sort_order - b.sort_order)
    
    // Combine and sort all items
    type SortItem = { id: string; type: 'note' | 'folder'; sort_order: number }
    let allItems: SortItem[] = [
      ...siblingFolders.map(f => ({ id: f.id, type: 'folder' as const, sort_order: f.sort_order })),
      ...siblingNotes.map(n => ({ id: n.id, type: 'note' as const, sort_order: n.sort_order }))
    ].sort((a, b) => a.sort_order - b.sort_order)
    
    // Remove the dragged item if it's in the same level
    allItems = allItems.filter(item => !(item.id === noteId && item.type === 'note'))
    
    // Find target index
    let targetIndex = allItems.findIndex(item => item.id === targetId)
    if (targetIndex === -1) targetIndex = allItems.length
    
    // Insert at the correct position
    if (position === 'after') targetIndex++
    
    // Insert the dragged note
    allItems.splice(targetIndex, 0, { id: noteId, type: 'note', sort_order: 0 })
    
    // Update sort orders
    const noteUpdates: { id: string; sort_order: number; folder_id?: string }[] = []
    const folderUpdates: { id: string; sort_order: number }[] = []
    
    allItems.forEach((item, index) => {
      if (item.type === 'note') {
        noteUpdates.push({ 
          id: item.id, 
          sort_order: index,
          folder_id: item.id === noteId ? (targetFolderId || undefined) : undefined
        })
      } else {
        folderUpdates.push({ id: item.id, sort_order: index })
      }
    })
    
    // Update the moved note's folder if different
    if (note.folder_id !== (targetFolderId || null)) {
      const movedNoteUpdate = noteUpdates.find(u => u.id === noteId)
      if (movedNoteUpdate) {
        movedNoteUpdate.folder_id = targetFolderId
      }
    }
    
    if (noteUpdates.length > 0) {
      await notesStore.updateSortOrder(noteUpdates)
    }
    if (folderUpdates.length > 0) {
      await foldersStore.updateSortOrder(folderUpdates)
    }
  }
}

async function handleMoveFolder(folderId: string, parentId: string | undefined, targetId: string | undefined, position: 'before' | 'after' | 'inside') {
  const folder = foldersStore.folders.find(f => f.id === folderId)
  if (!folder) return
  
  if (position === 'inside') {
    // Move folder into another folder
    await foldersStore.updateFolder(folderId, { parent_id: parentId })
  } else {
    // Reorder within the same level
    const notebookId = folder.notebook_id
    const targetParentId = parentId
    
    // Get all items at the same level
    const siblingNotes = notesStore.notes
      .filter(n => n.notebook_id === notebookId && n.folder_id === (targetParentId || null))
      .sort((a, b) => a.sort_order - b.sort_order)
    
    const siblingFolders = foldersStore.folders
      .filter(f => f.notebook_id === notebookId && f.parent_id === (targetParentId || null))
      .sort((a, b) => a.sort_order - b.sort_order)
    
    // Combine and sort all items
    type SortItem = { id: string; type: 'note' | 'folder'; sort_order: number }
    let allItems: SortItem[] = [
      ...siblingFolders.map(f => ({ id: f.id, type: 'folder' as const, sort_order: f.sort_order })),
      ...siblingNotes.map(n => ({ id: n.id, type: 'note' as const, sort_order: n.sort_order }))
    ].sort((a, b) => a.sort_order - b.sort_order)
    
    // Remove the dragged item if it's in the same level
    allItems = allItems.filter(item => !(item.id === folderId && item.type === 'folder'))
    
    // Find target index
    let targetIndex = allItems.findIndex(item => item.id === targetId)
    if (targetIndex === -1) targetIndex = allItems.length
    
    // Insert at the correct position
    if (position === 'after') targetIndex++
    
    // Insert the dragged folder
    allItems.splice(targetIndex, 0, { id: folderId, type: 'folder', sort_order: 0 })
    
    // Update sort orders
    const noteUpdates: { id: string; sort_order: number }[] = []
    const folderUpdates: { id: string; sort_order: number; parent_id?: string }[] = []
    
    allItems.forEach((item, index) => {
      if (item.type === 'note') {
        noteUpdates.push({ id: item.id, sort_order: index })
      } else {
        folderUpdates.push({ 
          id: item.id, 
          sort_order: index,
          parent_id: item.id === folderId ? (targetParentId || undefined) : undefined
        })
      }
    })
    
    // Update the moved folder's parent if different
    if (folder.parent_id !== (targetParentId || null)) {
      const movedFolderUpdate = folderUpdates.find(u => u.id === folderId)
      if (movedFolderUpdate) {
        movedFolderUpdate.parent_id = targetParentId
      }
    }
    
    if (noteUpdates.length > 0) {
      await notesStore.updateSortOrder(noteUpdates)
    }
    if (folderUpdates.length > 0) {
      await foldersStore.updateSortOrder(folderUpdates)
    }
  }
}

function handleSelectTag(tagId: string) {
  tagsStore.getNotesByTag(tagId).then(notes => {
    notesStore.notes = notes
    notesStore.setCurrentNote(null)
  })
}

async function handleCreateTag(name: string) {
  await tagsStore.createTag(name)
}

async function handleRenameTag(id: string, name: string) {
  await tagsStore.updateTag(id, name)
}

async function handleDeleteTag(id: string) {
  await tagsStore.deleteTag(id)
}

function handleSearch(query: string) {
  if (query) {
    notesStore.searchNotes(query)
  } else {
    notesStore.clearSearch()
    notesStore.fetchNotes()
  }
}

async function handleUpdateNote(data: { title?: string; content?: string }) {
  if (notesStore.currentNoteId) {
    await notesStore.updateNote(notesStore.currentNoteId, data)
  }
}

async function handleRemoveTag(tagName: string) {
  if (!notesStore.currentNote) return
  
  // 从笔记的 tags 字段中移除标签
  const currentTags = notesStore.currentNote.tags?.split(',').filter(t => t.trim()) || []
  const newTags = currentTags.filter(t => t !== tagName)
  
  await notesStore.updateNote(notesStore.currentNoteId!, { 
    tags: newTags.join(',') 
  } as any)
  
  // 刷新笔记
  await notesStore.fetchNoteById(notesStore.currentNoteId!)
}

async function handleAIAction(action: string, content: string) {
  try {
    let result: string | string[]
    switch (action) {
      case 'summarize':
        result = await window.electronAPI.ai.summarize(content)
        await globalModal.success(`摘要：\n${result}`, '生成摘要')
        break
      case 'tags':
        result = await window.electronAPI.ai.generateTags(content)
        if (Array.isArray(result)) {
          for (const tagName of result) {
            const tag = await tagsStore.createTag(tagName)
            if (notesStore.currentNoteId) {
              await tagsStore.addTagToNote(notesStore.currentNoteId, tag.id)
            }
          }
          await notesStore.fetchNoteById(notesStore.currentNoteId!)
          await globalModal.success(`已添加标签：${result.join(', ')}`, '自动标签')
        }
        break
      case 'polish':
        result = await window.electronAPI.ai.polish(content)
        if (notesStore.currentNoteId) {
          await notesStore.updateNote(notesStore.currentNoteId, { content: result as string })
        }
        break
      case 'expand':
        result = await window.electronAPI.ai.expand(content)
        if (notesStore.currentNoteId) {
          await notesStore.updateNote(notesStore.currentNoteId, { content: result as string })
        }
        break
      case 'translate-en':
        result = await window.electronAPI.ai.translate(content, 'en')
        if (notesStore.currentNoteId) {
          await notesStore.updateNote(notesStore.currentNoteId, { content: result as string })
        }
        break
      case 'translate-zh':
        result = await window.electronAPI.ai.translate(content, 'zh')
        if (notesStore.currentNoteId) {
          await notesStore.updateNote(notesStore.currentNoteId, { content: result as string })
        }
        break
    }
  } catch (error: any) {
    await globalModal.alert(`AI操作失败：${error.message}`, '错误')
  }
}
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.home-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.resizer {
  width: 4px;
  background: transparent;
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 1px;
    height: 100%;
    background: var(--border-color);
    transition: width 0.15s, background 0.15s;
  }
  
  &:hover::after,
  &.resizing::after {
    width: 3px;
    background: var(--primary-color);
  }
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
</style>
