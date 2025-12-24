import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Tag {
  id: string
  name: string
  created_at: string
}

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])
  const loading = ref(false)

  async function fetchTags() {
    loading.value = true
    try {
      tags.value = await window.electronAPI.tag.getAll()
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    } finally {
      loading.value = false
    }
  }

  async function createTag(name: string) {
    try {
      // Check if tag already exists
      const existing = tags.value.find(t => t.name.toLowerCase() === name.toLowerCase())
      if (existing) {
        return existing
      }
      const tag = await window.electronAPI.tag.create(name)
      tags.value.push(tag)
      return tag
    } catch (error) {
      console.error('Failed to create tag:', error)
      throw error
    }
  }

  async function updateTag(id: string, name: string) {
    try {
      await window.electronAPI.tag.update(id, name)
      const index = tags.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tags.value[index].name = name
      }
    } catch (error) {
      console.error('Failed to update tag:', error)
      throw error
    }
  }

  async function deleteTag(id: string) {
    try {
      await window.electronAPI.tag.delete(id)
      const index = tags.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tags.value.splice(index, 1)
      }
    } catch (error) {
      console.error('Failed to delete tag:', error)
      throw error
    }
  }

  async function addTagToNote(noteId: string, tagId: string) {
    try {
      await window.electronAPI.tag.addToNote(noteId, tagId)
    } catch (error) {
      console.error('Failed to add tag to note:', error)
      throw error
    }
  }

  async function removeTagFromNote(noteId: string, tagId: string) {
    try {
      await window.electronAPI.tag.removeFromNote(noteId, tagId)
    } catch (error) {
      console.error('Failed to remove tag from note:', error)
      throw error
    }
  }

  async function getNotesByTag(tagId: string) {
    try {
      return await window.electronAPI.tag.getNotesByTag(tagId)
    } catch (error) {
      console.error('Failed to get notes by tag:', error)
      return []
    }
  }

  function getTagById(id: string) {
    return tags.value.find(t => t.id === id)
  }

  function getTagByName(name: string) {
    return tags.value.find(t => t.name.toLowerCase() === name.toLowerCase())
  }

  return {
    tags,
    loading,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    addTagToNote,
    removeTagFromNote,
    getNotesByTag,
    getTagById,
    getTagByName
  }
})
