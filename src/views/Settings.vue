<template>
  <div class="settings-page">
    <header class="settings-header">
      <button class="btn btn-ghost" @click="router.push('/')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        返回
      </button>
      <h1>设置</h1>
    </header>
    
    <div class="settings-content">
      <!-- Appearance Settings -->
      <section class="settings-section">
        <h2>外观</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label>深色模式</label>
            <p>启用深色主题</p>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="darkMode" @change="handleDarkModeChange">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label>字体大小</label>
            <p>编辑器字体大小</p>
          </div>
          <select v-model="fontSize" @change="handleFontSizeChange" class="select">
            <option :value="12">12px</option>
            <option :value="14">14px</option>
            <option :value="16">16px</option>
            <option :value="18">18px</option>
            <option :value="20">20px</option>
          </select>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label>编辑器模式</label>
            <p>选择编辑器显示模式</p>
          </div>
          <select v-model="editorMode" @change="handleEditorModeChange" class="select">
            <option value="wysiwyg">所见即所得</option>
            <option value="split">分屏预览</option>
            <option value="preview">仅预览</option>
          </select>
        </div>
      </section>
      
      <!-- Editor Settings -->
      <section class="settings-section">
        <h2>编辑器</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label>自动保存</label>
            <p>自动保存笔记内容</p>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="autoSave" @change="handleAutoSaveChange">
            <span class="slider"></span>
          </label>
        </div>
      </section>
      
      <!-- AI Settings -->
      <section class="settings-section">
        <h2>AI 设置</h2>
        <div class="setting-item vertical">
          <div class="setting-info">
            <label>OpenAI API Key</label>
            <p>用于智能摘要、标签生成等AI功能</p>
          </div>
          <input 
            type="password" 
            v-model="aiApiKey" 
            class="input" 
            placeholder="sk-..."
          >
        </div>
        <div class="setting-item vertical">
          <div class="setting-info">
            <label>API 基础URL</label>
            <p>OpenAI API 端点地址</p>
          </div>
          <input 
            type="text" 
            v-model="aiBaseUrl" 
            class="input" 
            placeholder="https://api.openai.com/v1"
          >
        </div>
        <div class="setting-item vertical">
          <div class="setting-info">
            <label>模型</label>
            <p>选择使用的AI模型</p>
          </div>
          <select v-model="aiModel" class="select">
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-4o">GPT-4o</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="saveAISettings" :disabled="savingAI">
          {{ savingAI ? '保存中...' : '保存 AI 设置' }}
        </button>
      </section>
      
      <!-- GitHub Sync Settings -->
      <section class="settings-section">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitHub 同步
        </h2>
        
        <!-- 已登录状态 -->
        <div v-if="githubUser" class="github-logged-in">
          <div class="user-info">
            <img :src="githubUser.avatar_url" :alt="githubUser.login" class="avatar">
            <div class="user-details">
              <span class="user-name">{{ githubUser.name || githubUser.login }}</span>
              <span class="user-login">@{{ githubUser.login }}</span>
            </div>
            <button class="btn btn-ghost btn-sm" @click="handleLogout">退出登录</button>
          </div>
          
          <!-- 同步状态 -->
          <div class="sync-info">
            <div class="sync-status-bar" :class="syncStatus.status">
              <span class="status-icon">
                <svg v-if="syncStatus.status === 'syncing'" class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                <svg v-else-if="syncStatus.status === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <svg v-else-if="syncStatus.status === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </span>
              <span class="status-text">
                {{ syncStatus.status === 'syncing' ? '同步中...' : 
                   syncStatus.status === 'success' ? '同步成功' :
                   syncStatus.status === 'error' ? '同步失败' : '等待同步' }}
              </span>
              <span v-if="syncStatus.lastSync" class="last-sync">
                上次同步: {{ formatTime(syncStatus.lastSync) }}
              </span>
            </div>
            
            <div v-if="syncStatus.message && syncStatus.status !== 'idle'" class="sync-message" :class="syncStatus.status">
              {{ syncStatus.message }}
            </div>
          </div>
          
          <!-- 自动同步设置 -->
          <div class="setting-item">
            <div class="setting-info">
              <label>自动同步</label>
              <p>笔记修改后自动同步到 GitHub</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="autoSyncEnabled" @change="handleAutoSyncChange">
              <span class="slider"></span>
            </label>
          </div>
          
          <div class="setting-item" v-if="autoSyncEnabled">
            <div class="setting-info">
              <label>同步间隔</label>
              <p>自动同步的时间间隔</p>
            </div>
            <select v-model="syncInterval" @change="handleSyncIntervalChange" class="select">
              <option :value="1">1 分钟</option>
              <option :value="5">5 分钟</option>
              <option :value="10">10 分钟</option>
              <option :value="30">30 分钟</option>
              <option :value="60">1 小时</option>
            </select>
          </div>
          
          <!-- 同步按钮 -->
          <div class="setting-actions">
            <button 
              class="btn btn-primary" 
              @click="handleSync" 
              :disabled="syncStatus.status === 'syncing'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              {{ syncStatus.status === 'syncing' ? '同步中...' : '立即同步' }}
            </button>
            <button 
              class="btn btn-secondary" 
              @click="handlePull" 
              :disabled="pulling"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              {{ pulling ? '拉取中...' : '从 GitHub 拉取' }}
            </button>
          </div>
          
          <!-- 仓库信息 -->
          <div class="repo-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
            <a :href="`https://github.com/${githubUser.login}/ai-note-sync`" target="_blank">
              {{ githubUser.login }}/ai-note-sync
            </a>
          </div>
        </div>
        
        <!-- 未登录状态 -->
        <div v-else class="github-login">
          <div class="login-intro">
            <p>登录 GitHub 后，您的笔记和配置将自动同步到私有仓库。</p>
            <ul>
              <li>✓ 笔记内容自动备份</li>
              <li>✓ 多设备数据同步</li>
              <li>✓ 配置和标签同步</li>
              <li>✓ 支持定时自动同步</li>
            </ul>
          </div>
          
          <div class="login-steps">
            <div class="step">
              <span class="step-number">1</span>
              <div class="step-content">
                <p>点击下方按钮，在浏览器中创建 GitHub Token</p>
                <button class="btn btn-primary" @click="handleStartLogin">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  创建 GitHub Token
                </button>
              </div>
            </div>
            
            <div class="step">
              <span class="step-number">2</span>
              <div class="step-content">
                <p>复制生成的 Token 并粘贴到下方</p>
                <div class="token-input-group">
                  <input 
                    type="password" 
                    v-model="tokenInput" 
                    class="input" 
                    placeholder="ghp_xxxxxxxxxxxx"
                  >
                  <button 
                    class="btn btn-primary" 
                    @click="handleLoginWithToken" 
                    :disabled="!tokenInput || loggingIn"
                  >
                    {{ loggingIn ? '登录中...' : '登录' }}
                  </button>
                </div>
                <p v-if="loginError" class="error-message">{{ loginError }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- About -->
      <section class="settings-section">
        <h2>关于</h2>
        <div class="about-info">
          <p><strong>AI Note Assistant</strong></p>
          <p>版本: 1.0.0</p>
          <p>一款基于 Electron 的跨平台桌面笔记应用，集成 AI 能力和 GitHub 同步功能。</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { globalModal } from '@/composables/useModal'

const router = useRouter()
const settingsStore = useSettingsStore()

// Appearance
const darkMode = ref(false)
const fontSize = ref(14)
const editorMode = ref<'wysiwyg' | 'split' | 'preview'>('split')
const autoSave = ref(true)

// AI
const aiApiKey = ref('')
const aiBaseUrl = ref('https://api.openai.com/v1')
const aiModel = ref('gpt-3.5-turbo')
const savingAI = ref(false)

// GitHub
interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

interface SyncStatus {
  lastSync: string | null
  status: 'idle' | 'syncing' | 'success' | 'error'
  message: string
  autoSyncEnabled: boolean
  syncInterval: number
}

const githubUser = ref<GitHubUser | null>(null)
const syncStatus = ref<SyncStatus>({
  lastSync: null,
  status: 'idle',
  message: '',
  autoSyncEnabled: false,
  syncInterval: 5
})
const autoSyncEnabled = ref(false)
const syncInterval = ref(5)
const tokenInput = ref('')
const loggingIn = ref(false)
const loginError = ref('')
const pulling = ref(false)

let statusPollTimer: number | null = null

onMounted(async () => {
  await settingsStore.loadSettings()
  
  darkMode.value = settingsStore.darkMode
  fontSize.value = settingsStore.fontSize
  editorMode.value = settingsStore.editorMode
  autoSave.value = settingsStore.autoSave
  
  aiApiKey.value = settingsStore.aiApiKey
  aiBaseUrl.value = settingsStore.aiBaseUrl
  aiModel.value = settingsStore.aiModel
  
  // 加载 GitHub 状态
  await loadGitHubStatus()
  
  // 定时刷新同步状态
  statusPollTimer = window.setInterval(loadSyncStatus, 5000)
})

onUnmounted(() => {
  if (statusPollTimer) {
    clearInterval(statusPollTimer)
  }
})

async function loadGitHubStatus() {
  try {
    githubUser.value = await window.electronAPI.github.getUser()
    await loadSyncStatus()
  } catch (error) {
    console.error('Failed to load GitHub status:', error)
  }
}

async function loadSyncStatus() {
  try {
    const status = await window.electronAPI.github.getSyncStatus()
    syncStatus.value = status
    autoSyncEnabled.value = status.autoSyncEnabled
    syncInterval.value = status.syncInterval
  } catch (error) {
    console.error('Failed to load sync status:', error)
  }
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Appearance handlers
async function handleDarkModeChange() {
  await settingsStore.setDarkMode(darkMode.value)
}

async function handleFontSizeChange() {
  await settingsStore.setFontSize(fontSize.value)
}

async function handleEditorModeChange() {
  await settingsStore.setEditorMode(editorMode.value)
}

async function handleAutoSaveChange() {
  await settingsStore.setAutoSave(autoSave.value)
}

// AI handlers
async function saveAISettings() {
  savingAI.value = true
  try {
    await settingsStore.setAISettings(aiApiKey.value, aiModel.value, aiBaseUrl.value)
    await globalModal.success('AI 设置已保存')
  } catch (error: any) {
    await globalModal.alert(`保存失败: ${error.message}`, '错误')
  } finally {
    savingAI.value = false
  }
}

// GitHub handlers
async function handleStartLogin() {
  try {
    await window.electronAPI.github.startLogin()
  } catch (error: any) {
    loginError.value = error.message
  }
}

async function handleLoginWithToken() {
  if (!tokenInput.value) return
  
  loggingIn.value = true
  loginError.value = ''
  
  try {
    const result = await window.electronAPI.github.loginWithToken(tokenInput.value)
    
    if (result.success && result.user) {
      githubUser.value = result.user
      tokenInput.value = ''
      await loadSyncStatus()
    } else {
      loginError.value = result.error || '登录失败'
    }
  } catch (error: any) {
    loginError.value = error.message || '登录失败'
  } finally {
    loggingIn.value = false
  }
}

async function handleLogout() {
  const confirmed = await globalModal.confirm('确定要退出 GitHub 登录吗？')
  if (!confirmed) return
  
  try {
    await window.electronAPI.github.logout()
    githubUser.value = null
    syncStatus.value = {
      lastSync: null,
      status: 'idle',
      message: '',
      autoSyncEnabled: false,
      syncInterval: 5
    }
  } catch (error: any) {
    await globalModal.alert(`退出失败: ${error.message}`, '错误')
  }
}

async function handleSync() {
  try {
    syncStatus.value.status = 'syncing'
    syncStatus.value.message = '正在同步...'
    
    const result = await window.electronAPI.github.sync()
    
    syncStatus.value.status = result.success ? 'success' : 'error'
    syncStatus.value.message = result.message
    
    if (result.success) {
      await loadSyncStatus()
    }
  } catch (error: any) {
    syncStatus.value.status = 'error'
    syncStatus.value.message = error.message
  }
}

async function handlePull() {
  pulling.value = true
  
  try {
    const result = await window.electronAPI.github.pull()
    
    if (result.success) {
      await globalModal.success(`拉取成功：${result.newNotes} 个新笔记，${result.updatedNotes} 个更新`, '同步成功')
    } else {
      await globalModal.alert(`拉取失败: ${result.message}`, '错误')
    }
  } catch (error: any) {
    await globalModal.alert(`拉取失败: ${error.message}`, '错误')
  } finally {
    pulling.value = false
  }
}

async function handleAutoSyncChange() {
  try {
    if (autoSyncEnabled.value) {
      await window.electronAPI.github.startAutoSync()
    } else {
      await window.electronAPI.github.stopAutoSync()
    }
  } catch (error: any) {
    await globalModal.alert(`设置失败: ${error.message}`, '错误')
    autoSyncEnabled.value = !autoSyncEnabled.value
  }
}

async function handleSyncIntervalChange() {
  try {
    await window.electronAPI.github.setSyncInterval(syncInterval.value)
  } catch (error: any) {
    await globalModal.alert(`设置失败: ${error.message}`, '错误')
  }
}
</script>

<style lang="scss" scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  // macOS 窗口控制按钮区域预留空间
  padding-top: calc(var(--titlebar-area-height) + 16px);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  -webkit-app-region: drag;
  
  button {
    -webkit-app-region: no-drag;
  }
  
  h1 {
    font-size: 20px;
    font-weight: 600;
  }
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.settings-section {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 20px;
  
  h2 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-light);
    display: flex;
    align-items: center;
  }
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
  
  &:last-of-type {
    border-bottom: none;
  }
  
  &.vertical {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .setting-info {
    label {
      display: block;
      font-weight: 500;
      margin-bottom: 2px;
    }
    
    p {
      font-size: 12px;
      color: var(--text-secondary);
    }
  }
  
  .select {
    width: 150px;
  }
  
  .input {
    width: 100%;
  }
}

.setting-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
  
  .btn {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

// GitHub 登录相关样式
.github-logged-in {
  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
    }
    
    .user-details {
      flex: 1;
      
      .user-name {
        display: block;
        font-weight: 600;
        font-size: 16px;
      }
      
      .user-login {
        display: block;
        font-size: 13px;
        color: var(--text-secondary);
      }
    }
  }
  
  .sync-info {
    margin-bottom: 16px;
  }
  
  .sync-status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    
    .status-icon {
      display: flex;
      align-items: center;
      
      svg {
        color: var(--text-secondary);
      }
    }
    
    .status-text {
      font-weight: 500;
    }
    
    .last-sync {
      margin-left: auto;
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    &.syncing {
      .status-icon svg {
        color: var(--primary);
      }
    }
    
    &.success {
      .status-icon svg {
        color: var(--success);
      }
    }
    
    &.error {
      .status-icon svg {
        color: var(--error);
      }
    }
  }
  
  .sync-message {
    margin-top: 8px;
    padding: 12px;
    border-radius: var(--radius-md);
    font-size: 14px;
    
    &.success {
      background: rgba(34, 197, 94, 0.1);
      color: var(--success);
    }
    
    &.error {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error);
    }
  }
  
  .repo-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    font-size: 14px;
    
    a {
      color: var(--primary);
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.github-login {
  .login-intro {
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: 20px;
    
    p {
      margin-bottom: 12px;
      color: var(--text-secondary);
    }
    
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      
      li {
        padding: 4px 0;
        font-size: 14px;
      }
    }
  }
  
  .login-steps {
    .step {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      
      .step-number {
        width: 28px;
        height: 28px;
        background: var(--primary);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        flex-shrink: 0;
      }
      
      .step-content {
        flex: 1;
        
        p {
          margin-bottom: 12px;
          color: var(--text-secondary);
        }
        
        .btn {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }
    }
    
    .token-input-group {
      display: flex;
      gap: 12px;
      
      .input {
        flex: 1;
      }
    }
    
    .error-message {
      color: var(--error);
      font-size: 13px;
      margin-top: 8px;
    }
  }
}

.about-info {
  p {
    margin-bottom: 8px;
    color: var(--text-secondary);
    
    &:first-child {
      color: var(--text-primary);
      font-size: 16px;
    }
  }
}

// Switch toggle
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
    
    &:checked + .slider {
      background-color: var(--primary);
      
      &::before {
        transform: translateX(22px);
      }
    }
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--border-medium);
    transition: var(--transition-fast);
    border-radius: var(--radius-full);
    
    &::before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: var(--transition-fast);
      border-radius: 50%;
    }
  }
}

// 旋转动画
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
