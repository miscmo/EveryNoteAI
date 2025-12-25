import { reactive } from 'vue'

export interface ModalOptions {
  title?: string
  message: string
  type?: 'default' | 'confirm' | 'warning' | 'danger' | 'success' | 'info' | 'prompt'
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  // Prompt specific options
  inputLabel?: string
  inputPlaceholder?: string
  inputType?: string
  inputDefaultValue?: string
  inputValidator?: (value: string) => string | null
}

interface ModalState {
  visible: boolean
  title?: string
  message: string
  type: 'default' | 'confirm' | 'warning' | 'danger' | 'success' | 'info' | 'prompt'
  confirmText: string
  cancelText: string
  showCancel: boolean
  inputLabel?: string
  inputPlaceholder?: string
  inputType?: string
  inputDefaultValue?: string
  inputValidator?: (value: string) => string | null
  resolve: ((value: boolean | string | null) => void) | null
}

const modalState = reactive<ModalState>({
  visible: false,
  title: undefined,
  message: '',
  type: 'default',
  confirmText: '确定',
  cancelText: '取消',
  showCancel: true,
  inputLabel: undefined,
  inputPlaceholder: '',
  inputType: 'text',
  inputDefaultValue: '',
  inputValidator: undefined,
  resolve: null
})

export function useModal() {
  function showModal(options: ModalOptions): Promise<boolean> {
    return new Promise((resolve) => {
      modalState.visible = true
      modalState.title = options.title
      modalState.message = options.message
      modalState.type = options.type || 'default'
      modalState.confirmText = options.confirmText || '确定'
      modalState.cancelText = options.cancelText || '取消'
      modalState.showCancel = options.showCancel !== false
      modalState.inputLabel = options.inputLabel
      modalState.inputPlaceholder = options.inputPlaceholder || ''
      modalState.inputType = options.inputType || 'text'
      modalState.inputDefaultValue = options.inputDefaultValue || ''
      modalState.inputValidator = options.inputValidator
      modalState.resolve = resolve as (value: boolean | string | null) => void
    })
  }

  function confirm(message: string, title?: string): Promise<boolean> {
    return showModal({
      title: title || '确认',
      message,
      type: 'confirm',
      showCancel: true
    })
  }

  function alert(message: string, title?: string): Promise<boolean> {
    return showModal({
      title: title || '提示',
      message,
      type: 'info',
      showCancel: false
    })
  }

  function warning(message: string, title?: string): Promise<boolean> {
    return showModal({
      title: title || '警告',
      message,
      type: 'warning',
      showCancel: true
    })
  }

  function danger(message: string, title?: string): Promise<boolean> {
    return showModal({
      title: title || '危险操作',
      message,
      type: 'danger',
      showCancel: true
    })
  }

  function success(message: string, title?: string): Promise<boolean> {
    return showModal({
      title: title || '成功',
      message,
      type: 'success',
      showCancel: false
    })
  }

  /**
   * Show a prompt modal to get user input
   * @returns The input value if confirmed, null if cancelled
   */
  function prompt(options: {
    title?: string
    message?: string
    label?: string
    placeholder?: string
    type?: string
    defaultValue?: string
    validator?: (value: string) => string | null
  }): Promise<string | null> {
    return new Promise((resolve) => {
      modalState.visible = true
      modalState.title = options.title || '输入'
      modalState.message = options.message || ''
      modalState.type = 'prompt'
      modalState.confirmText = '确定'
      modalState.cancelText = '取消'
      modalState.showCancel = true
      modalState.inputLabel = options.label
      modalState.inputPlaceholder = options.placeholder || ''
      modalState.inputType = options.type || 'text'
      modalState.inputDefaultValue = options.defaultValue || ''
      modalState.inputValidator = options.validator
      modalState.resolve = resolve as (value: boolean | string | null) => void
    })
  }

  function handleConfirm(value?: string) {
    modalState.visible = false
    if (modalState.type === 'prompt') {
      modalState.resolve?.(value ?? null)
    } else {
      modalState.resolve?.(true)
    }
    modalState.resolve = null
  }

  function handleCancel() {
    modalState.visible = false
    if (modalState.type === 'prompt') {
      modalState.resolve?.(null)
    } else {
      modalState.resolve?.(false)
    }
    modalState.resolve = null
  }

  function handleClose() {
    modalState.visible = false
    if (modalState.type === 'prompt') {
      modalState.resolve?.(null)
    } else {
      modalState.resolve?.(false)
    }
    modalState.resolve = null
  }

  return {
    modalState,
    showModal,
    confirm,
    alert,
    warning,
    danger,
    success,
    prompt,
    handleConfirm,
    handleCancel,
    handleClose
  }
}

// 创建单例实例供全局使用
const modalInstance = useModal()

export const globalModal = {
  confirm: modalInstance.confirm,
  alert: modalInstance.alert,
  warning: modalInstance.warning,
  danger: modalInstance.danger,
  success: modalInstance.success,
  prompt: modalInstance.prompt,
  state: modalInstance.modalState,
  handleConfirm: modalInstance.handleConfirm,
  handleCancel: modalInstance.handleCancel,
  handleClose: modalInstance.handleClose
}
