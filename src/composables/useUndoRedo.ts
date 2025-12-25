import { ref, computed, watch, type Ref } from 'vue'
import { useToast } from './useToast'

export interface UndoRedoOptions {
  /** 最大历史记录数 */
  maxHistory?: number
  /** 是否显示 Toast 提示 */
  showToast?: boolean
}

export interface HistoryItem<T> {
  state: T
  timestamp: number
  description?: string
}

/**
 * 通用撤销/重做 Hook
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UndoRedoOptions = {}
) {
  const { maxHistory = 50, showToast = true } = options
  const toast = useToast()

  const history = ref<HistoryItem<T>[]>([
    { state: structuredClone(initialState), timestamp: Date.now() }
  ]) as Ref<HistoryItem<T>[]>
  
  const currentIndex = ref(0)
  
  const currentState = computed(() => history.value[currentIndex.value]?.state)
  
  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(() => currentIndex.value < history.value.length - 1)
  
  const undoCount = computed(() => currentIndex.value)
  const redoCount = computed(() => history.value.length - 1 - currentIndex.value)

  /**
   * 记录新状态
   */
  function record(state: T, description?: string) {
    // 如果当前不在历史末尾，删除后面的记录
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }
    
    // 添加新记录
    history.value.push({
      state: structuredClone(state),
      timestamp: Date.now(),
      description
    })
    
    // 限制历史记录数量
    if (history.value.length > maxHistory) {
      history.value = history.value.slice(-maxHistory)
    }
    
    currentIndex.value = history.value.length - 1
  }

  /**
   * 撤销
   */
  function undo(): T | null {
    if (!canUndo.value) {
      if (showToast) {
        toast.info('没有可撤销的操作')
      }
      return null
    }
    
    currentIndex.value--
    const item = history.value[currentIndex.value]
    
    if (showToast && item.description) {
      toast.info(`已撤销: ${item.description}`)
    }
    
    return structuredClone(item.state)
  }

  /**
   * 重做
   */
  function redo(): T | null {
    if (!canRedo.value) {
      if (showToast) {
        toast.info('没有可重做的操作')
      }
      return null
    }
    
    currentIndex.value++
    const item = history.value[currentIndex.value]
    
    if (showToast && item.description) {
      toast.info(`已重做: ${item.description}`)
    }
    
    return structuredClone(item.state)
  }

  /**
   * 跳转到指定历史位置
   */
  function goto(index: number): T | null {
    if (index < 0 || index >= history.value.length) {
      return null
    }
    
    currentIndex.value = index
    return structuredClone(history.value[index].state)
  }

  /**
   * 清除历史记录
   */
  function clear(newState?: T) {
    const state = newState ?? currentState.value
    history.value = [{ state: structuredClone(state), timestamp: Date.now() }]
    currentIndex.value = 0
  }

  /**
   * 获取历史记录列表
   */
  function getHistory() {
    return history.value.map((item, index) => ({
      ...item,
      isCurrent: index === currentIndex.value
    }))
  }

  return {
    currentState,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    record,
    undo,
    redo,
    goto,
    clear,
    getHistory
  }
}

/**
 * 操作历史管理器 - 用于管理应用级别的操作历史
 */
export interface Action {
  id: string
  type: string
  description: string
  timestamp: number
  undo: () => Promise<void> | void
  redo: () => Promise<void> | void
}

const actionHistory = ref<Action[]>([])
const actionIndex = ref(-1)
const maxActions = 100

export function useActionHistory() {
  const toast = useToast()
  
  const canUndo = computed(() => actionIndex.value >= 0)
  const canRedo = computed(() => actionIndex.value < actionHistory.value.length - 1)

  /**
   * 记录一个可撤销的操作
   */
  function recordAction(action: Omit<Action, 'id' | 'timestamp'>) {
    // 如果当前不在历史末尾，删除后面的记录
    if (actionIndex.value < actionHistory.value.length - 1) {
      actionHistory.value = actionHistory.value.slice(0, actionIndex.value + 1)
    }
    
    const newAction: Action = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
    
    actionHistory.value.push(newAction)
    
    // 限制历史记录数量
    if (actionHistory.value.length > maxActions) {
      actionHistory.value = actionHistory.value.slice(-maxActions)
    }
    
    actionIndex.value = actionHistory.value.length - 1
  }

  /**
   * 撤销上一个操作
   */
  async function undoAction() {
    if (!canUndo.value) {
      toast.info('没有可撤销的操作')
      return
    }
    
    const action = actionHistory.value[actionIndex.value]
    
    try {
      await action.undo()
      actionIndex.value--
      toast.success(`已撤销: ${action.description}`)
    } catch (error) {
      toast.error('撤销失败')
      console.error('Undo failed:', error)
    }
  }

  /**
   * 重做下一个操作
   */
  async function redoAction() {
    if (!canRedo.value) {
      toast.info('没有可重做的操作')
      return
    }
    
    actionIndex.value++
    const action = actionHistory.value[actionIndex.value]
    
    try {
      await action.redo()
      toast.success(`已重做: ${action.description}`)
    } catch (error) {
      actionIndex.value--
      toast.error('重做失败')
      console.error('Redo failed:', error)
    }
  }

  /**
   * 清除历史
   */
  function clearHistory() {
    actionHistory.value = []
    actionIndex.value = -1
  }

  return {
    canUndo,
    canRedo,
    recordAction,
    undoAction,
    redoAction,
    clearHistory,
    history: actionHistory
  }
}
