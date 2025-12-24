<template>
  <div class="block-editor" ref="editorContainer">
    <!-- Slash Command Menu -->
    <div 
      v-if="showSlashMenu" 
      class="slash-menu"
      :style="slashMenuPosition"
      ref="slashMenuRef"
    >
      <div class="slash-menu-header">插入块</div>
      <div 
        v-for="(item, index) in filteredCommands" 
        :key="item.name"
        class="slash-menu-item"
        :class="{ active: selectedIndex === index }"
        @click="executeCommand(item)"
        @mouseenter="selectedIndex = index"
      >
        <span class="slash-menu-icon" v-html="item.icon"></span>
        <div class="slash-menu-content">
          <span class="slash-menu-title">{{ item.title }}</span>
          <span class="slash-menu-desc">{{ item.description }}</span>
        </div>
        <span class="slash-menu-shortcut">{{ item.shortcut }}</span>
      </div>
      <div v-if="filteredCommands.length === 0" class="slash-menu-empty">
        没有找到匹配的命令
      </div>
    </div>

    <!-- Floating Toolbar -->
    <div 
      v-if="showToolbar"
      class="floating-toolbar"
      :style="toolbarPosition"
    >
      <div class="toolbar-group">
        <button 
          @click="editor?.chain().focus().toggleBold().run()"
          :class="{ active: editor?.isActive('bold') }"
          title="粗体 (⌘B)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          </svg>
        </button>
        <button 
          @click="editor?.chain().focus().toggleItalic().run()"
          :class="{ active: editor?.isActive('italic') }"
          title="斜体 (⌘I)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="4" x2="10" y2="4"/>
            <line x1="14" y1="20" x2="5" y2="20"/>
            <line x1="15" y1="4" x2="9" y2="20"/>
          </svg>
        </button>
        <button 
          @click="editor?.chain().focus().toggleUnderline().run()"
          :class="{ active: editor?.isActive('underline') }"
          title="下划线 (⌘U)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
            <line x1="4" y1="21" x2="20" y2="21"/>
          </svg>
        </button>
        <button 
          @click="editor?.chain().focus().toggleStrike().run()"
          :class="{ active: editor?.isActive('strike') }"
          title="删除线"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="12" x2="20" y2="12"/>
            <path d="M17.5 7.5c-2-2.5-5-3-7.5-2s-4 3.5-3 6"/>
            <path d="M6.5 16.5c2 2.5 5 3 7.5 2s4-3.5 3-6"/>
          </svg>
        </button>
        <button 
          @click="editor?.chain().focus().toggleCode().run()"
          :class="{ active: editor?.isActive('code') }"
          title="行内代码"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button 
          @click="editor?.chain().focus().toggleHighlight().run()"
          :class="{ active: editor?.isActive('highlight') }"
          title="高亮"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
        <button 
          @click="setLink"
          :class="{ active: editor?.isActive('link') }"
          title="链接"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Block Drag Handle -->
    <div 
      v-if="showDragHandle && dragHandlePosition"
      class="drag-handle"
      :style="dragHandlePosition"
      @mousedown="startDrag"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9" cy="5" r="2"/>
        <circle cx="9" cy="12" r="2"/>
        <circle cx="9" cy="19" r="2"/>
        <circle cx="15" cy="5" r="2"/>
        <circle cx="15" cy="12" r="2"/>
        <circle cx="15" cy="19" r="2"/>
      </svg>
    </div>

    <!-- Main Editor -->
    <EditorContent :editor="editor" class="editor-content" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { common, createLowlight } from 'lowlight'

const lowlight = createLowlight(common)

interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Refs
const editorContainer = ref<HTMLElement | null>(null)
const slashMenuRef = ref<HTMLElement | null>(null)

// Slash menu state
const showSlashMenu = ref(false)
const slashMenuPosition = ref({ top: '0px', left: '0px' })
const slashQuery = ref('')
const selectedIndex = ref(0)

// Floating toolbar state
const showToolbar = ref(false)
const toolbarPosition = ref({ top: '0px', left: '0px' })

// Drag handle state
const showDragHandle = ref(false)
const dragHandlePosition = ref<{ top: string; left: string } | null>(null)

// Slash commands
const slashCommands = [
  { 
    name: 'paragraph', 
    title: '正文', 
    description: '普通段落文本',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>',
    shortcut: '',
    command: (editor: any) => editor.chain().focus().setParagraph().run()
  },
  { 
    name: 'heading1', 
    title: '一级标题', 
    description: '大标题',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 10v8"/><path d="M21 10h-4"/></svg>',
    shortcut: '# ',
    command: (editor: any) => editor.chain().focus().toggleHeading({ level: 1 }).run()
  },
  { 
    name: 'heading2', 
    title: '二级标题', 
    description: '中标题',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>',
    shortcut: '## ',
    command: (editor: any) => editor.chain().focus().toggleHeading({ level: 2 }).run()
  },
  { 
    name: 'heading3', 
    title: '三级标题', 
    description: '小标题',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/></svg>',
    shortcut: '### ',
    command: (editor: any) => editor.chain().focus().toggleHeading({ level: 3 }).run()
  },
  { 
    name: 'bulletList', 
    title: '无序列表', 
    description: '项目符号列表',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>',
    shortcut: '- ',
    command: (editor: any) => editor.chain().focus().toggleBulletList().run()
  },
  { 
    name: 'orderedList', 
    title: '有序列表', 
    description: '数字编号列表',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="4" y="7" font-size="6" fill="currentColor">1</text><text x="4" y="13" font-size="6" fill="currentColor">2</text><text x="4" y="19" font-size="6" fill="currentColor">3</text></svg>',
    shortcut: '1. ',
    command: (editor: any) => editor.chain().focus().toggleOrderedList().run()
  },
  { 
    name: 'taskList', 
    title: '待办事项', 
    description: '可勾选的任务列表',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="M5 8l1 1 2-2"/><line x1="13" y1="8" x2="21" y2="8"/><rect x="3" y="14" width="6" height="6" rx="1"/><line x1="13" y1="17" x2="21" y2="17"/></svg>',
    shortcut: '[] ',
    command: (editor: any) => editor.chain().focus().toggleTaskList().run()
  },
  { 
    name: 'blockquote', 
    title: '引用', 
    description: '引用块',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v4z"/></svg>',
    shortcut: '> ',
    command: (editor: any) => editor.chain().focus().toggleBlockquote().run()
  },
  { 
    name: 'codeBlock', 
    title: '代码块', 
    description: '代码片段',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    shortcut: '```',
    command: (editor: any) => editor.chain().focus().toggleCodeBlock().run()
  },
  { 
    name: 'horizontalRule', 
    title: '分割线', 
    description: '水平分隔线',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>',
    shortcut: '---',
    command: (editor: any) => editor.chain().focus().setHorizontalRule().run()
  },
  { 
    name: 'table', 
    title: '表格', 
    description: '插入表格',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    shortcut: '',
    command: (editor: any) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  { 
    name: 'image', 
    title: '图片', 
    description: '插入图片',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    shortcut: '',
    command: (editor: any) => {
      const url = window.prompt('输入图片 URL')
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    }
  },
]

const filteredCommands = computed(() => {
  if (!slashQuery.value) return slashCommands
  return slashCommands.filter(cmd => 
    cmd.title.toLowerCase().includes(slashQuery.value.toLowerCase()) ||
    cmd.name.toLowerCase().includes(slashQuery.value.toLowerCase())
  )
})

// Initialize editor
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      codeBlock: false,
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') {
          return '标题'
        }
        return '输入 / 插入块，或直接开始写作...'
      },
    }),
    Typography,
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Highlight.configure({
      multicolor: true,
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    Link.configure({
      openOnClick: false,
    }),
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-editor',
      spellcheck: 'false',
    },
    handleKeyDown: (view, event) => {
      if (showSlashMenu.value) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          selectedIndex.value = Math.min(selectedIndex.value + 1, filteredCommands.value.length - 1)
          return true
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
          return true
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          if (filteredCommands.value[selectedIndex.value]) {
            executeCommand(filteredCommands.value[selectedIndex.value])
          }
          return true
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          closeSlashMenu()
          return true
        }
      }
      return false
    },
  },
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    emit('update:modelValue', html)
  },
  onSelectionUpdate: ({ editor }) => {
    updateToolbar(editor)
    updateDragHandle()
  },
})

// Watch for external content changes
watch(() => props.modelValue, (newValue) => {
  if (editor.value && editor.value.getHTML() !== newValue) {
    editor.value.commands.setContent(newValue, false)
  }
})

// Toolbar functions
function updateToolbar(editorInstance: any) {
  const { from, to, empty } = editorInstance.state.selection
  
  if (empty || from === to) {
    showToolbar.value = false
    return
  }
  
  const coords = editorInstance.view.coordsAtPos(from)
  const containerRect = editorContainer.value?.getBoundingClientRect()
  
  if (containerRect) {
    toolbarPosition.value = {
      top: `${coords.top - containerRect.top - 50}px`,
      left: `${coords.left - containerRect.left}px`,
    }
  }
  
  showToolbar.value = true
}

// Slash menu functions
function openSlashMenu() {
  if (!editor.value) return
  
  const { from } = editor.value.state.selection
  const coords = editor.value.view.coordsAtPos(from)
  const containerRect = editorContainer.value?.getBoundingClientRect()
  
  if (containerRect) {
    slashMenuPosition.value = {
      top: `${coords.bottom - containerRect.top + 8}px`,
      left: `${coords.left - containerRect.left}px`,
    }
  }
  
  showSlashMenu.value = true
  slashQuery.value = ''
  selectedIndex.value = 0
}

function closeSlashMenu() {
  showSlashMenu.value = false
  slashQuery.value = ''
  selectedIndex.value = 0
}

function executeCommand(item: typeof slashCommands[0]) {
  if (!editor.value) return
  
  const { from } = editor.value.state.selection
  const textBefore = editor.value.state.doc.textBetween(Math.max(0, from - 20), from)
  const slashIndex = textBefore.lastIndexOf('/')
  
  if (slashIndex !== -1) {
    const deleteFrom = from - (textBefore.length - slashIndex)
    editor.value.chain().focus().deleteRange({ from: deleteFrom, to: from }).run()
  }
  
  item.command(editor.value)
  closeSlashMenu()
}

// Link function
function setLink() {
  if (!editor.value) return
  
  const previousUrl = editor.value.getAttributes('link').href
  const url = window.prompt('输入链接 URL', previousUrl)
  
  if (url === null) return
  
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

// Drag handle functions
function updateDragHandle() {
  if (!editor.value || !editorContainer.value) {
    showDragHandle.value = false
    return
  }
  
  const { $from } = editor.value.state.selection
  const node = $from.parent
  
  if (node.isBlock) {
    const pos = $from.before($from.depth)
    const coords = editor.value.view.coordsAtPos(pos)
    const containerRect = editorContainer.value.getBoundingClientRect()
    
    dragHandlePosition.value = {
      top: `${coords.top - containerRect.top}px`,
      left: '4px',
    }
    showDragHandle.value = true
  } else {
    showDragHandle.value = false
  }
}

function startDrag(event: MouseEvent) {
  console.log('Start drag', event)
}

// Listen for slash key
onMounted(() => {
  if (editor.value) {
    editor.value.on('update', ({ editor: editorInstance }) => {
      const { from } = editorInstance.state.selection
      const textBefore = editorInstance.state.doc.textBetween(Math.max(0, from - 20), from)
      
      const match = textBefore.match(/(?:^|\s)\/([^\s]*)$/)
      
      if (match) {
        if (!showSlashMenu.value) {
          openSlashMenu()
        }
        slashQuery.value = match[1] || ''
        selectedIndex.value = 0
      } else if (showSlashMenu.value) {
        closeSlashMenu()
      }
      
      updateDragHandle()
    })
  }
})

// Expose reset function
function resetContent(newContent: string) {
  if (editor.value) {
    editor.value.commands.setContent(newContent, false)
  }
}

defineExpose({ resetContent })

onUnmounted(() => {
  editor.value?.destroy()
})
</script>

<style lang="scss">
.block-editor {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-left: 48px;
  
  .ProseMirror {
    outline: none;
    min-height: 100%;
    font-size: 15px;
    line-height: 1.8;
    color: var(--text-primary);
    
    > * + * {
      margin-top: 0.75em;
    }
    
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--text-tertiary);
      pointer-events: none;
      height: 0;
    }
    
    .is-empty::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--text-tertiary);
      pointer-events: none;
      height: 0;
    }
  }
  
  h1 {
    font-size: 2em;
    font-weight: 700;
    margin: 24px 0 16px;
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--border-light);
    color: var(--text-primary);
  }
  
  h2 {
    font-size: 1.5em;
    font-weight: 600;
    margin: 20px 0 14px;
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--border-light);
    color: var(--text-primary);
  }
  
  h3 {
    font-size: 1.25em;
    font-weight: 600;
    margin: 18px 0 12px;
    color: var(--text-primary);
  }
  
  h4, h5, h6 {
    font-size: 1em;
    font-weight: 600;
    margin: 16px 0 10px;
    color: var(--text-primary);
  }
  
  p {
    margin: 0 0 16px;
    color: var(--text-primary);
  }
  
  a {
    color: var(--primary);
    text-decoration: none;
    cursor: pointer;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  code:not(pre code) {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.9em;
    padding: 2px 6px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    color: var(--text-primary);
  }
  
  pre {
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
    overflow-x: auto;
    margin: 0 0 16px;
    
    code {
      padding: 0;
      background: transparent;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-primary);
    }
  }
  
  blockquote {
    margin: 0 0 16px;
    padding: 0 16px;
    border-left: 4px solid var(--primary);
    color: var(--text-secondary);
    
    p {
      margin: 0;
    }
  }
  
  ul, ol {
    padding-left: 24px;
    margin: 0 0 16px;
  }
  
  li {
    margin: 4px 0;
    color: var(--text-primary);
    
    &::marker {
      color: var(--text-secondary);
    }
    
    p {
      margin: 0;
    }
  }
  
  ul[data-type="taskList"] {
    list-style: none;
    padding-left: 0;
    
    li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      
      > label {
        flex-shrink: 0;
        margin-top: 4px;
        
        input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: var(--primary);
        }
      }
      
      > div {
        flex: 1;
      }
    }
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 16px;
    
    th, td {
      padding: 10px 14px;
      border: 1px solid var(--border-light);
      text-align: left;
      position: relative;
    }
    
    th {
      background: var(--bg-secondary);
      font-weight: 600;
    }
    
    tr:hover td {
      background: var(--bg-hover);
    }
    
    .selectedCell {
      background: var(--primary-light) !important;
    }
  }
  
  hr {
    border: none;
    border-top: 2px solid var(--border-light);
    margin: 24px 0;
  }
  
  img {
    max-width: 100%;
    border-radius: 8px;
    margin: 8px 0;
    
    &.ProseMirror-selectednode {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
  }
  
  strong {
    font-weight: 600;
    color: var(--text-primary);
  }
  
  em {
    font-style: italic;
    color: var(--text-primary);
  }
  
  s {
    text-decoration: line-through;
    color: var(--text-secondary);
  }
  
  mark {
    background-color: #fef08a;
    padding: 2px 0;
  }
}

.slash-menu {
  position: absolute;
  z-index: 1000;
  min-width: 280px;
  max-height: 360px;
  overflow-y: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.15s ease-out;
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .slash-menu-header {
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border-light);
  }
  
  .slash-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    cursor: pointer;
    transition: background 0.15s;
    
    &:hover,
    &.active {
      background: var(--bg-hover);
    }
    
    .slash-menu-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--bg-secondary);
      border-radius: 6px;
      color: var(--text-secondary);
      
      svg {
        width: 20px;
        height: 20px;
      }
    }
    
    .slash-menu-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      
      .slash-menu-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
      }
      
      .slash-menu-desc {
        font-size: 12px;
        color: var(--text-tertiary);
      }
    }
    
    .slash-menu-shortcut {
      font-size: 12px;
      color: var(--text-tertiary);
      font-family: 'SF Mono', monospace;
    }
  }
  
  .slash-menu-empty {
    padding: 20px;
    text-align: center;
    color: var(--text-tertiary);
    font-size: 14px;
  }
}

.floating-toolbar {
  position: absolute;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: fadeIn 0.15s ease-out;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  
  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: var(--border-light);
    margin: 0 4px;
  }
  
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.15s;
    
    &:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    
    &.active {
      background: var(--primary-light);
      color: var(--primary);
    }
  }
}

.drag-handle {
  position: absolute;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: grab;
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }
  
  &:active {
    cursor: grabbing;
  }
}

.block-editor:hover .drag-handle {
  opacity: 1;
}

.ProseMirror-selectednode {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.ProseMirror-gapcursor {
  display: none;
  pointer-events: none;
  position: absolute;
  
  &:after {
    content: '';
    display: block;
    position: absolute;
    top: -2px;
    width: 20px;
    border-top: 1px solid var(--text-primary);
    animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
  }
}

@keyframes ProseMirror-cursor-blink {
  to {
    visibility: hidden;
  }
}

.ProseMirror-focused .ProseMirror-gapcursor {
  display: block;
}
</style>
