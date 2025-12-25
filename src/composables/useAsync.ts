import { ref, computed } from 'vue'
import { useToast } from './useToast'

export interface AsyncOptions<T> {
  /** 立即执行 */
  immediate?: boolean
  /** 成功回调 */
  onSuccess?: (data: T) => void
  /** 失败回调 */
  onError?: (error: Error) => void
  /** 重试次数 */
  retryCount?: number
  /** 重试延迟（毫秒） */
  retryDelay?: number
  /** 显示 Toast 通知 */
  showToast?: boolean
  /** 成功提示 */
  successMessage?: string
  /** 失败提示 */
  errorMessage?: string
}

export function useAsync<T, P extends any[] = []>(
  asyncFn: (...args: P) => Promise<T>,
  options: AsyncOptions<T> = {}
) {
  const {
    immediate = false,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000,
    showToast = false,
    successMessage,
    errorMessage
  } = options

  const toast = useToast()
  
  const data = ref<T | null>(null) as { value: T | null }
  const error = ref<Error | null>(null)
  const loading = ref(false)
  const retries = ref(0)

  const isError = computed(() => error.value !== null)
  const isSuccess = computed(() => data.value !== null && !error.value)

  async function execute(...args: P): Promise<T | null> {
    loading.value = true
    error.value = null
    retries.value = 0

    const attemptExecution = async (): Promise<T> => {
      try {
        const result = await asyncFn(...args)
        data.value = result
        
        if (showToast && successMessage) {
          toast.success(successMessage)
        }
        
        onSuccess?.(result)
        return result
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        
        // Retry logic
        if (retries.value < retryCount) {
          retries.value++
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return attemptExecution()
        }
        
        error.value = e
        
        if (showToast) {
          toast.error(errorMessage || e.message || '操作失败')
        }
        
        onError?.(e)
        throw e
      }
    }

    try {
      return await attemptExecution()
    } catch {
      return null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    data.value = null
    error.value = null
    loading.value = false
    retries.value = 0
  }

  // Immediate execution
  if (immediate) {
    execute(...([] as unknown as P))
  }

  return {
    data,
    error,
    loading,
    retries,
    isError,
    isSuccess,
    execute,
    reset
  }
}

/**
 * 带有自动重试的 fetch 封装
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit & { retries?: number; retryDelay?: number } = {}
): Promise<T> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options
  
  let lastError: Error | null = null
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, fetchOptions)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)))
      }
    }
  }
  
  throw lastError
}

/**
 * 防抖执行异步函数
 */
export function useDebouncedAsync<T, P extends any[]>(
  asyncFn: (...args: P) => Promise<T>,
  delay: number = 300
) {
  const { data, error, loading, execute, reset } = useAsync(asyncFn)
  let timeoutId: number | null = null

  function debouncedExecute(...args: P): Promise<T | null> {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(async () => {
        const result = await execute(...args)
        resolve(result)
      }, delay)
    })
  }

  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return {
    data,
    error,
    loading,
    execute: debouncedExecute,
    cancel,
    reset
  }
}
