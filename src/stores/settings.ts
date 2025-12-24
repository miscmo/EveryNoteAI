import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const darkMode = ref(false)
  const fontSize = ref(14)
  const autoSave = ref(true)
  const autoSaveInterval = ref(3000)
  const editorMode = ref<'edit' | 'split' | 'preview'>('split')
  
  // AI Settings
  const aiApiKey = ref('')
  const aiModel = ref('gpt-3.5-turbo')
  const aiBaseUrl = ref('https://api.openai.com/v1')
  
  // GitHub Settings
  const githubToken = ref('')
  const githubOwner = ref('')
  const githubRepo = ref('')
  const lastSyncTime = ref<string | null>(null)

  async function loadSettings() {
    try {
      const settings = await window.electronAPI.settings.getAll()
      if (settings) {
        // Settings are stored as nested objects: { app: { darkMode: true }, openai: { apiKey: '...' } }
        darkMode.value = settings.app?.darkMode ?? false
        fontSize.value = settings.app?.fontSize ?? 14
        autoSave.value = settings.app?.autoSave ?? true
        autoSaveInterval.value = settings.app?.autoSaveInterval ?? 3000
        editorMode.value = settings.app?.editorMode ?? 'split'
        
        aiApiKey.value = settings.openai?.apiKey ?? ''
        aiModel.value = settings.openai?.model ?? 'gpt-3.5-turbo'
        aiBaseUrl.value = settings.openai?.baseUrl ?? 'https://api.openai.com/v1'
        
        githubToken.value = settings.github?.token ?? ''
        githubOwner.value = settings.github?.owner ?? ''
        githubRepo.value = settings.github?.repo ?? ''
        lastSyncTime.value = settings.github?.lastSync ?? null
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  async function setDarkMode(value: boolean) {
    darkMode.value = value
    await window.electronAPI.settings.set('app.darkMode', value)
  }

  async function setFontSize(value: number) {
    fontSize.value = value
    await window.electronAPI.settings.set('app.fontSize', value)
  }

  async function setAutoSave(value: boolean) {
    autoSave.value = value
    await window.electronAPI.settings.set('app.autoSave', value)
  }

  async function setEditorMode(value: 'edit' | 'split' | 'preview') {
    editorMode.value = value
    await window.electronAPI.settings.set('app.editorMode', value)
  }

  async function setAISettings(apiKey: string, model: string, baseUrl: string) {
    aiApiKey.value = apiKey
    aiModel.value = model
    aiBaseUrl.value = baseUrl
    
    await window.electronAPI.ai.setApiKey(apiKey)
    await window.electronAPI.settings.set('openai.model', model)
    await window.electronAPI.settings.set('openai.baseUrl', baseUrl)
  }

  async function setGitHubSettings(token: string, owner: string, repo: string) {
    githubToken.value = token
    githubOwner.value = owner
    githubRepo.value = repo
    
    await window.electronAPI.github.setToken(token)
    await window.electronAPI.github.setRepo(owner, repo)
  }

  return {
    darkMode,
    fontSize,
    autoSave,
    autoSaveInterval,
    editorMode,
    aiApiKey,
    aiModel,
    aiBaseUrl,
    githubToken,
    githubOwner,
    githubRepo,
    lastSyncTime,
    loadSettings,
    setDarkMode,
    setFontSize,
    setAutoSave,
    setEditorMode,
    setAISettings,
    setGitHubSettings
  }
})
