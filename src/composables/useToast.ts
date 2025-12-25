import { ref, type ComponentPublicInstance } from 'vue'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info' | 'loading'
  message: string
  description?: string
  duration?: number
  dismissible?: boolean
  action?: ToastAction
}

// Toast instance reference
const toastInstance = ref<ComponentPublicInstance | null>(null)

export function setToastInstance(instance: ComponentPublicInstance | null) {
  toastInstance.value = instance
}

export function useToast() {
  const show = (options: ToastOptions | string) => {
    if (!toastInstance.value) {
      console.warn('Toast instance not initialized')
      return ''
    }
    return (toastInstance.value as any).show(options)
  }
  
  const dismiss = (id: string) => {
    if (!toastInstance.value) return
    ;(toastInstance.value as any).dismiss(id)
  }
  
  const dismissAll = () => {
    if (!toastInstance.value) return
    ;(toastInstance.value as any).dismissAll()
  }
  
  const update = (id: string, options: Partial<ToastOptions>) => {
    if (!toastInstance.value) return
    ;(toastInstance.value as any).update(id, options)
  }
  
  const success = (message: string, options?: Partial<ToastOptions>) => {
    if (!toastInstance.value) {
      console.warn('Toast instance not initialized')
      return ''
    }
    return (toastInstance.value as any).success(message, options)
  }
  
  const error = (message: string, options?: Partial<ToastOptions>) => {
    if (!toastInstance.value) {
      console.warn('Toast instance not initialized')
      return ''
    }
    return (toastInstance.value as any).error(message, options)
  }
  
  const warning = (message: string, options?: Partial<ToastOptions>) => {
    if (!toastInstance.value) {
      console.warn('Toast instance not initialized')
      return ''
    }
    return (toastInstance.value as any).warning(message, options)
  }
  
  const info = (message: string, options?: Partial<ToastOptions>) => {
    if (!toastInstance.value) {
      console.warn('Toast instance not initialized')
      return ''
    }
    return (toastInstance.value as any).info(message, options)
  }
  
  const loading = (message: string, options?: Partial<ToastOptions>) => {
    if (!toastInstance.value) {
      console.warn('Toast instance not initialized')
      return ''
    }
    return (toastInstance.value as any).loading(message, options)
  }
  
  const promise = async <T>(
    promiseInstance: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((err: Error) => string)
    }
  ): Promise<T> => {
    if (!toastInstance.value) {
      console.warn('Toast instance not initialized')
      return promiseInstance
    }
    return (toastInstance.value as any).promise(promiseInstance, messages)
  }
  
  return {
    show,
    dismiss,
    dismissAll,
    update,
    success,
    error,
    warning,
    info,
    loading,
    promise
  }
}

// Export singleton for direct usage
export const toast = {
  get show() { return useToast().show },
  get dismiss() { return useToast().dismiss },
  get dismissAll() { return useToast().dismissAll },
  get update() { return useToast().update },
  get success() { return useToast().success },
  get error() { return useToast().error },
  get warning() { return useToast().warning },
  get info() { return useToast().info },
  get loading() { return useToast().loading },
  get promise() { return useToast().promise },
}
