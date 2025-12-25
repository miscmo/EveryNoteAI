import { ref, onMounted, onUnmounted, computed } from 'vue'

export interface KeyboardShortcut {
  /** 快捷键组合，如 'ctrl+s', 'cmd+shift+p' */
  key: string
  /** 描述 */
  description: string
  /** 回调函数 */
  handler: (event: KeyboardEvent) => void
  /** 是否阻止默认行为 */
  preventDefault?: boolean
  /** 是否在输入框中也触发 */
  enableInInput?: boolean
  /** 分组 */
  group?: string
}

interface ParsedShortcut {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  key: string
}

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

/**
 * 解析快捷键字符串
 */
function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.toLowerCase().split('+')
  
  return {
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    alt: parts.includes('alt') || parts.includes('option'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
    key: parts[parts.length - 1]
  }
}

/**
 * 检查事件是否匹配快捷键
 */
function matchShortcut(event: KeyboardEvent, parsed: ParsedShortcut): boolean {
  const eventKey = event.key.toLowerCase()
  
  // 处理 cmd/ctrl 的跨平台兼容
  const ctrlOrMeta = isMac ? event.metaKey : event.ctrlKey
  const expectedCtrlOrMeta = parsed.meta || parsed.ctrl
  
  return (
    ctrlOrMeta === expectedCtrlOrMeta &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift &&
    eventKey === parsed.key
  )
}

/**
 * 格式化快捷键显示
 */
export function formatShortcut(shortcut: string): string {
  const parts = shortcut.toLowerCase().split('+')
  const symbols: string[] = []
  
  for (const part of parts) {
    switch (part) {
      case 'ctrl':
      case 'control':
        symbols.push(isMac ? '⌃' : 'Ctrl')
        break
      case 'alt':
      case 'option':
        symbols.push(isMac ? '⌥' : 'Alt')
        break
      case 'shift':
        symbols.push(isMac ? '⇧' : 'Shift')
        break
      case 'meta':
      case 'cmd':
      case 'command':
        symbols.push(isMac ? '⌘' : 'Win')
        break
      case 'enter':
        symbols.push('↵')
        break
      case 'escape':
      case 'esc':
        symbols.push('Esc')
        break
      case 'backspace':
        symbols.push('⌫')
        break
      case 'delete':
        symbols.push('Del')
        break
      case 'tab':
        symbols.push('Tab')
        break
      case 'space':
        symbols.push('Space')
        break
      case 'arrowup':
        symbols.push('↑')
        break
      case 'arrowdown':
        symbols.push('↓')
        break
      case 'arrowleft':
        symbols.push('←')
        break
      case 'arrowright':
        symbols.push('→')
        break
      default:
        symbols.push(part.toUpperCase())
    }
  }
  
  return symbols.join(isMac ? '' : '+')
}

/**
 * 全局快捷键注册表
 */
const globalShortcuts = ref<Map<string, KeyboardShortcut>>(new Map())

/**
 * 注册全局快捷键
 */
export function registerGlobalShortcut(shortcut: KeyboardShortcut) {
  globalShortcuts.value.set(shortcut.key, shortcut)
  return () => {
    globalShortcuts.value.delete(shortcut.key)
  }
}

/**
 * 注销全局快捷键
 */
export function unregisterGlobalShortcut(key: string) {
  globalShortcuts.value.delete(key)
}

/**
 * 获取所有已注册的快捷键
 */
export function getRegisteredShortcuts(): KeyboardShortcut[] {
  return Array.from(globalShortcuts.value.values())
}

/**
 * 按分组获取快捷键
 */
export function getShortcutsByGroup(): Record<string, KeyboardShortcut[]> {
  const groups: Record<string, KeyboardShortcut[]> = {}
  
  for (const shortcut of globalShortcuts.value.values()) {
    const group = shortcut.group || '其他'
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(shortcut)
  }
  
  return groups
}

/**
 * 全局键盘事件处理器
 */
function handleGlobalKeydown(event: KeyboardEvent) {
  // 检查是否在输入框中
  const target = event.target as HTMLElement
  const isInput = target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.isContentEditable
  
  for (const shortcut of globalShortcuts.value.values()) {
    const parsed = parseShortcut(shortcut.key)
    
    if (matchShortcut(event, parsed)) {
      // 如果在输入框中且不允许在输入框中触发，跳过
      if (isInput && !shortcut.enableInInput) {
        continue
      }
      
      if (shortcut.preventDefault !== false) {
        event.preventDefault()
      }
      
      shortcut.handler(event)
      return
    }
  }
}

// 初始化全局监听器
let isGlobalListenerInitialized = false

export function initGlobalKeyboardListener() {
  if (isGlobalListenerInitialized) return
  
  document.addEventListener('keydown', handleGlobalKeydown)
  isGlobalListenerInitialized = true
}

export function destroyGlobalKeyboardListener() {
  document.removeEventListener('keydown', handleGlobalKeydown)
  isGlobalListenerInitialized = false
}

/**
 * 组件级快捷键 Hook
 */
export function useKeyboard(shortcuts: KeyboardShortcut[]) {
  const activeShortcuts = ref<KeyboardShortcut[]>([])
  
  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable
    
    for (const shortcut of activeShortcuts.value) {
      const parsed = parseShortcut(shortcut.key)
      
      if (matchShortcut(event, parsed)) {
        if (isInput && !shortcut.enableInInput) {
          continue
        }
        
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }
        
        shortcut.handler(event)
        return
      }
    }
  }
  
  onMounted(() => {
    activeShortcuts.value = shortcuts
    document.addEventListener('keydown', handleKeydown)
  })
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
  
  function addShortcut(shortcut: KeyboardShortcut) {
    activeShortcuts.value.push(shortcut)
  }
  
  function removeShortcut(key: string) {
    const index = activeShortcuts.value.findIndex(s => s.key === key)
    if (index > -1) {
      activeShortcuts.value.splice(index, 1)
    }
  }
  
  return {
    shortcuts: activeShortcuts,
    addShortcut,
    removeShortcut
  }
}

/**
 * 单个快捷键 Hook
 */
export function useHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options: Partial<Omit<KeyboardShortcut, 'key' | 'handler'>> = {}
) {
  const parsed = parseShortcut(key)
  
  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable
    
    if (isInput && !options.enableInInput) {
      return
    }
    
    if (matchShortcut(event, parsed)) {
      if (options.preventDefault !== false) {
        event.preventDefault()
      }
      handler(event)
    }
  }
  
  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}

/**
 * 常用快捷键常量
 */
export const SHORTCUTS = {
  // 文件操作
  SAVE: isMac ? 'cmd+s' : 'ctrl+s',
  NEW: isMac ? 'cmd+n' : 'ctrl+n',
  OPEN: isMac ? 'cmd+o' : 'ctrl+o',
  CLOSE: isMac ? 'cmd+w' : 'ctrl+w',
  
  // 编辑操作
  UNDO: isMac ? 'cmd+z' : 'ctrl+z',
  REDO: isMac ? 'cmd+shift+z' : 'ctrl+y',
  CUT: isMac ? 'cmd+x' : 'ctrl+x',
  COPY: isMac ? 'cmd+c' : 'ctrl+c',
  PASTE: isMac ? 'cmd+v' : 'ctrl+v',
  SELECT_ALL: isMac ? 'cmd+a' : 'ctrl+a',
  FIND: isMac ? 'cmd+f' : 'ctrl+f',
  REPLACE: isMac ? 'cmd+h' : 'ctrl+h',
  
  // 格式化
  BOLD: isMac ? 'cmd+b' : 'ctrl+b',
  ITALIC: isMac ? 'cmd+i' : 'ctrl+i',
  UNDERLINE: isMac ? 'cmd+u' : 'ctrl+u',
  
  // 导航
  SETTINGS: isMac ? 'cmd+,' : 'ctrl+,',
  SEARCH: isMac ? 'cmd+k' : 'ctrl+k',
  
  // 视图
  TOGGLE_SIDEBAR: isMac ? 'cmd+\\' : 'ctrl+\\',
  ZOOM_IN: isMac ? 'cmd+=' : 'ctrl+=',
  ZOOM_OUT: isMac ? 'cmd+-' : 'ctrl+-',
  ZOOM_RESET: isMac ? 'cmd+0' : 'ctrl+0',
} as const
