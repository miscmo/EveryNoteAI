<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="app-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3L2 12h3v9h6v-6h2v6h6v-9h3L12 3z"/>
        </svg>
        <span>AI笔记助手</span>
      </div>
    </div>
    
    <!-- Search -->
    <div class="sidebar-search">
      <div class="search-input-wrapper">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input 
          type="text" 
          v-model="searchQuery"
          class="search-input" 
          placeholder="搜索笔记..."
          @input="handleSearch"
        >
        <button v-if="searchQuery" class="btn btn-icon btn-ghost btn-xs" @click="clearSearch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="sidebar-content">
      <!-- Notebooks Tree -->
      <div class="sidebar-section">
        <div class="section-header">
          <span>笔记本</span>
          <div class="section-actions">
            <button class="btn btn-icon btn-ghost btn-sm" @click="showNewNotebookInput = true" title="新建笔记本">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- New Notebook Input -->
        <div v-if="showNewNotebookInput" class="new-item-input">
          <input 
            ref="newNotebookInputRef"
            v-model="newNotebookName"
            type="text"
            class="input"
            placeholder="笔记本名称"
            @keyup.enter="createNotebook"
            @keyup.escape="cancelNewNotebook"
            @blur="cancelNewNotebook"
          >
        </div>
        
        <!-- Notebook Tree -->
        <div class="tree-container">
          <div 
            v-for="notebook in notebooks" 
            :key="notebook.id"
            class="tree-node"
          >
            <!-- Notebook Item -->
            <div 
              class="tree-item notebook-item"
              :class="{ 
                active: currentNotebookId === notebook.id && !currentNoteId,
                expanded: expandedNotebooks.has(notebook.id),
                'drag-over': dragOverNotebook === notebook.id
              }"
              @click="toggleNotebook(notebook.id)"
              @contextmenu.prevent="showContextMenu($event, 'notebook', notebook)"
              @dragover.prevent="handleNotebookDragOver($event, notebook.id)"
              @dragleave="handleNotebookDragLeave"
              @drop="handleNotebookDrop($event, notebook.id)"
              :data-notebook-id="notebook.id"
            >
              <span class="tree-toggle" @click.stop="toggleNotebookExpand(notebook.id)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline :points="expandedNotebooks.has(notebook.id) ? '6 9 12 15 18 9' : '9 18 15 12 9 6'"/>
                </svg>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              <span v-if="editingItemId !== notebook.id" class="tree-label">{{ notebook.name }}</span>
              <input 
                v-else
                ref="editInputRef"
                v-model="editItemName"
                type="text"
                class="input input-sm tree-edit-input"
                @keyup.enter="saveItemName('notebook', notebook.id)"
                @keyup.escape="cancelEdit"
                @blur="saveItemName('notebook', notebook.id)"
                @click.stop
              >
              <span class="badge">{{ getNotebookItemsCount(notebook.id) }}</span>
            </div>
            
            <!-- Tree content under this notebook -->
            <div v-if="expandedNotebooks.has(notebook.id)" class="tree-children">
              <!-- New item input at notebook root level -->
              <div 
                v-if="newItemInput.visible && newItemInput.notebookId === notebook.id && !newItemInput.parentId" 
                class="new-item-input tree-new-item"
              >
                <svg v-if="newItemInput.type === 'note'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <input 
                  ref="newItemInputRef"
                  v-model="newItemInput.name"
                  type="text"
                  class="input input-sm"
                  :placeholder="newItemInput.type === 'note' ? '笔记名称' : '目录名称'"
                  @keyup.enter="confirmNewItem"
                  @keyup.escape="cancelNewItem"
                  @blur="confirmNewItem"
                >
              </div>
              
              <!-- Render tree recursively -->
              <TreeNode
                v-for="item in getNotebookTreeItems(notebook.id)"
                :key="item.id"
                :item="item"
                :notebook-id="notebook.id"
                :current-note-id="currentNoteId"
                :expanded-folders="expandedFolders"
                :editing-item-id="editingItemId"
                :edit-item-name="editItemName"
                :dragging-item="draggingItem"
                :new-item-input="newItemInput"
                @select-note="$emit('select-note', $event)"
                @toggle-folder="toggleFolderExpand"
                @context-menu="showContextMenu"
                @start-drag="onDragStart"
                @drag-over="onDragOver"
                @drop="onDrop"
                @drag-end="onDragEnd"
                @update-edit-name="editItemName = $event"
                @save-edit="saveItemName"
                @cancel-edit="cancelEdit"
                @update-new-item-name="newItemInput.name = $event"
                @confirm-new-item="confirmNewItem"
                @cancel-new-item="cancelNewItem"
              />
              
              <div v-if="getNotebookTreeItems(notebook.id).length === 0 && !newItemInput.visible" class="tree-empty">
                暂无内容
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tags -->
      <div class="sidebar-section">
        <div class="section-header">
          <span>标签</span>
          <div class="section-actions">
            <button class="btn btn-icon btn-ghost btn-sm" @click="showNewTagInput = true" title="新建标签">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- New Tag Input -->
        <div v-if="showNewTagInput" class="new-item-input">
          <input 
            ref="newTagInputRef"
            v-model="newTagName"
            type="text"
            class="input"
            placeholder="标签名称"
            @keyup.enter="createTag"
            @keyup.escape="cancelNewTag"
            @blur="cancelNewTag"
          >
        </div>
        
        <div 
          v-for="tag in tags" 
          :key="tag.id"
          class="sidebar-item tag-item"
          :class="{ active: selectedTagId === tag.id }"
          @click="selectTag(tag.id)"
          @contextmenu.prevent="showTagContextMenu($event, tag)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          <span v-if="editingTagId !== tag.id">{{ tag.name }}</span>
          <input 
            v-else
            ref="editTagInputRef"
            v-model="editTagName"
            type="text"
            class="input input-sm"
            @keyup.enter="saveTagName(tag.id)"
            @keyup.escape="cancelTagEdit"
            @blur="saveTagName(tag.id)"
            @click.stop
          >
        </div>
        <div v-if="tags.length === 0 && !showNewTagInput" class="empty-tags">
          暂无标签
        </div>
      </div>
    </div>
    
    <!-- Sidebar Footer: GitHub Status & Settings -->
    <div class="sidebar-footer">
      <!-- GitHub Sync Status -->
      <div v-if="githubUser" class="github-status" @click="$emit('open-settings')">
        <img :src="githubUser.avatar_url" :alt="githubUser.login" class="github-avatar">
        <div class="github-info">
          <span class="github-name">{{ githubUser.name || githubUser.login }}</span>
          <span class="sync-status" :class="syncStatus.status">
            <svg v-if="syncStatus.status === 'syncing'" class="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            <svg v-else-if="syncStatus.status === 'success'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <svg v-else-if="syncStatus.status === 'error'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
            </svg>
            {{ syncStatusText }}
          </span>
        </div>
        <button class="btn btn-icon btn-ghost btn-sm sync-btn" @click.stop="handleQuickSync" :disabled="syncStatus.status === 'syncing'" title="立即同步">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>
      
      <!-- Not logged in -->
      <div v-else class="github-login-hint" @click="$emit('open-settings')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        <span>登录 GitHub 同步</span>
      </div>
      
      <!-- Settings Button -->
      <button class="settings-btn" @click="$emit('open-settings')" title="设置">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span>设置</span>
      </button>
    </div>
    
    <!-- Context Menu -->
    <Teleport to="body">
      <div 
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
        @click.stop
      >
        <!-- Notebook Context Menu -->
        <template v-if="contextMenu.type === 'notebook'">
          <div class="context-menu-item" @click="createNoteInContext">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            新建笔记
          </div>
          <div class="context-menu-item" @click="createFolderInContext">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
            新建目录
          </div>
          <div class="context-menu-item" @click="startEdit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            重命名
          </div>
          <div class="context-menu-item danger" @click="deleteItem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除
          </div>
        </template>
        
        <!-- Folder Context Menu -->
        <template v-if="contextMenu.type === 'folder'">
          <div class="context-menu-item" @click="createNoteInContext">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            新建笔记
          </div>
          <div class="context-menu-item" @click="createFolderInContext">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
            新建子目录
          </div>
          <div class="context-menu-item" @click="startEdit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            重命名
          </div>
          <div class="context-menu-item danger" @click="deleteItem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除
          </div>
        </template>
        
        <!-- Note Context Menu -->
        <template v-if="contextMenu.type === 'note'">
          <div class="context-menu-item" @click="startNoteEdit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            重命名
          </div>
          <div class="context-menu-item" @click="toggleNotePin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            {{ (contextMenu.item as any)?.is_pinned ? '取消置顶' : '置顶' }}
          </div>
          <div class="context-menu-divider"></div>
          <div class="context-menu-item" @click="copyNote">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            复制笔记
          </div>
          <div class="context-menu-item" @click="showMoveNoteMenu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <polyline points="12 11 12 17"/>
              <polyline points="9 14 12 17 15 14"/>
            </svg>
            移动到...
          </div>
          <div class="context-menu-divider"></div>
          <div class="context-menu-item danger" @click="deleteItem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除
          </div>
        </template>
        
        <!-- Tag Context Menu -->
        <template v-if="contextMenu.type === 'tag'">
          <div class="context-menu-item" @click="startTagEdit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            重命名
          </div>
          <div class="context-menu-item danger" @click="deleteTag">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除
          </div>
        </template>
      </div>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import TreeNode from './TreeNode.vue'
import { globalModal } from '@/composables/useModal'
import type { Notebook } from '@/stores/notebooks'
import type { Folder } from '@/stores/folders'
import type { Tag } from '@/stores/tags'
import type { Note } from '@/stores/notes'

export interface TreeItem {
  id: string
  type: 'folder' | 'note'
  name: string
  notebook_id: string
  parent_id: string | null
  sort_order: number
  is_pinned?: number
  children?: TreeItem[]
}

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

interface Props {
  notebooks: Notebook[]
  folders: Folder[]
  currentNotebookId: string | null
  currentNoteId: string | null
  notes: Note[]
  tags: Tag[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select-notebook': [id: string]
  'select-note': [id: string]
  'create-notebook': [name: string]
  'create-note': [notebookId: string, folderId?: string, name?: string]
  'create-folder': [notebookId: string, parentId?: string, name?: string]
  'rename-notebook': [id: string, name: string]
  'rename-folder': [id: string, name: string]
  'rename-note': [id: string, name: string]
  'delete-notebook': [id: string]
  'delete-folder': [id: string]
  'delete-note': [id: string]
  'toggle-pin': [id: string]
  'move-note': [noteId: string, folderId: string | undefined, targetId: string | undefined, position: 'before' | 'after' | 'inside']
  'move-folder': [folderId: string, parentId: string | undefined, targetId: string | undefined, position: 'before' | 'after' | 'inside']
  'update-note-order': [items: { id: string; sort_order: number; folder_id?: string }[]]
  'update-folder-order': [items: { id: string; sort_order: number; parent_id?: string }[]]
  'select-tag': [id: string]
  'create-tag': [name: string]
  'rename-tag': [id: string, name: string]
  'delete-tag': [id: string]
  'open-settings': []
  'search': [query: string]
  'copy-note': [id: string]
  'move-note-to': [noteId: string]
}>()

// GitHub state
const githubUser = ref<GitHubUser | null>(null)
const syncStatus = ref<SyncStatus>({
  lastSync: null,
  status: 'idle',
  message: '',
  autoSyncEnabled: false,
  syncInterval: 5
})
let statusPollTimer: number | null = null

const syncStatusText = computed(() => {
  switch (syncStatus.value.status) {
    case 'syncing': return '同步中...'
    case 'success': return '已同步'
    case 'error': return '同步失败'
    default: return syncStatus.value.lastSync ? formatTime(syncStatus.value.lastSync) : '未同步'
  }
})

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

async function loadGitHubStatus() {
  try {
    githubUser.value = await window.electronAPI?.github?.getUser() || null
    if (githubUser.value) {
      const status = await window.electronAPI?.github?.getSyncStatus()
      if (status) {
        syncStatus.value = status
      }
    }
  } catch (error) {
    console.error('Failed to load GitHub status:', error)
  }
}

async function handleQuickSync() {
  if (syncStatus.value.status === 'syncing') return
  
  try {
    syncStatus.value.status = 'syncing'
    const result = await window.electronAPI?.github?.sync()
    if (result) {
      syncStatus.value.status = result.success ? 'success' : 'error'
      syncStatus.value.message = result.message
      if (result.success) {
        await loadGitHubStatus()
      }
    }
  } catch (error: any) {
    syncStatus.value.status = 'error'
    syncStatus.value.message = error.message
  }
}

// Search
const searchQuery = ref('')

// Debounced search - 300ms delay
const debouncedSearch = useDebounceFn((query: string) => {
  emit('search', query)
}, 300)

// Expanded state
const expandedNotebooks = ref<Set<string>>(new Set())
const expandedFolders = ref<Set<string>>(new Set())

// New notebook
const showNewNotebookInput = ref(false)
const newNotebookName = ref('')
const newNotebookInputRef = ref<HTMLInputElement | null>(null)

// New note/folder input state
const newItemInput = ref<{
  visible: boolean
  type: 'note' | 'folder'
  notebookId: string
  parentId?: string
  name: string
}>({
  visible: false,
  type: 'note',
  notebookId: '',
  parentId: undefined,
  name: ''
})
const newItemInputRef = ref<HTMLInputElement | null>(null)

// Edit state
const editingItemId = ref<string | null>(null)
const editItemName = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// Drag state
const draggingItem = ref<{ type: 'note' | 'folder'; id: string; notebookId: string } | null>(null)
const dragOverNotebook = ref<string | null>(null)

// Context menu
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  type: '' as 'notebook' | 'folder' | 'note' | 'tag',
  item: null as Notebook | Folder | Note | Tag | null,
  notebookId: '' as string
})

// Tag management
const showNewTagInput = ref(false)
const newTagName = ref('')
const newTagInputRef = ref<HTMLInputElement | null>(null)
const editingTagId = ref<string | null>(null)
const editTagName = ref('')
const editTagInputRef = ref<HTMLInputElement | null>(null)
const selectedTagId = ref<string | null>(null)

// Computed
function getNotebookItemsCount(notebookId: string): number {
  return props.notes.filter(n => n.notebook_id === notebookId).length
}

// Build tree structure for a notebook
function getNotebookTreeItems(notebookId: string): TreeItem[] {
  const rootFolders = props.folders
    .filter(f => f.notebook_id === notebookId && !f.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(f => buildFolderTree(f))
  
  const rootNotes = props.notes
    .filter(n => n.notebook_id === notebookId && !n.folder_id)
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned
      return a.sort_order - b.sort_order
    })
    .map(n => ({
      id: n.id,
      type: 'note' as const,
      name: n.title || '无标题',
      notebook_id: n.notebook_id,
      parent_id: null,
      sort_order: n.sort_order,
      is_pinned: n.is_pinned
    }))
  
  return [...rootFolders, ...rootNotes]
}

function buildFolderTree(folder: Folder): TreeItem {
  const childFolders = props.folders
    .filter(f => f.parent_id === folder.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(f => buildFolderTree(f))
  
  const childNotes = props.notes
    .filter(n => n.folder_id === folder.id)
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned
      return a.sort_order - b.sort_order
    })
    .map(n => ({
      id: n.id,
      type: 'note' as const,
      name: n.title || '无标题',
      notebook_id: n.notebook_id,
      parent_id: folder.id,
      sort_order: n.sort_order,
      is_pinned: n.is_pinned
    }))
  
  return {
    id: folder.id,
    type: 'folder',
    name: folder.name,
    notebook_id: folder.notebook_id,
    parent_id: folder.parent_id,
    sort_order: folder.sort_order,
    children: [...childFolders, ...childNotes]
  }
}

// Search
function handleSearch() {
  debouncedSearch(searchQuery.value)
}

function clearSearch() {
  searchQuery.value = ''
  emit('search', '')
}

// Notebook expand/collapse
function toggleNotebookExpand(notebookId: string) {
  if (expandedNotebooks.value.has(notebookId)) {
    expandedNotebooks.value.delete(notebookId)
  } else {
    expandedNotebooks.value.add(notebookId)
  }
}

function toggleNotebook(notebookId: string) {
  emit('select-notebook', notebookId)
  if (!expandedNotebooks.value.has(notebookId)) {
    expandedNotebooks.value.add(notebookId)
  }
}

// Folder expand/collapse
function toggleFolderExpand(folderId: string) {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId)
  } else {
    expandedFolders.value.add(folderId)
  }
}

// Create notebook
async function createNotebook() {
  if (newNotebookName.value.trim()) {
    emit('create-notebook', newNotebookName.value.trim())
    newNotebookName.value = ''
    showNewNotebookInput.value = false
  }
}

function cancelNewNotebook() {
  if (!newNotebookName.value.trim()) {
    showNewNotebookInput.value = false
  }
}

// Context menu
function showContextMenu(event: MouseEvent, type: 'notebook' | 'folder' | 'note', item: Notebook | Folder | Note, notebookId?: string) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type,
    item,
    notebookId: notebookId || (item as any).notebook_id || ''
  }
}

function hideContextMenu() {
  contextMenu.value.visible = false
}

function createNoteInContext() {
  const { type, item, notebookId } = contextMenu.value
  hideContextMenu()
  
  if (type === 'notebook') {
    showNewItemInput('note', (item as Notebook).id)
  } else if (type === 'folder') {
    showNewItemInput('note', notebookId, (item as Folder).id)
  }
}

function createFolderInContext() {
  const { type, item, notebookId } = contextMenu.value
  hideContextMenu()
  
  if (type === 'notebook') {
    showNewItemInput('folder', (item as Notebook).id)
  } else if (type === 'folder') {
    showNewItemInput('folder', notebookId, (item as Folder).id)
  }
}

function showNewItemInput(type: 'note' | 'folder', notebookId: string, parentId?: string) {
  newItemInput.value = {
    visible: true,
    type,
    notebookId,
    parentId,
    name: ''
  }
  // Expand notebook and parent folder
  expandedNotebooks.value.add(notebookId)
  if (parentId) {
    expandedFolders.value.add(parentId)
  }
  nextTick(() => {
    newItemInputRef.value?.focus()
  })
}

function confirmNewItem() {
  const { type, notebookId, parentId, name } = newItemInput.value
  if (name.trim()) {
    if (type === 'note') {
      emit('create-note', notebookId, parentId, name.trim())
    } else {
      emit('create-folder', notebookId, parentId, name.trim())
    }
  }
  cancelNewItem()
}

function cancelNewItem() {
  newItemInput.value = {
    visible: false,
    type: 'note',
    notebookId: '',
    parentId: undefined,
    name: ''
  }
}

function startEdit() {
  const { type, item } = contextMenu.value
  if (item) {
    editingItemId.value = item.id
    editItemName.value = (item as any).name || (item as any).title || ''
    hideContextMenu()
    nextTick(() => {
      editInputRef.value?.focus()
    })
  }
}

function saveItemName(type: string, id: string) {
  if (editItemName.value.trim() && editingItemId.value === id) {
    if (type === 'notebook') {
      emit('rename-notebook', id, editItemName.value.trim())
    } else if (type === 'folder') {
      emit('rename-folder', id, editItemName.value.trim())
    } else if (type === 'note') {
      emit('rename-note', id, editItemName.value.trim())
    }
  }
  editingItemId.value = null
}

function cancelEdit() {
  editingItemId.value = null
}

async function deleteItem() {
  const { type, item } = contextMenu.value
  if (!item) return
  
  if (type === 'notebook') {
    const confirmed = await globalModal.danger(
      `确定要删除笔记本"${(item as Notebook).name}"吗？笔记本中的所有内容也将被删除。`,
      '删除笔记本'
    )
    if (confirmed) {
      emit('delete-notebook', item.id)
    }
  } else if (type === 'folder') {
    const confirmed = await globalModal.danger(
      `确定要删除目录"${(item as Folder).name}"吗？该目录及其所有子目录和笔记都将被永久删除。`,
      '删除目录'
    )
    if (confirmed) {
      emit('delete-folder', item.id)
    }
  } else if (type === 'note') {
    const confirmed = await globalModal.danger(
      '确定要删除这个笔记吗？',
      '删除笔记'
    )
    if (confirmed) {
      emit('delete-note', item.id)
    }
  }
  hideContextMenu()
}

function toggleNotePin() {
  if (contextMenu.value.item && contextMenu.value.type === 'note') {
    emit('toggle-pin', contextMenu.value.item.id)
  }
  hideContextMenu()
}

// 笔记重命名
function startNoteEdit() {
  const { item } = contextMenu.value
  if (item && contextMenu.value.type === 'note') {
    editingItemId.value = item.id
    editItemName.value = (item as Note).title || ''
    hideContextMenu()
    nextTick(() => {
      editInputRef.value?.focus()
    })
  }
}

// 复制笔记
function copyNote() {
  if (contextMenu.value.item && contextMenu.value.type === 'note') {
    emit('copy-note', contextMenu.value.item.id)
  }
  hideContextMenu()
}

// 移动笔记
function showMoveNoteMenu() {
  if (contextMenu.value.item && contextMenu.value.type === 'note') {
    emit('move-note-to', contextMenu.value.item.id)
  }
  hideContextMenu()
}

// Tag management functions
function selectTag(id: string) {
  selectedTagId.value = id
  emit('select-tag', id)
}

async function createTag() {
  if (newTagName.value.trim()) {
    emit('create-tag', newTagName.value.trim())
    newTagName.value = ''
    showNewTagInput.value = false
  }
}

function cancelNewTag() {
  if (!newTagName.value.trim()) {
    showNewTagInput.value = false
  }
}

function showTagContextMenu(event: MouseEvent, tag: Tag) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type: 'tag',
    item: tag,
    notebookId: ''
  }
}

function startTagEdit() {
  const { item } = contextMenu.value
  if (item && contextMenu.value.type === 'tag') {
    editingTagId.value = item.id
    editTagName.value = (item as Tag).name
    hideContextMenu()
    nextTick(() => {
      editTagInputRef.value?.focus()
    })
  }
}

function saveTagName(id: string) {
  if (editTagName.value.trim() && editingTagId.value === id) {
    emit('rename-tag', id, editTagName.value.trim())
  }
  editingTagId.value = null
}

function cancelTagEdit() {
  editingTagId.value = null
}

async function deleteTag() {
  const { item } = contextMenu.value
  if (!item || contextMenu.value.type !== 'tag') return
  
  const confirmed = await globalModal.danger(
    `确定要删除标签"${(item as Tag).name}"吗？`,
    '删除标签'
  )
  if (confirmed) {
    emit('delete-tag', item.id)
  }
  hideContextMenu()
}

// Drag and drop
function onDragStart(event: DragEvent, type: 'note' | 'folder', id: string, notebookId: string) {
  draggingItem.value = { type, id, notebookId }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ type, id, notebookId }))
  }
}

function handleNotebookDragOver(event: DragEvent, notebookId: string) {
  if (!draggingItem.value) return
  event.preventDefault()
  dragOverNotebook.value = notebookId
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleNotebookDragLeave() {
  dragOverNotebook.value = null
}

function handleNotebookDrop(event: DragEvent, notebookId: string) {
  event.preventDefault()
  dragOverNotebook.value = null
  
  if (!draggingItem.value) return
  
  const { type, id } = draggingItem.value
  
  if (type === 'note') {
    emit('move-note', id, undefined, undefined, 'inside')
  } else if (type === 'folder') {
    emit('move-folder', id, undefined, undefined, 'inside')
  }
  
  draggingItem.value = null
}

function onDragOver(event: DragEvent, targetType: 'notebook' | 'folder' | 'note', targetId: string, position?: 'before' | 'after' | 'inside') {
  if (!draggingItem.value) return
  
  // Can't drop on itself
  if (draggingItem.value.id === targetId) return
  
  // Notes can be dropped on notebooks or folders
  // Folders can be dropped on notebooks or other folders (not on notes)
  if (draggingItem.value.type === 'folder' && targetType === 'note') return
  
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDrop(event: DragEvent, targetType: 'notebook' | 'folder' | 'note', targetId: string, position: 'before' | 'after' | 'inside' = 'inside') {
  event.preventDefault()
  if (!draggingItem.value) return
  
  const { type, id } = draggingItem.value
  
  if (type === 'note') {
    if (targetType === 'notebook') {
      // Move note to notebook root
      emit('move-note', id, undefined, undefined, 'inside')
    } else if (targetType === 'folder') {
      if (position === 'inside') {
        // Move note into folder
        emit('move-note', id, targetId, undefined, 'inside')
        expandedFolders.value.add(targetId)
      } else {
        // Reorder note relative to folder
        const folder = props.folders.find(f => f.id === targetId)
        emit('move-note', id, folder?.parent_id || undefined, targetId, position)
      }
    } else if (targetType === 'note') {
      // Reorder note relative to another note
      const targetNote = props.notes.find(n => n.id === targetId)
      emit('move-note', id, targetNote?.folder_id || undefined, targetId, position)
    }
  } else if (type === 'folder') {
    if (targetType === 'notebook') {
      // Move folder to notebook root
      emit('move-folder', id, undefined, undefined, 'inside')
    } else if (targetType === 'folder') {
      if (position === 'inside') {
        // Move folder into another folder
        emit('move-folder', id, targetId, undefined, 'inside')
        expandedFolders.value.add(targetId)
      } else {
        // Reorder folder relative to another folder
        const targetFolder = props.folders.find(f => f.id === targetId)
        emit('move-folder', id, targetFolder?.parent_id || undefined, targetId, position)
      }
    }
  }
  
  draggingItem.value = null
}

function onDragEnd() {
  draggingItem.value = null
  dragOverNotebook.value = null
}

// Watch for new notebook input
watch(showNewNotebookInput, (val) => {
  if (val) {
    nextTick(() => {
      newNotebookInputRef.value?.focus()
    })
  }
})

// Watch for new tag input
watch(showNewTagInput, (val) => {
  if (val) {
    nextTick(() => {
      newTagInputRef.value?.focus()
    })
  }
})

// Auto expand notebook when note is selected
watch(() => props.currentNoteId, (noteId) => {
  if (noteId) {
    const note = props.notes.find(n => n.id === noteId)
    if (note) {
      expandedNotebooks.value.add(note.notebook_id)
      if (note.folder_id) {
        // Expand all parent folders
        let folderId: string | null = note.folder_id
        while (folderId) {
          expandedFolders.value.add(folderId)
          const folder = props.folders.find(f => f.id === folderId)
          folderId = folder?.parent_id || null
        }
      }
    }
  }
})

// Initialize: expand first notebook
onMounted(async () => {
  // Load saved expand state
  try {
    const savedExpandState = await window.electronAPI?.settings.get('app.expandedState')
    if (savedExpandState) {
      if (savedExpandState.notebooks) {
        expandedNotebooks.value = new Set(savedExpandState.notebooks)
      }
      if (savedExpandState.folders) {
        expandedFolders.value = new Set(savedExpandState.folders)
      }
    }
  } catch (e) {
    // Fallback: expand first notebook if no saved state
    if (props.notebooks.length > 0) {
      expandedNotebooks.value.add(props.notebooks[0].id)
    }
  }
  
  // If no notebooks expanded, expand first one
  if (expandedNotebooks.value.size === 0 && props.notebooks.length > 0) {
    expandedNotebooks.value.add(props.notebooks[0].id)
  }
  
  document.addEventListener('click', hideContextMenu)
  
  // Load GitHub status
  loadGitHubStatus()
  // Poll for sync status updates
  statusPollTimer = window.setInterval(loadGitHubStatus, 10000)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
  if (statusPollTimer) {
    clearInterval(statusPollTimer)
  }
  // Save expand state on unmount
  saveExpandState()
})

// Save expand state to settings
async function saveExpandState() {
  try {
    await window.electronAPI?.settings.set('app.expandedState', {
      notebooks: Array.from(expandedNotebooks.value),
      folders: Array.from(expandedFolders.value)
    })
  } catch (e) {
    console.error('Failed to save expand state:', e)
  }
}

// Debounced save expand state
const debouncedSaveExpandState = useDebounceFn(saveExpandState, 500)

// Watch for expand state changes and save
watch([expandedNotebooks, expandedFolders], () => {
  debouncedSaveExpandState()
}, { deep: true })
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.sidebar {
  width: var(--sidebar-width, 280px);
  min-width: 200px;
  max-width: 500px;
  height: 100%;
  background: var(--bg-secondary);
  border-right: none;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  // macOS 窗口控制按钮区域预留空间
  padding-top: calc(var(--titlebar-area-height) + 12px);
  border-bottom: 1px solid var(--border-light);
  -webkit-app-region: drag;
  
  button {
    -webkit-app-region: no-drag;
  }
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  
  svg {
    color: var(--primary);
  }
}

.sidebar-search {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  
  svg {
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
  
  .search-input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    font-size: 13px;
    color: var(--text-primary);
    
    &::placeholder {
      color: var(--text-tertiary);
    }
  }
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.sidebar-section {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-actions {
  display: flex;
  gap: 4px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--bg-active);
    color: var(--primary);
    
    svg {
      color: var(--primary);
    }
  }
  
  span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .badge {
    flex-shrink: 0;
    padding: 2px 8px;
    font-size: 11px;
    background: var(--bg-hover);
    border-radius: var(--radius-full);
    color: var(--text-tertiary);
  }
}

.tag-item {
  padding-left: 24px;
  font-size: 13px;
}

.new-item-input {
  padding: 4px 16px;
  
  .input {
    width: 100%;
    padding: 6px 10px;
    font-size: 13px;
  }
  
  &.tree-new-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    margin-bottom: 2px;
    
    svg {
      flex-shrink: 0;
      color: var(--text-tertiary);
    }
    
    .input {
      flex: 1;
      min-width: 0;
    }
  }
}

.empty-tags {
  padding: 8px 24px;
  font-size: 13px;
  color: var(--text-tertiary);
}

// Tree styles
.tree-container {
  padding: 0 8px;
}

.tree-node {
  margin-bottom: 2px;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  font-size: 13px;
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--bg-active);
    color: var(--primary);
    
    svg {
      color: var(--primary);
    }
  }
  
  &.drag-over {
    background: var(--primary-light);
    border: 1px dashed var(--primary);
  }
  
  .tree-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    
    svg {
      transition: transform var(--transition-fast);
    }
  }
  
  .tree-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .tree-edit-input {
    flex: 1;
    padding: 2px 6px;
    font-size: 13px;
  }
  
  .badge {
    flex-shrink: 0;
    padding: 2px 6px;
    font-size: 10px;
    background: var(--bg-hover);
    border-radius: var(--radius-full);
    color: var(--text-tertiary);
  }
}

.notebook-item {
  font-weight: 500;
}

.tree-children {
  margin-left: 8px;
  border-left: 1px solid var(--border-light);
  padding-left: 4px;
}

.tree-empty {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text-tertiary);
}

// Context Menu
.context-menu {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 160px;
  z-index: 1000;
  overflow: hidden;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  transition: background var(--transition-fast);
  
  &:hover {
    background: var(--bg-hover);
  }
  
  &.danger {
    color: var(--error);
    
    &:hover {
      background: rgba(239, 68, 68, 0.1);
    }
  }
}

.context-menu-divider {
  height: 1px;
  background: var(--border-light);
  margin: 4px 0;
}

// Sidebar Footer
.sidebar-footer {
  border-top: 1px solid var(--border-light);
  padding: 12px;
  background: var(--bg-secondary);
}

.github-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  margin-bottom: 8px;
  
  &:hover {
    background: var(--bg-hover);
  }
  
  .github-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  
  .github-info {
    flex: 1;
    min-width: 0;
    
    .github-name {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .sync-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: var(--text-tertiary);
      
      svg {
        flex-shrink: 0;
      }
      
      &.syncing {
        color: var(--primary);
      }
      
      &.success {
        color: var(--success);
      }
      
      &.error {
        color: var(--error);
      }
    }
  }
  
  .sync-btn {
    flex-shrink: 0;
    opacity: 0.6;
    
    &:hover {
      opacity: 1;
    }
    
    &:disabled {
      opacity: 0.3;
    }
  }
}

.github-login-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  
  svg {
    flex-shrink: 0;
  }
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-medium);
  }
  
  svg {
    flex-shrink: 0;
  }
}

// Spin animation
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
