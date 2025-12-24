/**
 * @fileoverview GitHub 同步服务
 * @description 支持 OAuth 登录、自动创建仓库、定时同步、配置同步
 * @module electron/github-sync
 */

import { Octokit } from '@octokit/rest'
import { shell } from 'electron'
import { SimpleStore } from './simple-store'
import { queryAll, queryOne, runQuery } from './database'

// ==================== 类型定义 ====================

interface Note {
  id: string
  title: string
  content: string
  notebook_id: string
  folder_id: string | null
  notebook_name?: string
  folder_name?: string
  tags?: string
  is_pinned: number
  sort_order: number
  created_at: string
  updated_at: string
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
  pulledNotes: number
  newNotes: number
  updatedNotes: number
}

interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

interface SyncStatus {
  lastSync: string | null
  status: 'idle' | 'syncing' | 'success' | 'error'
  message: string
  autoSyncEnabled: boolean
  syncInterval: number // minutes
}

interface ConfigData {
  notebooks: Notebook[]
  folders: Folder[]
  tags: Tag[]
  settings: Record<string, any>
  version: string
  exportedAt: string
}

// ==================== GitHub 同步服务类 ====================

export class GitHubSync {
  private octokit: Octokit | null = null
  private store: SimpleStore
  private syncTimer: NodeJS.Timeout | null = null
  private isSyncing: boolean = false
  private pendingSync: boolean = false
  
  /** 默认仓库名 */
  private readonly DEFAULT_REPO_NAME = 'ai-note-sync'
  /** 同步间隔（分钟） */
  private syncInterval: number = 5

  constructor(store: SimpleStore) {
    this.store = store
    this.initFromStore()
  }

  /**
   * 从存储中初始化
   */
  private initFromStore(): void {
    const token = this.store.get('github.accessToken', '') as string
    if (token) {
      this.octokit = new Octokit({ auth: token })
    }
    
    this.syncInterval = this.store.get('github.syncInterval', 5) as number
    const autoSync = this.store.get('github.autoSyncEnabled', false) as boolean
    
    if (autoSync && this.octokit) {
      this.startAutoSync()
    }
  }

  // ==================== OAuth 登录 ====================

  /**
   * 获取 GitHub OAuth 授权 URL
   * @description 使用 Device Flow 进行授权，更适合桌面应用
   */
  async startOAuthLogin(): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    try {
      // 使用 Personal Access Token 方式，让用户在浏览器中创建
      // 打开 GitHub Token 创建页面
      const tokenUrl = 'https://github.com/settings/tokens/new?description=AI%20Note%20Assistant&scopes=repo,user'
      await shell.openExternal(tokenUrl)
      
      return {
        success: true,
        error: '请在浏览器中创建 Token 后，复制粘贴到下方输入框'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录失败'
      }
    }
  }

  /**
   * 使用 Token 登录
   */
  async loginWithToken(token: string): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    try {
      this.octokit = new Octokit({ auth: token })
      
      // 验证 Token 并获取用户信息
      const { data: user } = await this.octokit.users.getAuthenticated()
      
      // 保存 Token 和用户信息
      this.store.set('github.accessToken', token)
      this.store.set('github.user', {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        html_url: user.html_url
      })
      this.store.set('github.owner', user.login)
      this.store.set('github.repo', this.DEFAULT_REPO_NAME)
      
      // 确保仓库存在
      await this.ensureRepoExists()
      
      return {
        success: true,
        user: {
          login: user.login,
          name: user.name,
          avatar_url: user.avatar_url,
          html_url: user.html_url
        }
      }
    } catch (error: any) {
      this.octokit = null
      return {
        success: false,
        error: error.message || '登录失败，请检查 Token 是否正确'
      }
    }
  }

  /**
   * 退出登录
   */
  logout(): void {
    this.stopAutoSync()
    this.octokit = null
    this.store.delete('github.accessToken')
    this.store.delete('github.user')
    this.store.delete('github.owner')
    this.store.delete('github.repo')
    this.store.delete('github.lastSync')
  }

  /**
   * 获取当前登录用户
   */
  getUser(): GitHubUser | null {
    return this.store.get('github.user', null) as GitHubUser | null
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return !!this.octokit && !!this.store.get('github.accessToken')
  }

  // ==================== 仓库管理 ====================

  /**
   * 确保同步仓库存在
   */
  private async ensureRepoExists(): Promise<void> {
    if (!this.octokit) throw new Error('未登录')
    
    const owner = this.store.get('github.owner', '') as string
    const repo = this.store.get('github.repo', this.DEFAULT_REPO_NAME) as string
    
    try {
      await this.octokit.repos.get({ owner, repo })
    } catch (error: any) {
      if (error.status === 404) {
        // 创建私有仓库
        await this.octokit.repos.createForAuthenticatedUser({
          name: repo,
          description: '🗒️ AI Note Assistant - 笔记同步仓库',
          private: true,
          auto_init: true,
          gitignore_template: undefined,
          license_template: undefined
        })
        
        // 等待仓库初始化
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // 创建初始目录结构
        await this.createInitialStructure()
      } else {
        throw error
      }
    }
  }

  /**
   * 创建初始目录结构
   */
  private async createInitialStructure(): Promise<void> {
    if (!this.octokit) return
    
    const owner = this.store.get('github.owner', '') as string
    const repo = this.store.get('github.repo', '') as string
    
    // 创建 README
    const readmeContent = `# AI Note Assistant 同步仓库

此仓库用于同步 AI Note Assistant 的笔记和配置。

## 目录结构

\`\`\`
├── notes/           # 笔记文件 (Markdown)
│   └── {notebook}/  # 按笔记本分类
├── config/          # 配置文件
│   └── data.json    # 笔记本、文件夹、标签等元数据
└── README.md
\`\`\`

## 注意

- 此仓库由 AI Note Assistant 自动管理
- 请勿手动修改 config/data.json 文件
- 笔记文件可以手动编辑，但请保留 frontmatter 元数据

---
*由 AI Note Assistant 自动创建*
`
    
    try {
      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'README.md',
        message: '🎉 Initial commit - AI Note Assistant',
        content: Buffer.from(readmeContent).toString('base64')
      })
    } catch (error) {
      console.error('Failed to create README:', error)
    }
  }

  // ==================== 同步功能 ====================

  /**
   * 完整同步（推送所有数据到 GitHub）
   */
  async syncAll(): Promise<SyncResult> {
    if (!this.isLoggedIn()) {
      return { success: false, message: '请先登录 GitHub', syncedFiles: 0 }
    }
    
    if (this.isSyncing) {
      this.pendingSync = true
      return { success: false, message: '同步正在进行中', syncedFiles: 0 }
    }
    
    this.isSyncing = true
    this.updateSyncStatus('syncing', '正在同步...')
    
    try {
      await this.ensureRepoExists()
      
      let syncedCount = 0
      
      // 1. 同步配置数据
      await this.syncConfig()
      syncedCount++
      
      // 2. 同步所有笔记
      const notes = this.getAllNotesWithDetails()
      for (const note of notes) {
        await this.syncNote(note)
        syncedCount++
      }
      
      // 3. 清理已删除的笔记
      await this.cleanupDeletedNotes(notes)
      
      const now = new Date().toISOString()
      this.store.set('github.lastSync', now)
      this.updateSyncStatus('success', `成功同步 ${syncedCount} 个文件`)
      
      return {
        success: true,
        message: `成功同步 ${syncedCount} 个文件到 GitHub`,
        syncedFiles: syncedCount
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '同步失败'
      this.updateSyncStatus('error', message)
      return { success: false, message, syncedFiles: 0 }
    } finally {
      this.isSyncing = false
      
      if (this.pendingSync) {
        this.pendingSync = false
        // 延迟执行待处理的同步
        setTimeout(() => this.syncAll(), 1000)
      }
    }
  }

  /**
   * 同步配置数据
   */
  private async syncConfig(): Promise<void> {
    if (!this.octokit) return
    
    const owner = this.store.get('github.owner', '') as string
    const repo = this.store.get('github.repo', '') as string
    
    // 获取所有配置数据
    const configData: ConfigData = {
      notebooks: queryAll('SELECT * FROM notebooks ORDER BY created_at') as Notebook[],
      folders: queryAll('SELECT * FROM folders ORDER BY sort_order') as Folder[],
      tags: queryAll('SELECT * FROM tags ORDER BY name') as Tag[],
      settings: {
        darkMode: this.store.get('appearance.darkMode'),
        fontSize: this.store.get('appearance.fontSize'),
        editorMode: this.store.get('appearance.editorMode'),
        autoSave: this.store.get('editor.autoSave')
      },
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    }
    
    const content = JSON.stringify(configData, null, 2)
    const filePath = 'config/data.json'
    
    // 获取现有文件的 SHA
    let sha: string | undefined
    try {
      const { data } = await this.octokit.repos.getContent({ owner, repo, path: filePath })
      if (!Array.isArray(data) && data.type === 'file') {
        sha = data.sha
      }
    } catch {
      // 文件不存在
    }
    
    await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: '📝 Update config',
      content: Buffer.from(content).toString('base64'),
      sha
    })
  }

  /**
   * 同步单个笔记
   */
  private async syncNote(note: Note): Promise<void> {
    if (!this.octokit) return
    
    const owner = this.store.get('github.owner', '') as string
    const repo = this.store.get('github.repo', '') as string
    
    // 构建文件路径
    const notebookName = this.sanitizeFileName(note.notebook_name || 'default')
    const fileName = `${this.sanitizeFileName(note.title)}_${note.id.substring(0, 8)}.md`
    const filePath = `notes/${notebookName}/${fileName}`
    
    // 生成 Markdown 内容
    const content = this.noteToMarkdown(note)
    
    // 获取现有文件的 SHA
    let sha: string | undefined
    try {
      const { data } = await this.octokit.repos.getContent({ owner, repo, path: filePath })
      if (!Array.isArray(data) && data.type === 'file') {
        sha = data.sha
      }
    } catch {
      // 文件不存在
    }
    
    await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `📝 Sync: ${note.title}`,
      content: Buffer.from(content).toString('base64'),
      sha
    })
  }

  /**
   * 清理已删除的笔记
   */
  private async cleanupDeletedNotes(currentNotes: Note[]): Promise<void> {
    if (!this.octokit) return
    
    const owner = this.store.get('github.owner', '') as string
    const repo = this.store.get('github.repo', '') as string
    
    try {
      // 获取仓库中的所有笔记文件
      const repoFiles = await this.getRepoFiles('notes')
      const currentNoteIds = new Set(currentNotes.map(n => n.id.substring(0, 8)))
      
      for (const file of repoFiles) {
        if (!file.name.endsWith('.md')) continue
        
        // 从文件名提取 ID
        const match = file.name.match(/_([a-f0-9]{8})\.md$/)
        if (match && !currentNoteIds.has(match[1])) {
          // 删除不存在的笔记文件
          try {
            const { data } = await this.octokit.repos.getContent({ owner, repo, path: file.path })
            if (!Array.isArray(data) && data.type === 'file') {
              await this.octokit.repos.deleteFile({
                owner,
                repo,
                path: file.path,
                message: `🗑️ Delete: ${file.name}`,
                sha: data.sha
              })
            }
          } catch {
            // 忽略删除错误
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup deleted notes:', error)
    }
  }

  /**
   * 从 GitHub 拉取数据
   */
  async pullFromGitHub(): Promise<PullResult> {
    if (!this.isLoggedIn()) {
      return { success: false, message: '请先登录 GitHub', pulledNotes: 0, newNotes: 0, updatedNotes: 0 }
    }
    
    try {
      const owner = this.store.get('github.owner', '') as string
      const repo = this.store.get('github.repo', '') as string
      
      let newNotes = 0
      let updatedNotes = 0
      
      // 1. 拉取配置
      try {
        const { data } = await this.octokit!.repos.getContent({
          owner, repo, path: 'config/data.json'
        })
        
        if (!Array.isArray(data) && data.type === 'file' && data.content) {
          const content = Buffer.from(data.content, 'base64').toString('utf-8')
          const configData: ConfigData = JSON.parse(content)
          
          // 合并笔记本（包括更新时间）
          for (const notebook of configData.notebooks) {
            const existing = queryOne('SELECT * FROM notebooks WHERE id = ?', [notebook.id])
            if (!existing) {
              runQuery(
                'INSERT INTO notebooks (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
                [notebook.id, notebook.name, notebook.created_at, notebook.updated_at]
              )
            } else if (new Date(notebook.updated_at) > new Date(existing.updated_at)) {
              // 更新笔记本名称
              runQuery(
                'UPDATE notebooks SET name = ?, updated_at = ? WHERE id = ?',
                [notebook.name, notebook.updated_at, notebook.id]
              )
            }
          }
          
          // 合并文件夹（包括排序）
          for (const folder of configData.folders) {
            const existing = queryOne('SELECT * FROM folders WHERE id = ?', [folder.id])
            if (!existing) {
              runQuery(
                'INSERT INTO folders (id, name, notebook_id, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [folder.id, folder.name, folder.notebook_id, folder.parent_id, folder.sort_order, folder.created_at, folder.updated_at]
              )
            } else if (new Date(folder.updated_at) > new Date(existing.updated_at)) {
              // 更新文件夹（包括排序和父级）
              runQuery(
                'UPDATE folders SET name = ?, parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ?',
                [folder.name, folder.parent_id, folder.sort_order, folder.updated_at, folder.id]
              )
            }
          }
          
          // 合并标签
          for (const tag of configData.tags) {
            const existing = queryOne('SELECT * FROM tags WHERE id = ?', [tag.id])
            if (!existing) {
              runQuery(
                'INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)',
                [tag.id, tag.name, tag.created_at]
              )
            }
          }
        }
      } catch {
        // 配置文件不存在
      }
      
      // 2. 拉取笔记
      const noteFiles = await this.getRepoFiles('notes')
      
      for (const file of noteFiles) {
        if (!file.name.endsWith('.md')) continue
        
        try {
          const { data } = await this.octokit!.repos.getContent({ owner, repo, path: file.path })
          
          if (!Array.isArray(data) && data.type === 'file' && data.content) {
            const content = Buffer.from(data.content, 'base64').toString('utf-8')
            const noteData = this.parseMarkdownNote(content, file.name)
            
            if (noteData && noteData.id) {
              const existing = queryOne('SELECT * FROM notes WHERE id = ?', [noteData.id])
              
              if (!existing) {
                // 新笔记
                const notebookId = this.findOrCreateNotebook(noteData.notebook_name || 'default')
                runQuery(
                  `INSERT INTO notes (id, title, content, notebook_id, folder_id, is_pinned, is_deleted, sort_order, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
                  [noteData.id, noteData.title, noteData.content, notebookId, null, noteData.is_pinned || 0, noteData.sort_order || 0, noteData.created_at, noteData.updated_at]
                )
                newNotes++
              } else if (new Date(noteData.updated_at || '') > new Date(existing.updated_at)) {
                // 更新笔记（GitHub 版本更新，包括排序和置顶状态）
                runQuery(
                  'UPDATE notes SET title = ?, content = ?, is_pinned = ?, sort_order = ?, updated_at = ? WHERE id = ?',
                  [noteData.title, noteData.content, noteData.is_pinned || 0, noteData.sort_order || existing.sort_order, noteData.updated_at, noteData.id]
                )
                updatedNotes++
              }
            }
          }
        } catch (error) {
          console.error(`Failed to pull note ${file.path}:`, error)
        }
      }
      
      return {
        success: true,
        message: `拉取完成：${newNotes} 个新笔记，${updatedNotes} 个更新`,
        pulledNotes: newNotes + updatedNotes,
        newNotes,
        updatedNotes
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '拉取失败'
      return { success: false, message, pulledNotes: 0, newNotes: 0, updatedNotes: 0 }
    }
  }

  // ==================== 自动同步 ====================

  /**
   * 启动自动同步
   */
  startAutoSync(): void {
    this.stopAutoSync()
    
    if (!this.isLoggedIn()) return
    
    const intervalMs = this.syncInterval * 60 * 1000
    this.syncTimer = setInterval(() => {
      this.syncAll()
    }, intervalMs)
    
    this.store.set('github.autoSyncEnabled', true)
    console.log(`Auto sync started: every ${this.syncInterval} minutes`)
  }

  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
    this.store.set('github.autoSyncEnabled', false)
    console.log('Auto sync stopped')
  }

  /**
   * 设置同步间隔
   */
  setSyncInterval(minutes: number): void {
    this.syncInterval = minutes
    this.store.set('github.syncInterval', minutes)
    
    // 如果自动同步已启用，重启定时器
    if (this.syncTimer) {
      this.startAutoSync()
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    return {
      lastSync: this.store.get('github.lastSync', null) as string | null,
      status: this.isSyncing ? 'syncing' : (this.store.get('github.syncStatus', 'idle') as SyncStatus['status']),
      message: this.store.get('github.syncMessage', '') as string,
      autoSyncEnabled: this.store.get('github.autoSyncEnabled', false) as boolean,
      syncInterval: this.syncInterval
    }
  }

  /**
   * 标记需要同步（用于本地修改后触发）
   */
  markNeedSync(): void {
    // 如果启用了自动同步，延迟执行同步
    if (this.store.get('github.autoSyncEnabled', false)) {
      // 使用防抖，避免频繁同步
      if (this.pendingSync) return
      this.pendingSync = true
      
      setTimeout(() => {
        this.pendingSync = false
        this.syncAll()
      }, 30000) // 30秒后同步
    }
  }

  // ==================== 辅助方法 ====================

  private updateSyncStatus(status: SyncStatus['status'], message: string): void {
    this.store.set('github.syncStatus', status)
    this.store.set('github.syncMessage', message)
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100)
  }

  private noteToMarkdown(note: Note): string {
    const tags = note.tags ? note.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    
    return `---
id: ${note.id}
title: "${note.title.replace(/"/g, '\\"')}"
notebook: ${note.notebook_name || 'default'}
folder: ${note.folder_name || ''}
tags: [${tags.map(t => `"${t}"`).join(', ')}]
is_pinned: ${note.is_pinned}
sort_order: ${note.sort_order}
created_at: ${note.created_at}
updated_at: ${note.updated_at}
---

${note.content}`
  }

  private parseMarkdownNote(content: string, fileName: string): Partial<Note> | null {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    
    if (frontMatterMatch) {
      const frontMatter = frontMatterMatch[1]
      const noteContent = frontMatterMatch[2].trim()
      
      const getValue = (key: string): string | undefined => {
        const match = frontMatter.match(new RegExp(`${key}:\\s*"?([^"\\n]*)"?`))
        return match?.[1]?.trim()
      }
      
      return {
        id: getValue('id'),
        title: getValue('title') || fileName.replace('.md', ''),
        content: noteContent,
        notebook_name: getValue('notebook'),
        is_pinned: parseInt(getValue('is_pinned') || '0') as 0 | 1,
        sort_order: parseInt(getValue('sort_order') || '0'),
        created_at: getValue('created_at'),
        updated_at: getValue('updated_at')
      }
    }
    
    return {
      title: fileName.replace('.md', ''),
      content: content
    }
  }

  private getAllNotesWithDetails(): Note[] {
    return queryAll(`
      SELECT n.*, nb.name as notebook_name, f.name as folder_name, GROUP_CONCAT(t.name) as tags
      FROM notes n
      LEFT JOIN notebooks nb ON n.notebook_id = nb.id
      LEFT JOIN folders f ON n.folder_id = f.id
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.is_deleted = 0
      GROUP BY n.id
      ORDER BY n.updated_at DESC
    `) as Note[]
  }

  private findOrCreateNotebook(name: string): string {
    const existing = queryOne('SELECT id FROM notebooks WHERE name = ?', [name])
    if (existing) return existing.id
    
    const id = require('crypto').randomUUID()
    const now = new Date().toISOString()
    runQuery(
      'INSERT INTO notebooks (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, name, now, now]
    )
    return id
  }

  private async getRepoFiles(path: string): Promise<Array<{ name: string; path: string; sha: string }>> {
    if (!this.octokit) return []
    
    const owner = this.store.get('github.owner', '') as string
    const repo = this.store.get('github.repo', '') as string
    const files: Array<{ name: string; path: string; sha: string }> = []
    
    try {
      const { data } = await this.octokit.repos.getContent({ owner, repo, path })
      
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.type === 'file') {
            files.push({ name: item.name, path: item.path, sha: item.sha })
          } else if (item.type === 'dir') {
            const subFiles = await this.getRepoFiles(item.path)
            files.push(...subFiles)
          }
        }
      }
    } catch (error: any) {
      if (error.status !== 404) {
        throw error
      }
    }
    
    return files
  }

  // ==================== 兼容旧 API ====================

  async syncNotes(_notes: Note[]): Promise<SyncResult> {
    return this.syncAll()
  }

  async pullNotes(): Promise<PullResult> {
    return this.pullFromGitHub()
  }
}
