/**
 * @fileoverview SQLite 数据库操作模块
 * @description 使用 sql.js 实现 SQLite 数据库的初始化、查询和持久化
 * @module electron/database
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'

/** 数据库实例 */
let db: SqlJsDatabase | null = null
/** 数据库文件路径 */
let dbPath: string = ''

/**
 * 获取数据库实例
 * @returns {SqlJsDatabase} 数据库实例
 * @throws {Error} 数据库未初始化时抛出错误
 */
export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

/**
 * 保存数据库到文件
 * @description 将内存中的数据库导出并写入磁盘
 */
export function saveDatabase(): void {
  if (db && dbPath) {
    console.log('Saving database to:', dbPath)
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
    console.log('Database saved successfully, size:', buffer.length, 'bytes')
  }
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')
  
  console.log('User data path:', userDataPath)
  console.log('Database directory:', dbDir)
  
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  
  dbPath = join(dbDir, 'notes.db')
  console.log('Database path:', dbPath)
  console.log('Database exists:', existsSync(dbPath))
  
  const SQL = await initSqlJs()
  
  // Load existing database or create new one
  if (existsSync(dbPath)) {
    console.log('Loading existing database...')
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
    console.log('Database loaded successfully')
  } else {
    console.log('Creating new database...')
    db = new SQL.Database()
  }
  
  // Create tables
  db.run(`
    -- Notebooks table
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  
  db.run(`
    -- Folders table
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      notebook_id TEXT NOT NULL,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    )
  `)
  
  // Check if notes table needs migration (add new columns)
  const tableInfo = db.exec("PRAGMA table_info(notes)")
  const columns = tableInfo[0]?.values.map((row: any) => row[1]) || []
  
  if (!columns.includes('folder_id')) {
    console.log('Migrating notes table: adding folder_id column')
    db.run('ALTER TABLE notes ADD COLUMN folder_id TEXT')
  }
  if (!columns.includes('sort_order')) {
    console.log('Migrating notes table: adding sort_order column')
    db.run('ALTER TABLE notes ADD COLUMN sort_order INTEGER DEFAULT 0')
  }
  
  // Create notes table if it doesn't exist (for new databases)
  db.run(`
    -- Notes table
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      notebook_id TEXT,
      folder_id TEXT,
      is_pinned INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      summary TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE SET NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    )
  `)
  
  db.run(`
    -- Tags table
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )
  `)
  
  db.run(`
    -- Note-Tags junction table
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `)
  
  db.run(`
    -- Sync history table
    CREATE TABLE IF NOT EXISTS sync_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      files_count INTEGER DEFAULT 0,
      synced_at TEXT NOT NULL
    )
  `)
  
  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_notes_notebook_id ON notes(notebook_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_notes_sort_order ON notes(sort_order)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_folders_notebook_id ON folders(notebook_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON folders(sort_order)`)
  
  // Insert default notebook if none exists
  const result = db.exec('SELECT COUNT(*) as count FROM notebooks')
  const count = result[0]?.values[0]?.[0] as number || 0
  
  if (count === 0) {
    const now = new Date().toISOString()
    const id = randomUUID()
    db.run('INSERT INTO notebooks (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', 
      [id, '默认笔记本', now, now])
  }
  
  // Save database
  saveDatabase()
}

/**
 * 关闭数据库连接
 * @description 保存数据库并释放资源
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}

/**
 * 执行查询并返回所有结果
 * @param {string} sql - SQL 查询语句
 * @param {any[]} [params=[]] - 查询参数 (用于参数化查询，防止 SQL 注入)
 * @returns {any[]} 查询结果数组，每个元素是一行数据的对象
 * @throws {Error} 数据库未初始化时抛出错误
 * 
 * @example
 * ```ts
 * const notes = queryAll('SELECT * FROM notes WHERE notebook_id = ?', [notebookId])
 * ```
 */
export function queryAll(sql: string, params: any[] = []): any[] {
  if (!db) throw new Error('Database not initialized')
  
  const stmt = db.prepare(sql)
  stmt.bind(params)
  
  const results: any[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row)
  }
  stmt.free()
  
  return results
}

/**
 * 执行查询并返回第一条结果
 * @param {string} sql - SQL 查询语句
 * @param {any[]} [params=[]] - 查询参数
 * @returns {any | null} 第一条结果或 null
 * 
 * @example
 * ```ts
 * const note = queryOne('SELECT * FROM notes WHERE id = ?', [noteId])
 * ```
 */
export function queryOne(sql: string, params: any[] = []): any | null {
  const results = queryAll(sql, params)
  return results[0] || null
}

/**
 * 执行写入操作 (INSERT/UPDATE/DELETE)
 * @param {string} sql - SQL 语句
 * @param {any[]} [params=[]] - 查询参数
 * @throws {Error} 数据库未初始化时抛出错误
 * 
 * @example
 * ```ts
 * runQuery('INSERT INTO notes (id, title) VALUES (?, ?)', [id, title])
 * runQuery('UPDATE notes SET title = ? WHERE id = ?', [newTitle, id])
 * runQuery('DELETE FROM notes WHERE id = ?', [id])
 * ```
 */
export function runQuery(sql: string, params: any[] = []): void {
  if (!db) throw new Error('Database not initialized')
  db.run(sql, params)
  saveDatabase()
}
