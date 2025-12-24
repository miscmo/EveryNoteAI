import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

export class SimpleStore {
  private data: Record<string, any> = {}
  private filePath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    const configDir = join(userDataPath, 'config')
    
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true })
    }
    
    this.filePath = join(configDir, 'settings.json')
    this.load()
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const content = readFileSync(this.filePath, 'utf-8')
        this.data = JSON.parse(content)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      this.data = {}
    }
  }

  private save(): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  get(key: string, defaultValue?: any): any {
    const keys = key.split('.')
    let value: any = this.data
    
    for (const k of keys) {
      if (value === undefined || value === null) {
        return defaultValue
      }
      value = value[k]
    }
    
    return value !== undefined ? value : defaultValue
  }

  set(key: string, value: any): void {
    const keys = key.split('.')
    let obj = this.data
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!(k in obj) || typeof obj[k] !== 'object') {
        obj[k] = {}
      }
      obj = obj[k]
    }
    
    obj[keys[keys.length - 1]] = value
    this.save()
  }

  delete(key: string): void {
    const keys = key.split('.')
    let obj = this.data
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!(k in obj)) {
        return
      }
      obj = obj[k]
    }
    
    delete obj[keys[keys.length - 1]]
    this.save()
  }

  get store(): Record<string, any> {
    return { ...this.data }
  }

  clear(): void {
    this.data = {}
    this.save()
  }
}
