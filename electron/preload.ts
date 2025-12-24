import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Notebook operations
  notebook: {
    getAll: () => ipcRenderer.invoke('notebook:getAll'),
    create: (name: string) => ipcRenderer.invoke('notebook:create', name),
    update: (id: string, name: string) => ipcRenderer.invoke('notebook:update', id, name),
    delete: (id: string) => ipcRenderer.invoke('notebook:delete', id)
  },
  
  // Folder operations
  folder: {
    getAll: (notebookId?: string) => ipcRenderer.invoke('folder:getAll', notebookId),
    create: (data: { name: string; notebook_id: string; parent_id?: string }) => 
      ipcRenderer.invoke('folder:create', data),
    update: (id: string, data: { name?: string; parent_id?: string; sort_order?: number }) => 
      ipcRenderer.invoke('folder:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('folder:delete', id),
    updateSortOrder: (items: { id: string; sort_order: number; parent_id?: string }[]) =>
      ipcRenderer.invoke('folder:updateSortOrder', items)
  },
  
  // Note operations
  note: {
    getAll: (notebookId?: string) => ipcRenderer.invoke('note:getAll', notebookId),
    getById: (id: string) => ipcRenderer.invoke('note:getById', id),
    create: (data: { title: string; content: string; notebook_id: string; folder_id?: string }) => 
      ipcRenderer.invoke('note:create', data),
    update: (id: string, data: { title?: string; content?: string; notebook_id?: string; folder_id?: string; sort_order?: number }) => 
      ipcRenderer.invoke('note:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('note:delete', id),
    togglePin: (id: string) => ipcRenderer.invoke('note:togglePin', id),
    search: (query: string) => ipcRenderer.invoke('note:search', query),
    moveToNotebook: (noteId: string, notebookId: string, folderId?: string) => 
      ipcRenderer.invoke('note:moveToNotebook', noteId, notebookId, folderId),
    moveToFolder: (noteId: string, folderId?: string) =>
      ipcRenderer.invoke('note:moveToFolder', noteId, folderId),
    updateSortOrder: (items: { id: string; sort_order: number; folder_id?: string }[]) =>
      ipcRenderer.invoke('note:updateSortOrder', items)
  },
  
  // Tag operations
  tag: {
    getAll: () => ipcRenderer.invoke('tag:getAll'),
    create: (name: string) => ipcRenderer.invoke('tag:create', name),
    update: (id: string, name: string) => ipcRenderer.invoke('tag:update', id, name),
    delete: (id: string) => ipcRenderer.invoke('tag:delete', id),
    addToNote: (noteId: string, tagId: string) => ipcRenderer.invoke('tag:addToNote', noteId, tagId),
    removeFromNote: (noteId: string, tagId: string) => ipcRenderer.invoke('tag:removeFromNote', noteId, tagId),
    getNotesByTag: (tagId: string) => ipcRenderer.invoke('tag:getNotesByTag', tagId)
  },
  
  // AI operations
  ai: {
    summarize: (content: string) => ipcRenderer.invoke('ai:summarize', content),
    generateTags: (content: string) => ipcRenderer.invoke('ai:generateTags', content),
    polish: (content: string) => ipcRenderer.invoke('ai:polish', content),
    expand: (content: string) => ipcRenderer.invoke('ai:expand', content),
    translate: (content: string, targetLang: string) => ipcRenderer.invoke('ai:translate', content, targetLang),
    setApiKey: (apiKey: string) => ipcRenderer.invoke('ai:setApiKey', apiKey),
    getApiKey: () => ipcRenderer.invoke('ai:getApiKey')
  },
  
  // GitHub sync operations
  github: {
    // 登录相关
    startLogin: () => ipcRenderer.invoke('github:startLogin'),
    loginWithToken: (token: string) => ipcRenderer.invoke('github:loginWithToken', token),
    logout: () => ipcRenderer.invoke('github:logout'),
    getUser: () => ipcRenderer.invoke('github:getUser'),
    isLoggedIn: () => ipcRenderer.invoke('github:isLoggedIn'),
    
    // 同步相关
    sync: () => ipcRenderer.invoke('github:sync'),
    pull: () => ipcRenderer.invoke('github:pull'),
    getSyncStatus: () => ipcRenderer.invoke('github:getSyncStatus'),
    
    // 自动同步设置
    startAutoSync: () => ipcRenderer.invoke('github:startAutoSync'),
    stopAutoSync: () => ipcRenderer.invoke('github:stopAutoSync'),
    setSyncInterval: (minutes: number) => ipcRenderer.invoke('github:setSyncInterval', minutes),
    
    // 兼容旧 API
    setToken: (token: string) => ipcRenderer.invoke('github:loginWithToken', token),
    getToken: () => ipcRenderer.invoke('github:getToken'),
    setRepo: (owner: string, repo: string) => ipcRenderer.invoke('github:setRepo', owner, repo),
    getRepo: () => ipcRenderer.invoke('github:getRepo')
  },
  
  // Settings operations
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll')
  }
})

// Type definitions for the exposed API
export interface ElectronAPI {
  notebook: {
    getAll: () => Promise<Notebook[]>
    create: (name: string) => Promise<Notebook>
    update: (id: string, name: string) => Promise<Notebook>
    delete: (id: string) => Promise<boolean>
  }
  folder: {
    getAll: (notebookId?: string) => Promise<Folder[]>
    create: (data: { name: string; notebook_id: string; parent_id?: string }) => Promise<Folder>
    update: (id: string, data: { name?: string; parent_id?: string; sort_order?: number }) => Promise<Folder>
    delete: (id: string) => Promise<boolean>
    updateSortOrder: (items: { id: string; sort_order: number; parent_id?: string }[]) => Promise<boolean>
  }
  note: {
    getAll: (notebookId?: string) => Promise<Note[]>
    getById: (id: string) => Promise<Note | null>
    create: (data: { title: string; content: string; notebook_id: string; folder_id?: string }) => Promise<Note>
    update: (id: string, data: { title?: string; content?: string; notebook_id?: string; folder_id?: string; sort_order?: number }) => Promise<Note>
    delete: (id: string) => Promise<boolean>
    togglePin: (id: string) => Promise<number>
    search: (query: string) => Promise<Note[]>
    moveToNotebook: (noteId: string, notebookId: string, folderId?: string) => Promise<boolean>
    moveToFolder: (noteId: string, folderId?: string) => Promise<boolean>
    updateSortOrder: (items: { id: string; sort_order: number; folder_id?: string }[]) => Promise<boolean>
  }
  tag: {
    getAll: () => Promise<Tag[]>
    create: (name: string) => Promise<Tag>
    update: (id: string, name: string) => Promise<Tag>
    delete: (id: string) => Promise<boolean>
    addToNote: (noteId: string, tagId: string) => Promise<boolean>
    removeFromNote: (noteId: string, tagId: string) => Promise<boolean>
    getNotesByTag: (tagId: string) => Promise<Note[]>
  }
  ai: {
    summarize: (content: string) => Promise<string>
    generateTags: (content: string) => Promise<string[]>
    polish: (content: string) => Promise<string>
    expand: (content: string) => Promise<string>
    translate: (content: string, targetLang: string) => Promise<string>
    setApiKey: (apiKey: string) => Promise<boolean>
    getApiKey: () => Promise<string>
  }
  github: {
    // 登录相关
    startLogin: () => Promise<{ success: boolean; user?: GitHubUser; error?: string }>
    loginWithToken: (token: string) => Promise<{ success: boolean; user?: GitHubUser; error?: string }>
    logout: () => Promise<void>
    getUser: () => Promise<GitHubUser | null>
    isLoggedIn: () => Promise<boolean>
    
    // 同步相关
    sync: () => Promise<SyncResult>
    pull: () => Promise<PullResult>
    getSyncStatus: () => Promise<SyncStatus>
    
    // 自动同步设置
    startAutoSync: () => Promise<void>
    stopAutoSync: () => Promise<void>
    setSyncInterval: (minutes: number) => Promise<void>
    
    // 兼容旧 API
    setToken: (token: string) => Promise<{ success: boolean; user?: GitHubUser; error?: string }>
    getToken: () => Promise<string>
    setRepo: (owner: string, repo: string) => Promise<boolean>
    getRepo: () => Promise<{ owner: string; repo: string }>
  }
  settings: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<boolean>
    getAll: () => Promise<Record<string, any>>
  }
}

interface Notebook {
  id: string
  name: string
  created_at: string
  updated_at: string
}

interface Folder {
  id: string
  name: string
  notebook_id: string
  parent_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

interface Note {
  id: string
  title: string
  content: string
  notebook_id: string
  folder_id: string | null
  notebook_name?: string
  tags?: string
  is_pinned: number
  is_deleted: number
  sort_order: number
  created_at: string
  updated_at: string
}

interface Tag {
  id: string
  name: string
  created_at: string
}

interface SyncResult {
  success: boolean
  message: string
  syncedFiles: number
}

interface PullResult {
  success: boolean
  message: string
  pulledFiles: number
  conflicts: string[]
}

interface SyncStatus {
  lastSync: string | null
  status: 'idle' | 'syncing' | 'success' | 'error'
  message: string
  autoSyncEnabled: boolean
  syncInterval: number
}

interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
