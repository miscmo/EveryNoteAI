import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Notebook {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export const useNotebooksStore = defineStore('notebooks', () => {
  const notebooks = ref<Notebook[]>([])
  const currentNotebookId = ref<string | null>(null)
  const loading = ref(false)

  const currentNotebook = computed(() => 
    notebooks.value.find(nb => nb.id === currentNotebookId.value)
  )

  async function fetchNotebooks() {
    loading.value = true
    try {
      notebooks.value = await window.electronAPI.notebook.getAll()
      if (notebooks.value.length > 0 && !currentNotebookId.value) {
        currentNotebookId.value = notebooks.value[0].id
      }
    } catch (error) {
      console.error('Failed to fetch notebooks:', error)
    } finally {
      loading.value = false
    }
  }

  async function createNotebook(name: string) {
    try {
      const notebook = await window.electronAPI.notebook.create(name)
      notebooks.value.unshift(notebook)
      return notebook
    } catch (error) {
      console.error('Failed to create notebook:', error)
      throw error
    }
  }

  async function updateNotebook(id: string, name: string) {
    try {
      await window.electronAPI.notebook.update(id, name)
      const index = notebooks.value.findIndex(nb => nb.id === id)
      if (index !== -1) {
        notebooks.value[index].name = name
        notebooks.value[index].updated_at = new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to update notebook:', error)
      throw error
    }
  }

  async function deleteNotebook(id: string) {
    try {
      await window.electronAPI.notebook.delete(id)
      const index = notebooks.value.findIndex(nb => nb.id === id)
      if (index !== -1) {
        notebooks.value.splice(index, 1)
      }
      if (currentNotebookId.value === id) {
        currentNotebookId.value = notebooks.value[0]?.id || null
      }
    } catch (error) {
      console.error('Failed to delete notebook:', error)
      throw error
    }
  }

  function setCurrentNotebook(id: string | null) {
    currentNotebookId.value = id
  }

  return {
    notebooks,
    currentNotebookId,
    currentNotebook,
    loading,
    fetchNotebooks,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    setCurrentNotebook
  }
})
