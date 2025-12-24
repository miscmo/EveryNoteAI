/**
 * @fileoverview 笔记状态管理 Store
 * @description 管理笔记的 CRUD 操作、搜索、排序、置顶等功能
 * @module stores/notes
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 笔记数据接口
 * @interface Note
 */
export interface Note {
  /** 笔记唯一标识 */
  id: string
  /** 笔记标题 */
  title: string
  /** 笔记内容 (Markdown 格式) */
  content: string
  /** 所属笔记本 ID */
  notebook_id: string
  /** 所属文件夹 ID (null 表示在笔记本根目录) */
  folder_id: string | null
  /** 笔记本名称 (查询时关联获取) */
  notebook_name?: string
  /** 关联的标签名称 (逗号分隔) */
  tags?: string
  /** 是否置顶 (0: 否, 1: 是) */
  is_pinned: number
  /** 是否已删除 (0: 否, 1: 是) */
  is_deleted: number
  /** 排序顺序 (数字越小越靠前) */
  sort_order: number
  /** 创建时间 (ISO 8601 格式) */
  created_at: string
  /** 更新时间 (ISO 8601 格式) */
  updated_at: string
}

/**
 * 笔记 Store
 * @description 使用 Pinia 组合式 API 管理笔记状态
 * 
 * @example
 * ```ts
 * const notesStore = useNotesStore()
 * await notesStore.fetchNotes()
 * await notesStore.createNote({ title: '新笔记', content: '', notebook_id: 'xxx' })
 * ```
 */
export const useNotesStore = defineStore('notes', () => {
  // ==================== 状态定义 ====================
  
  /** 所有笔记列表 */
  const notes = ref<Note[]>([])
  /** 当前选中的笔记 ID */
  const currentNoteId = ref<string | null>(null)
  /** 是否正在加载 */
  const loading = ref(false)
  /** 是否正在保存 */
  const saving = ref(false)
  /** 搜索关键词 */
  const searchQuery = ref('')

  // ==================== 计算属性 ====================

  /**
   * 当前选中的笔记对象
   * @returns {Note | undefined} 当前笔记或 undefined
   */
  const currentNote = computed(() => 
    notes.value.find(note => note.id === currentNoteId.value)
  )

  /**
   * 根据搜索关键词过滤后的笔记列表
   * @returns {Note[]} 过滤后的笔记数组
   */
  const filteredNotes = computed(() => {
    if (!searchQuery.value) return notes.value
    const query = searchQuery.value.toLowerCase()
    return notes.value.filter(note => 
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    )
  })

  /**
   * 已置顶的笔记列表
   * @returns {Note[]} 置顶笔记数组
   */
  const pinnedNotes = computed(() => 
    filteredNotes.value.filter(note => note.is_pinned)
  )

  /**
   * 未置顶的笔记列表
   * @returns {Note[]} 未置顶笔记数组
   */
  const unpinnedNotes = computed(() => 
    filteredNotes.value.filter(note => !note.is_pinned)
  )

  // ==================== 查询方法 ====================

  /**
   * 获取指定文件夹下的笔记
   * @param {string} notebookId - 笔记本 ID
   * @param {string | null} folderId - 文件夹 ID (null 表示根目录)
   * @returns {Note[]} 排序后的笔记数组 (置顶优先，然后按 sort_order)
   */
  function getNotesByFolder(notebookId: string, folderId: string | null): Note[] {
    return notes.value
      .filter(n => n.notebook_id === notebookId && n.folder_id === folderId)
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned
        return a.sort_order - b.sort_order
      })
  }

  /**
   * 获取笔记本根目录下的笔记 (不在任何文件夹中)
   * @param {string} notebookId - 笔记本 ID
   * @returns {Note[]} 根目录笔记数组
   */
  function getRootNotes(notebookId: string): Note[] {
    return getNotesByFolder(notebookId, null)
  }

  // ==================== 异步操作 ====================

  /**
   * 从后端获取笔记列表
   * @param {string} [notebookId] - 可选的笔记本 ID，不传则获取所有笔记
   * @returns {Promise<void>}
   */
  async function fetchNotes(notebookId?: string) {
    loading.value = true
    try {
      notes.value = await window.electronAPI.note.getAll(notebookId)
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 根据 ID 获取单个笔记并更新本地状态
   * @param {string} id - 笔记 ID
   * @returns {Promise<Note | null>} 笔记对象或 null
   */
  async function fetchNoteById(id: string) {
    try {
      const note = await window.electronAPI.note.getById(id)
      if (note) {
        const index = notes.value.findIndex(n => n.id === id)
        if (index !== -1) {
          notes.value[index] = note
        }
      }
      return note
    } catch (error) {
      console.error('Failed to fetch note:', error)
      return null
    }
  }

  /**
   * 创建新笔记
   * @param {Object} data - 笔记数据
   * @param {string} data.title - 标题
   * @param {string} data.content - 内容
   * @param {string} data.notebook_id - 笔记本 ID
   * @param {string} [data.folder_id] - 文件夹 ID
   * @returns {Promise<Note>} 创建的笔记对象
   * @throws {Error} 创建失败时抛出错误
   */
  async function createNote(data: { title: string; content: string; notebook_id: string; folder_id?: string }) {
    try {
      const note = await window.electronAPI.note.create(data)
      notes.value.unshift(note)
      currentNoteId.value = note.id
      return note
    } catch (error) {
      console.error('Failed to create note:', error)
      throw error
    }
  }

  /**
   * 更新笔记
   * @param {string} id - 笔记 ID
   * @param {Object} data - 要更新的字段
   * @returns {Promise<void>}
   * @throws {Error} 更新失败时抛出错误
   */
  async function updateNote(id: string, data: { title?: string; content?: string; notebook_id?: string; folder_id?: string; sort_order?: number }) {
    saving.value = true
    try {
      await window.electronAPI.note.update(id, data)
      const index = notes.value.findIndex(n => n.id === id)
      if (index !== -1) {
        notes.value[index] = { ...notes.value[index], ...data, updated_at: new Date().toISOString() }
      }
    } catch (error) {
      console.error('Failed to update note:', error)
      throw error
    } finally {
      saving.value = false
    }
  }

  /**
   * 删除笔记
   * @param {string} id - 笔记 ID
   * @returns {Promise<void>}
   * @throws {Error} 删除失败时抛出错误
   */
  async function deleteNote(id: string) {
    try {
      await window.electronAPI.note.delete(id)
      const index = notes.value.findIndex(n => n.id === id)
      if (index !== -1) {
        notes.value.splice(index, 1)
      }
      if (currentNoteId.value === id) {
        currentNoteId.value = notes.value[0]?.id || null
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
      throw error
    }
  }

  /**
   * 切换笔记置顶状态
   * @param {string} id - 笔记 ID
   * @returns {Promise<void>}
   * @throws {Error} 操作失败时抛出错误
   */
  async function togglePin(id: string) {
    try {
      const newPinned = await window.electronAPI.note.togglePin(id)
      const index = notes.value.findIndex(n => n.id === id)
      if (index !== -1) {
        notes.value[index].is_pinned = newPinned
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error)
      throw error
    }
  }

  /**
   * 搜索笔记
   * @param {string} query - 搜索关键词
   * @returns {Promise<void>}
   */
  async function searchNotes(query: string) {
    if (!query.trim()) {
      searchQuery.value = ''
      return
    }
    searchQuery.value = query
    try {
      notes.value = await window.electronAPI.note.search(query)
    } catch (error) {
      console.error('Failed to search notes:', error)
    }
  }

  /**
   * 移动笔记到其他笔记本
   * @param {string} noteId - 笔记 ID
   * @param {string} notebookId - 目标笔记本 ID
   * @param {string} [folderId] - 目标文件夹 ID
   * @returns {Promise<void>}
   * @throws {Error} 移动失败时抛出错误
   */
  async function moveToNotebook(noteId: string, notebookId: string, folderId?: string) {
    try {
      await window.electronAPI.note.moveToNotebook(noteId, notebookId, folderId)
      const index = notes.value.findIndex(n => n.id === noteId)
      if (index !== -1) {
        notes.value[index].notebook_id = notebookId
        notes.value[index].folder_id = folderId || null
      }
    } catch (error) {
      console.error('Failed to move note:', error)
      throw error
    }
  }

  /**
   * 移动笔记到其他文件夹 (同一笔记本内)
   * @param {string} noteId - 笔记 ID
   * @param {string} [folderId] - 目标文件夹 ID (不传则移到根目录)
   * @returns {Promise<void>}
   * @throws {Error} 移动失败时抛出错误
   */
  async function moveToFolder(noteId: string, folderId?: string) {
    try {
      await window.electronAPI.note.moveToFolder(noteId, folderId)
      const index = notes.value.findIndex(n => n.id === noteId)
      if (index !== -1) {
        notes.value[index].folder_id = folderId || null
      }
    } catch (error) {
      console.error('Failed to move note to folder:', error)
      throw error
    }
  }

  /**
   * 批量更新笔记排序顺序
   * @description 用于拖拽排序功能，一次性更新多个笔记的 sort_order
   * @param {Array<{id: string, sort_order: number, folder_id?: string}>} items - 排序项数组
   * @returns {Promise<void>}
   * @throws {Error} 更新失败时抛出错误
   * 
   * @example
   * ```ts
   * await notesStore.updateSortOrder([
   *   { id: 'note1', sort_order: 0 },
   *   { id: 'note2', sort_order: 1, folder_id: 'folder1' }
   * ])
   * ```
   */
  async function updateSortOrder(items: { id: string; sort_order: number; folder_id?: string }[]) {
    try {
      await window.electronAPI.note.updateSortOrder(items)
      // Update local state
      for (const item of items) {
        const note = notes.value.find(n => n.id === item.id)
        if (note) {
          note.sort_order = item.sort_order
          if (item.folder_id !== undefined) {
            note.folder_id = item.folder_id || null
          }
        }
      }
    } catch (error) {
      console.error('Failed to update note sort order:', error)
      throw error
    }
  }

  // ==================== 本地状态操作 ====================

  /**
   * 设置当前选中的笔记
   * @param {string | null} id - 笔记 ID 或 null
   */
  function setCurrentNote(id: string | null) {
    currentNoteId.value = id
  }

  /**
   * 清除搜索关键词
   */
  function clearSearch() {
    searchQuery.value = ''
  }

  return {
    notes,
    currentNoteId,
    currentNote,
    loading,
    saving,
    searchQuery,
    filteredNotes,
    pinnedNotes,
    unpinnedNotes,
    getNotesByFolder,
    getRootNotes,
    fetchNotes,
    fetchNoteById,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    searchNotes,
    moveToNotebook,
    moveToFolder,
    updateSortOrder,
    setCurrentNote,
    clearSearch
  }
})
