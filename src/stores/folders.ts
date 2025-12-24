/**
 * @fileoverview 文件夹状态管理 Store
 * @description 管理文件夹的树形结构、CRUD 操作和拖拽排序
 * @module stores/folders
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 文件夹数据接口
 * @interface Folder
 */
export interface Folder {
  /** 文件夹唯一标识 */
  id: string
  /** 文件夹名称 */
  name: string
  /** 所属笔记本 ID */
  notebook_id: string
  /** 父文件夹 ID (null 表示根文件夹) */
  parent_id: string | null
  /** 排序顺序 (数字越小越靠前) */
  sort_order: number
  /** 创建时间 (ISO 8601 格式) */
  created_at: string
  /** 更新时间 (ISO 8601 格式) */
  updated_at: string
}

/**
 * 文件夹 Store
 * @description 使用 Pinia 组合式 API 管理文件夹树形结构
 * 
 * @example
 * ```ts
 * const foldersStore = useFoldersStore()
 * await foldersStore.fetchFolders('notebook-id')
 * const rootFolders = foldersStore.getRootFolders('notebook-id')
 * const childFolders = foldersStore.getChildFolders('parent-folder-id')
 * ```
 */
export const useFoldersStore = defineStore('folders', () => {
  // ==================== 状态定义 ====================
  
  /** 所有文件夹列表 (扁平结构，通过 parent_id 关联) */
  const folders = ref<Folder[]>([])
  /** 是否正在加载 */
  const loading = ref(false)

  // ==================== 查询方法 ====================

  /**
   * 获取指定笔记本的所有文件夹
   * @param {string} notebookId - 笔记本 ID
   * @returns {Folder[]} 该笔记本下的所有文件夹
   */
  function getFoldersByNotebook(notebookId: string): Folder[] {
    return folders.value.filter(f => f.notebook_id === notebookId)
  }

  /**
   * 获取笔记本的根文件夹 (没有父文件夹的)
   * @param {string} notebookId - 笔记本 ID
   * @returns {Folder[]} 按 sort_order 排序的根文件夹数组
   */
  function getRootFolders(notebookId: string): Folder[] {
    return folders.value
      .filter(f => f.notebook_id === notebookId && !f.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  /**
   * 获取子文件夹
   * @param {string} parentId - 父文件夹 ID
   * @returns {Folder[]} 按 sort_order 排序的子文件夹数组
   */
  function getChildFolders(parentId: string): Folder[] {
    return folders.value
      .filter(f => f.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  /**
   * 根据 ID 获取文件夹
   * @param {string} id - 文件夹 ID
   * @returns {Folder | undefined} 文件夹对象或 undefined
   */
  function getFolderById(id: string): Folder | undefined {
    return folders.value.find(f => f.id === id)
  }

  // ==================== 异步操作 ====================

  /**
   * 从后端获取文件夹列表
   * @param {string} [notebookId] - 可选的笔记本 ID，不传则获取所有文件夹
   * @returns {Promise<void>}
   */
  async function fetchFolders(notebookId?: string) {
    loading.value = true
    try {
      folders.value = await window.electronAPI.folder.getAll(notebookId)
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新文件夹
   * @param {Object} data - 文件夹数据
   * @param {string} data.name - 文件夹名称
   * @param {string} data.notebook_id - 所属笔记本 ID
   * @param {string} [data.parent_id] - 父文件夹 ID (不传则创建根文件夹)
   * @returns {Promise<Folder>} 创建的文件夹对象
   * @throws {Error} 创建失败时抛出错误
   */
  async function createFolder(data: { name: string; notebook_id: string; parent_id?: string }) {
    try {
      const folder = await window.electronAPI.folder.create(data)
      folders.value.push(folder)
      return folder
    } catch (error) {
      console.error('Failed to create folder:', error)
      throw error
    }
  }

  /**
   * 更新文件夹
   * @param {string} id - 文件夹 ID
   * @param {Object} data - 要更新的字段
   * @param {string} [data.name] - 新名称
   * @param {string} [data.parent_id] - 新父文件夹 ID
   * @param {number} [data.sort_order] - 新排序顺序
   * @returns {Promise<Folder>} 更新后的文件夹对象
   * @throws {Error} 更新失败时抛出错误
   */
  async function updateFolder(id: string, data: { name?: string; parent_id?: string; sort_order?: number }) {
    try {
      const updated = await window.electronAPI.folder.update(id, data)
      const index = folders.value.findIndex(f => f.id === id)
      if (index !== -1) {
        folders.value[index] = { ...folders.value[index], ...updated }
      }
      return updated
    } catch (error) {
      console.error('Failed to update folder:', error)
      throw error
    }
  }

  /**
   * 删除文件夹
   * @description 会递归删除所有子文件夹和其中的笔记
   * @param {string} id - 文件夹 ID
   * @returns {Promise<void>}
   * @throws {Error} 删除失败时抛出错误
   */
  async function deleteFolder(id: string) {
    try {
      await window.electronAPI.folder.delete(id)
      folders.value = folders.value.filter(f => f.id !== id)
    } catch (error) {
      console.error('Failed to delete folder:', error)
      throw error
    }
  }

  /**
   * 批量更新文件夹排序顺序
   * @description 用于拖拽排序功能，一次性更新多个文件夹的 sort_order 和 parent_id
   * @param {Array<{id: string, sort_order: number, parent_id?: string}>} items - 排序项数组
   * @returns {Promise<void>}
   * @throws {Error} 更新失败时抛出错误
   * 
   * @example
   * ```ts
   * // 拖拽排序后批量更新
   * await foldersStore.updateSortOrder([
   *   { id: 'folder1', sort_order: 0 },
   *   { id: 'folder2', sort_order: 1, parent_id: 'folder1' }  // 移动到 folder1 下
   * ])
   * ```
   */
  async function updateSortOrder(items: { id: string; sort_order: number; parent_id?: string }[]) {
    try {
      await window.electronAPI.folder.updateSortOrder(items)
      // Update local state
      for (const item of items) {
        const folder = folders.value.find(f => f.id === item.id)
        if (folder) {
          folder.sort_order = item.sort_order
          if (item.parent_id !== undefined) {
            folder.parent_id = item.parent_id || null
          }
        }
      }
    } catch (error) {
      console.error('Failed to update folder sort order:', error)
      throw error
    }
  }

  // ==================== 导出 ====================

  return {
    // 状态
    folders,
    loading,
    // 查询方法
    getFoldersByNotebook,
    getRootFolders,
    getChildFolders,
    getFolderById,
    // 异步操作
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    updateSortOrder
  }
})
