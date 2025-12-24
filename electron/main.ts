/**
 * @fileoverview Electron 主进程入口
 * @description 负责窗口管理、IPC 通信处理、服务初始化
 * @module electron/main
 */

import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { initDatabase, queryAll, queryOne, runQuery, saveDatabase, closeDatabase } from './database'
import { GitHubSync } from './github-sync'
import { AIService } from './ai-service'
import { SimpleStore } from './simple-store'

// ==================== 全局变量 ====================

/** 设置存储实例 */
let store: SimpleStore
/** 主窗口实例 */
let mainWindow: BrowserWindow | null = null
/** GitHub 同步服务实例 */
let githubSync: GitHubSync | null = null
/** AI 服务实例 */
let aiService: AIService | null = null

// ==================== 窗口管理 ====================

/**
 * 创建主窗口
 * @description 初始化 BrowserWindow 并加载应用
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: true,
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // DevTools can be opened manually with Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows/Linux)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ==================== 应用生命周期 ====================

/**
 * 应用就绪时初始化
 */
app.whenReady().then(async () => {
  store = new SimpleStore()
  if (process.platform === 'win32') {
    Menu.setApplicationMenu(null)
  }
  await initDatabase()
  githubSync = new GitHubSync(store)
  aiService = new AIService(store)
  
  createWindow()

  app.on('activate', () => {
    // macOS: 点击 dock 图标时，如果没有窗口则创建新窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      // 如果窗口存在但被隐藏，则显示它
      mainWindow?.show()
    }
  })
})

/**
 * 安全的日志输出（避免 EPIPE 错误）
 * @param {string} message - 日志消息
 */
function safeLog(message: string) {
  try {
    console.log(message)
  } catch {
    // 忽略 EPIPE 错误，进程退出时管道可能已关闭
  }
}

/**
 * 所有窗口关闭时的处理
 */
app.on('window-all-closed', () => {
  safeLog('All windows closed, saving database...')
  // macOS 下只保存数据库，不关闭，因为应用可能会被重新激活
  if (process.platform === 'darwin') {
    saveDatabase()
  } else {
    closeDatabase()
    app.quit()
  }
})

/**
 * 应用退出前的处理
 */
app.on('before-quit', () => {
  safeLog('App is quitting, saving database...')
  closeDatabase()
})

// ==================== Notebook IPC Handlers ====================
// 笔记本相关的 IPC 处理器

/**
 * 获取所有笔记本
 * @returns {Promise<Notebook[]>} 笔记本列表，按创建时间倒序
 */
ipcMain.handle('notebook:getAll', async () => {
  return queryAll('SELECT * FROM notebooks ORDER BY created_at DESC')
})

/**
 * 创建笔记本
 * @param {string} name - 笔记本名称
 * @returns {Promise<Notebook>} 创建的笔记本对象
 */
ipcMain.handle('notebook:create', async (_, name: string) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  runQuery('INSERT INTO notebooks (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [id, name, now, now])
  return { id, name, created_at: now, updated_at: now }
})

/**
 * 更新笔记本
 * @param {string} id - 笔记本 ID
 * @param {string} name - 新名称
 * @returns {Promise<Notebook>} 更新后的笔记本对象
 */
ipcMain.handle('notebook:update', async (_, id: string, name: string) => {
  const now = new Date().toISOString()
  runQuery('UPDATE notebooks SET name = ?, updated_at = ? WHERE id = ?',
    [name, now, id])
  return { id, name, updated_at: now }
})

/**
 * 删除笔记本
 * @description 级联删除笔记本下的所有笔记标签关联、笔记和文件夹
 * @param {string} id - 笔记本 ID
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('notebook:delete', async (_, id: string) => {
  runQuery('DELETE FROM note_tags WHERE note_id IN (SELECT id FROM notes WHERE notebook_id = ?)', [id])
  runQuery('DELETE FROM notes WHERE notebook_id = ?', [id])
  runQuery('DELETE FROM folders WHERE notebook_id = ?', [id])
  runQuery('DELETE FROM notebooks WHERE id = ?', [id])
  return true
})

// ==================== Folder IPC Handlers ====================
// 文件夹相关的 IPC 处理器

/**
 * 获取文件夹列表
 * @param {string} [notebookId] - 可选的笔记本 ID
 * @returns {Promise<Folder[]>} 文件夹列表
 */
ipcMain.handle('folder:getAll', async (_, notebookId?: string) => {
  if (notebookId) {
    return queryAll('SELECT * FROM folders WHERE notebook_id = ? ORDER BY sort_order, created_at', [notebookId])
  }
  return queryAll('SELECT * FROM folders ORDER BY sort_order, created_at')
})

/**
 * 创建文件夹
 * @param {Object} data - 文件夹数据
 * @param {string} data.name - 名称
 * @param {string} data.notebook_id - 笔记本 ID
 * @param {string} [data.parent_id] - 父文件夹 ID
 * @returns {Promise<Folder>} 创建的文件夹对象
 */
ipcMain.handle('folder:create', async (_, data: { name: string; notebook_id: string; parent_id?: string }) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  // Get max sort_order for siblings
  const maxOrder = queryOne(
    'SELECT MAX(sort_order) as max_order FROM folders WHERE notebook_id = ? AND parent_id IS ?',
    [data.notebook_id, data.parent_id || null]
  )
  const sortOrder = (maxOrder?.max_order ?? -1) + 1
  
  runQuery(`
    INSERT INTO folders (id, name, notebook_id, parent_id, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, data.name, data.notebook_id, data.parent_id || null, sortOrder, now, now])
  
  return { id, ...data, parent_id: data.parent_id || null, sort_order: sortOrder, created_at: now, updated_at: now }
})

/**
 * 更新文件夹
 * @param {string} id - 文件夹 ID
 * @param {Object} data - 要更新的字段
 * @returns {Promise<Folder>} 更新后的文件夹对象
 */
ipcMain.handle('folder:update', async (_, id: string, data: { name?: string; parent_id?: string; sort_order?: number }) => {
  const now = new Date().toISOString()
  const fields: string[] = ['updated_at = ?']
  const values: any[] = [now]
  
  if (data.name !== undefined) {
    fields.push('name = ?')
    values.push(data.name)
  }
  if (data.parent_id !== undefined) {
    fields.push('parent_id = ?')
    values.push(data.parent_id || null)
  }
  if (data.sort_order !== undefined) {
    fields.push('sort_order = ?')
    values.push(data.sort_order)
  }
  
  values.push(id)
  runQuery(`UPDATE folders SET ${fields.join(', ')} WHERE id = ?`, values)
  return { id, ...data, updated_at: now }
})

/**
 * 删除文件夹
 * @description 递归删除所有子文件夹及其中的笔记
 * @param {string} id - 文件夹 ID
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('folder:delete', async (_, id: string) => {
  /**
   * 递归获取所有子文件夹 ID
   * @param {string} folderId - 父文件夹 ID
   * @returns {string[]} 子文件夹 ID 数组
   */
  function getDescendantFolderIds(folderId: string): string[] {
    const children = queryAll('SELECT id FROM folders WHERE parent_id = ?', [folderId]) as { id: string }[]
    const ids: string[] = []
    for (const child of children) {
      ids.push(child.id)
      ids.push(...getDescendantFolderIds(child.id))
    }
    return ids
  }
  
  const allFolderIds = [id, ...getDescendantFolderIds(id)]
  
  // Delete notes in all these folders
  for (const folderId of allFolderIds) {
    runQuery('DELETE FROM note_tags WHERE note_id IN (SELECT id FROM notes WHERE folder_id = ?)', [folderId])
    runQuery('DELETE FROM notes WHERE folder_id = ?', [folderId])
  }
  
  // Delete all descendant folders and the folder itself
  for (const folderId of allFolderIds.reverse()) {
    runQuery('DELETE FROM folders WHERE id = ?', [folderId])
  }
  
  return true
})

/**
 * 批量更新文件夹排序
 * @description 用于拖拽排序，支持同时更新 sort_order 和 parent_id
 * @param {Array<{id: string, sort_order: number, parent_id?: string}>} items - 排序项
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('folder:updateSortOrder', async (_, items: { id: string; sort_order: number; parent_id?: string }[]) => {
  for (const item of items) {
    if (item.parent_id !== undefined) {
      runQuery('UPDATE folders SET sort_order = ?, parent_id = ? WHERE id = ?', 
        [item.sort_order, item.parent_id || null, item.id])
    } else {
      runQuery('UPDATE folders SET sort_order = ? WHERE id = ?', 
        [item.sort_order, item.id])
    }
  }
  return true
})

// ==================== Note IPC Handlers ====================
// 笔记相关的 IPC 处理器

/**
 * 获取笔记列表
 * @param {string} [notebookId] - 可选的笔记本 ID
 * @returns {Promise<Note[]>} 笔记列表，包含关联的标签
 */
ipcMain.handle('note:getAll', async (_, notebookId?: string) => {
  if (notebookId) {
    return queryAll(`
      SELECT n.*, GROUP_CONCAT(t.name) as tags
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.notebook_id = ?
      GROUP BY n.id
      ORDER BY n.is_pinned DESC, n.sort_order, n.updated_at DESC
    `, [notebookId])
  }
  return queryAll(`
    SELECT n.*, nb.name as notebook_name, GROUP_CONCAT(t.name) as tags
    FROM notes n
    LEFT JOIN notebooks nb ON n.notebook_id = nb.id
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    GROUP BY n.id
    ORDER BY n.is_pinned DESC, n.sort_order, n.updated_at DESC
  `)
})

/**
 * 根据 ID 获取单个笔记
 * @param {string} id - 笔记 ID
 * @returns {Promise<Note | null>} 笔记对象或 null
 */
ipcMain.handle('note:getById', async (_, id: string) => {
  return queryOne(`
    SELECT n.*, GROUP_CONCAT(t.name) as tags
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.id = ?
    GROUP BY n.id
  `, [id])
})

/**
 * 创建笔记
 * @param {Object} data - 笔记数据
 * @returns {Promise<Note>} 创建的笔记对象
 */
ipcMain.handle('note:create', async (_, data: { title: string; content: string; notebook_id: string; folder_id?: string }) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  // Get max sort_order for siblings
  const maxOrder = queryOne(
    'SELECT MAX(sort_order) as max_order FROM notes WHERE notebook_id = ? AND folder_id IS ?',
    [data.notebook_id, data.folder_id || null]
  )
  const sortOrder = (maxOrder?.max_order ?? -1) + 1
  
  runQuery(`
    INSERT INTO notes (id, title, content, notebook_id, folder_id, is_pinned, is_deleted, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
  `, [id, data.title, data.content, data.notebook_id, data.folder_id || null, sortOrder, now, now])
  return { id, ...data, folder_id: data.folder_id || null, is_pinned: 0, is_deleted: 0, sort_order: sortOrder, created_at: now, updated_at: now }
})

/**
 * 更新笔记
 * @param {string} id - 笔记 ID
 * @param {Object} data - 要更新的字段
 * @returns {Promise<Note>} 更新后的笔记对象
 */
ipcMain.handle('note:update', async (_, id: string, data: { title?: string; content?: string; notebook_id?: string; folder_id?: string; sort_order?: number }) => {
  const now = new Date().toISOString()
  const fields: string[] = ['updated_at = ?']
  const values: any[] = [now]
  
  if (data.title !== undefined) {
    fields.push('title = ?')
    values.push(data.title)
  }
  if (data.content !== undefined) {
    fields.push('content = ?')
    values.push(data.content)
  }
  if (data.notebook_id !== undefined) {
    fields.push('notebook_id = ?')
    values.push(data.notebook_id)
  }
  if (data.folder_id !== undefined) {
    fields.push('folder_id = ?')
    values.push(data.folder_id || null)
  }
  if (data.sort_order !== undefined) {
    fields.push('sort_order = ?')
    values.push(data.sort_order)
  }
  
  values.push(id)
  runQuery(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`, values)
  return { id, ...data, updated_at: now }
})

/**
 * 批量更新笔记排序
 * @param {Array<{id: string, sort_order: number, folder_id?: string}>} items - 排序项
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('note:updateSortOrder', async (_, items: { id: string; sort_order: number; folder_id?: string }[]) => {
  for (const item of items) {
    if (item.folder_id !== undefined) {
      runQuery('UPDATE notes SET sort_order = ?, folder_id = ? WHERE id = ?', 
        [item.sort_order, item.folder_id || null, item.id])
    } else {
      runQuery('UPDATE notes SET sort_order = ? WHERE id = ?', 
        [item.sort_order, item.id])
    }
  }
  return true
})

/**
 * 删除笔记
 * @param {string} id - 笔记 ID
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('note:delete', async (_, id: string) => {
  runQuery('DELETE FROM note_tags WHERE note_id = ?', [id])
  runQuery('DELETE FROM notes WHERE id = ?', [id])
  return true
})

/**
 * 切换笔记置顶状态
 * @param {string} id - 笔记 ID
 * @returns {Promise<number>} 新的置顶状态 (0 或 1)
 */
ipcMain.handle('note:togglePin', async (_, id: string) => {
  const note = queryOne('SELECT is_pinned FROM notes WHERE id = ?', [id])
  const newPinned = note?.is_pinned ? 0 : 1
  runQuery('UPDATE notes SET is_pinned = ? WHERE id = ?', [newPinned, id])
  return newPinned
})

/**
 * 搜索笔记
 * @param {string} query - 搜索关键词
 * @returns {Promise<Note[]>} 匹配的笔记列表
 */
ipcMain.handle('note:search', async (_, query: string) => {
  const searchPattern = `%${query}%`
  return queryAll(`
    SELECT n.*, nb.name as notebook_name, GROUP_CONCAT(t.name) as tags
    FROM notes n
    LEFT JOIN notebooks nb ON n.notebook_id = nb.id
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.title LIKE ? OR n.content LIKE ?
    GROUP BY n.id
    ORDER BY n.updated_at DESC
  `, [searchPattern, searchPattern])
})

/**
 * 移动笔记到其他笔记本
 * @param {string} noteId - 笔记 ID
 * @param {string} notebookId - 目标笔记本 ID
 * @param {string} [folderId] - 目标文件夹 ID
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('note:moveToNotebook', async (_, noteId: string, notebookId: string, folderId?: string) => {
  const now = new Date().toISOString()
  runQuery('UPDATE notes SET notebook_id = ?, folder_id = ?, updated_at = ? WHERE id = ?',
    [notebookId, folderId || null, now, noteId])
  return true
})

/**
 * 移动笔记到其他文件夹
 * @param {string} noteId - 笔记 ID
 * @param {string} [folderId] - 目标文件夹 ID
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('note:moveToFolder', async (_, noteId: string, folderId?: string) => {
  const now = new Date().toISOString()
  runQuery('UPDATE notes SET folder_id = ?, updated_at = ? WHERE id = ?',
    [folderId || null, now, noteId])
  return true
})

// ==================== Tag IPC Handlers ====================
// 标签相关的 IPC 处理器

/**
 * 获取所有标签
 * @returns {Promise<Tag[]>} 标签列表，按名称排序
 */
ipcMain.handle('tag:getAll', async () => {
  return queryAll('SELECT * FROM tags ORDER BY name')
})

/**
 * 创建标签
 * @param {string} name - 标签名称
 * @returns {Promise<Tag>} 创建的标签对象
 */
ipcMain.handle('tag:create', async (_, name: string) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  runQuery('INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)', [id, name, now])
  return { id, name, created_at: now }
})

/**
 * 更新标签
 * @param {string} id - 标签 ID
 * @param {string} name - 新名称
 * @returns {Promise<Tag>} 更新后的标签对象
 */
ipcMain.handle('tag:update', async (_, id: string, name: string) => {
  runQuery('UPDATE tags SET name = ? WHERE id = ?', [name, id])
  return { id, name }
})

/**
 * 删除标签
 * @param {string} id - 标签 ID
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('tag:delete', async (_, id: string) => {
  runQuery('DELETE FROM note_tags WHERE tag_id = ?', [id])
  runQuery('DELETE FROM tags WHERE id = ?', [id])
  return true
})

/**
 * 为笔记添加标签
 * @param {string} noteId - 笔记 ID
 * @param {string} tagId - 标签 ID
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('tag:addToNote', async (_, noteId: string, tagId: string) => {
  const existing = queryOne('SELECT * FROM note_tags WHERE note_id = ? AND tag_id = ?', [noteId, tagId])
  if (!existing) {
    runQuery('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)', [noteId, tagId])
  }
  return true
})

/**
 * 从笔记移除标签
 * @param {string} noteId - 笔记 ID
 * @param {string} tagId - 标签 ID
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('tag:removeFromNote', async (_, noteId: string, tagId: string) => {
  runQuery('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?', [noteId, tagId])
  return true
})

/**
 * 获取指定标签下的所有笔记
 * @param {string} tagId - 标签 ID
 * @returns {Promise<Note[]>} 笔记列表
 */
ipcMain.handle('tag:getNotesByTag', async (_, tagId: string) => {
  return queryAll(`
    SELECT n.*, nb.name as notebook_name
    FROM notes n
    JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN notebooks nb ON n.notebook_id = nb.id
    WHERE nt.tag_id = ?
    ORDER BY n.updated_at DESC
  `, [tagId])
})

// ==================== AI IPC Handlers ====================
// AI 服务相关的 IPC 处理器

/**
 * AI 生成摘要
 * @param {string} content - 笔记内容
 * @returns {Promise<string>} 摘要文本
 */
ipcMain.handle('ai:summarize', async (_, content: string) => {
  if (!aiService) throw new Error('AI service not initialized')
  return aiService.summarize(content)
})

/**
 * AI 生成标签建议
 * @param {string} content - 笔记内容
 * @returns {Promise<string[]>} 建议的标签数组
 */
ipcMain.handle('ai:generateTags', async (_, content: string) => {
  if (!aiService) throw new Error('AI service not initialized')
  return aiService.generateTags(content)
})

/**
 * AI 润色文本
 * @param {string} content - 原始内容
 * @returns {Promise<string>} 润色后的内容
 */
ipcMain.handle('ai:polish', async (_, content: string) => {
  if (!aiService) throw new Error('AI service not initialized')
  return aiService.polish(content)
})

/**
 * AI 扩展内容
 * @param {string} content - 原始内容
 * @returns {Promise<string>} 扩展后的内容
 */
ipcMain.handle('ai:expand', async (_, content: string) => {
  if (!aiService) throw new Error('AI service not initialized')
  return aiService.expand(content)
})

/**
 * AI 翻译
 * @param {string} content - 原始内容
 * @param {string} targetLang - 目标语言
 * @returns {Promise<string>} 翻译后的内容
 */
ipcMain.handle('ai:translate', async (_, content: string, targetLang: string) => {
  if (!aiService) throw new Error('AI service not initialized')
  return aiService.translate(content, targetLang)
})

/**
 * 设置 OpenAI API Key
 * @param {string} apiKey - API Key
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('ai:setApiKey', async (_, apiKey: string) => {
  store.set('openai.apiKey', apiKey)
  aiService = new AIService(store)
  return true
})

/**
 * 获取 OpenAI API Key
 * @returns {Promise<string>} API Key
 */
ipcMain.handle('ai:getApiKey', async () => {
  return store.get('openai.apiKey', '')
})

// ==================== GitHub Sync IPC Handlers ====================
// GitHub 同步相关的 IPC 处理器

/**
 * 开始 GitHub 登录流程
 * @returns {Promise<{success: boolean, error?: string}>}
 */
ipcMain.handle('github:startLogin', async () => {
  if (!githubSync) throw new Error('GitHub sync not initialized')
  return githubSync.startOAuthLogin()
})

/**
 * 使用 Token 登录 GitHub
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<{success: boolean, user?: GitHubUser, error?: string}>}
 */
ipcMain.handle('github:loginWithToken', async (_, token: string) => {
  if (!githubSync) throw new Error('GitHub sync not initialized')
  return githubSync.loginWithToken(token)
})

/**
 * 退出 GitHub 登录
 */
ipcMain.handle('github:logout', async () => {
  if (!githubSync) throw new Error('GitHub sync not initialized')
  githubSync.logout()
})

/**
 * 获取当前登录用户
 * @returns {Promise<GitHubUser | null>}
 */
ipcMain.handle('github:getUser', async () => {
  if (!githubSync) return null
  return githubSync.getUser()
})

/**
 * 检查是否已登录
 * @returns {Promise<boolean>}
 */
ipcMain.handle('github:isLoggedIn', async () => {
  if (!githubSync) return false
  return githubSync.isLoggedIn()
})

/**
 * 同步到 GitHub
 * @returns {Promise<SyncResult>}
 */
ipcMain.handle('github:sync', async () => {
  if (!githubSync) throw new Error('GitHub sync not initialized')
  return githubSync.syncAll()
})

/**
 * 从 GitHub 拉取
 * @returns {Promise<PullResult>}
 */
ipcMain.handle('github:pull', async () => {
  if (!githubSync) throw new Error('GitHub sync not initialized')
  return githubSync.pullFromGitHub()
})

/**
 * 获取配置冲突信息
 */
ipcMain.handle('github:getConfigConflicts', async () => {
  if (!githubSync) throw new Error('GitHub sync not initialized')
  return githubSync.getConfigConflicts()
})

/**
 * 解决配置冲突
 */
ipcMain.handle('github:resolveConfigConflicts', async (_, payload) => {
  if (!githubSync) throw new Error('GitHub sync not initialized')
  return githubSync.resolveConfigConflicts(payload)
})

/**
 * 获取同步状态
 * @returns {Promise<SyncStatus>}
 */
ipcMain.handle('github:getSyncStatus', async () => {
  if (!githubSync) {
    return {
      lastSync: null,
      status: 'idle',
      message: '',
      autoSyncEnabled: false,
      syncInterval: 5
    }
  }
  return githubSync.getSyncStatus()
})

/**
 * 启动自动同步
 */
ipcMain.handle('github:startAutoSync', async () => {
  if (!githubSync) throw new Error('GitHub sync not initialized')
  githubSync.startAutoSync()
})

/**
 * 停止自动同步
 */
ipcMain.handle('github:stopAutoSync', async () => {
  if (!githubSync) throw new Error('GitHub sync not initialized')
  githubSync.stopAutoSync()
})

/**
 * 设置同步间隔
 * @param {number} minutes - 间隔分钟数
 */
ipcMain.handle('github:setSyncInterval', async (_, minutes: number) => {
  if (!githubSync) throw new Error('GitHub sync not initialized')
  githubSync.setSyncInterval(minutes)
})

/**
 * 获取 GitHub Token (兼容旧 API)
 */
ipcMain.handle('github:getToken', async () => {
  return store.get('github.accessToken', '')
})

/**
 * 设置 GitHub 仓库 (兼容旧 API)
 */
ipcMain.handle('github:setRepo', async (_, owner: string, repo: string) => {
  store.set('github.owner', owner)
  store.set('github.repo', repo)
  return true
})

/**
 * 获取 GitHub 仓库信息 (兼容旧 API)
 */
ipcMain.handle('github:getRepo', async () => {
  return {
    owner: store.get('github.owner', ''),
    repo: store.get('github.repo', '')
  }
})

// ==================== Settings IPC Handlers ====================
// 设置相关的 IPC 处理器

/**
 * 获取设置项
 * @param {string} key - 设置键名
 * @returns {Promise<any>} 设置值
 */
ipcMain.handle('settings:get', async (_, key: string) => {
  return store.get(key)
})

/**
 * 保存设置项
 * @param {string} key - 设置键名
 * @param {any} value - 设置值
 * @returns {Promise<boolean>} 是否成功
 */
ipcMain.handle('settings:set', async (_, key: string, value: any) => {
  store.set(key, value)
  return true
})

/**
 * 获取所有设置
 * @returns {Promise<Object>} 所有设置项
 */
ipcMain.handle('settings:getAll', async () => {
  return store.store
})
