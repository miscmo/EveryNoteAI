import { ref, reactive } from 'vue'

export interface ModalOptions {
  title?: string
  message: string
  type?: 'default' | 'confirm' | 'warning' | 'danger' | 'success' | 'info'
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
}

interface ModalState {
  visible: boolean
  title?: string
  message: string
  type: 'default' | 'confirm' | 'warning' | 'danger' | 'success' | 'info'
  confirmText: string
  cancelText: string
  showCancel: boolean
  resolve: ((value: boolean) => void) | null
}

const modalState = reactive<ModalState>({
  visible: false,
  title: undefined,
  message: '',
  type: 'default',
  confirmText: '确定',
  cancelText: '取消',
  showCancel: true,
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
      modalState.resolve = resolve
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

  function handleConfirm() {
    modalState.visible = false
    modalState.resolve?.(true)
    modalState.resolve = null
  }

  function handleCancel() {
    modalState.visible = false
    modalState.resolve?.(false)
    modalState.resolve = null
  }

  function handleClose() {
    modalState.visible = false
    modalState.resolve?.(false)
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
  state: modalInstance.modalState,
  handleConfirm: modalInstance.handleConfirm,
  handleCancel: modalInstance.handleCancel,
  handleClose: modalInstance.handleClose
}
