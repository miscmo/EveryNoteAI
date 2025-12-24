<template>
  <div ref="editorRef" class="milkdown-editor">
    <div v-if="error" class="editor-error">
      编辑器加载失败: {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { history } from '@milkdown/plugin-history'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { nord } from '@milkdown/theme-nord'

interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<HTMLElement | null>(null)
const error = ref<string | null>(null)
let editor: Editor | null = null

async function createEditor(initialValue: string) {
  if (!editorRef.value) return null
  
  try {
    const ed = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorRef.value!)
        ctx.set(defaultValueCtx, initialValue || '')
        ctx.set(editorViewOptionsCtx, {
          attributes: {
            class: 'milkdown-editor-content',
            spellcheck: 'false'
          }
        })
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          emit('update:modelValue', markdown)
        })
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .create()
    
    error.value = null
    return ed
  } catch (e) {
    console.error('Milkdown editor creation failed:', e)
    error.value = String(e)
    return null
  }
}

onMounted(async () => {
  editor = await createEditor(props.modelValue)
})

// Expose method to reset content (called when note changes via key)
async function resetContent(newContent: string) {
  if (editor) {
    try {
      editor.destroy()
    } catch (e) {
      console.error('Error destroying editor:', e)
    }
  }
  await nextTick()
  editor = await createEditor(newContent)
}

defineExpose({ resetContent })

onUnmounted(() => {
  try {
    editor?.destroy()
  } catch (e) {
    console.error('Error destroying editor on unmount:', e)
  }
  editor = null
})
</script>

<style lang="scss">
.milkdown-editor {
  flex: 1;
  overflow-y: auto;
  
  .editor-error {
    padding: 20px;
    color: var(--error, #ef4444);
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    margin: 20px;
  }
  
  .milkdown-editor-content {
    outline: none;
    padding: 20px;
    min-height: 100%;
    font-size: 15px;
    line-height: 1.8;
    color: var(--text-primary);
  }
  
  // Override nord theme colors to match our theme
  .milkdown {
    --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --font-family-code: 'SF Mono', 'Fira Code', 'Monaco', monospace;
    --bg: var(--bg-primary);
    --surface: var(--bg-secondary);
    --line: var(--border-light);
    --solid: var(--text-primary);
    --secondary: var(--text-secondary);
    --primary: var(--primary);
    
    background: transparent !important;
  }
  
  // ProseMirror editor styles
  .ProseMirror {
    outline: none;
    min-height: 100%;
    
    > * + * {
      margin-top: 0.75em;
    }
  }
  
  // Headings
  .milkdown h1,
  .ProseMirror h1 {
    font-size: 2em;
    font-weight: 700;
    margin: 24px 0 16px;
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--border-light);
    color: var(--text-primary);
  }
  
  .milkdown h2,
  .ProseMirror h2 {
    font-size: 1.5em;
    font-weight: 600;
    margin: 20px 0 14px;
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--border-light);
    color: var(--text-primary);
  }
  
  .milkdown h3,
  .ProseMirror h3 {
    font-size: 1.25em;
    font-weight: 600;
    margin: 18px 0 12px;
    color: var(--text-primary);
  }
  
  .milkdown h4, .milkdown h5, .milkdown h6,
  .ProseMirror h4, .ProseMirror h5, .ProseMirror h6 {
    font-size: 1em;
    font-weight: 600;
    margin: 16px 0 10px;
    color: var(--text-primary);
  }
  
  // Paragraphs
  .milkdown p,
  .ProseMirror p {
    margin: 0 0 16px;
    color: var(--text-primary);
  }
  
  // Links
  .milkdown a,
  .ProseMirror a {
    color: var(--primary);
    text-decoration: none;
    cursor: pointer;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  // Inline Code
  .milkdown code:not(pre code),
  .ProseMirror code:not(pre code) {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.9em;
    padding: 2px 6px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    color: var(--text-primary);
  }
  
  // Code Block
  .milkdown pre,
  .ProseMirror pre {
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
  
  // Blockquote
  .milkdown blockquote,
  .ProseMirror blockquote {
    margin: 0 0 16px;
    padding: 0 16px;
    border-left: 4px solid var(--primary);
    color: var(--text-secondary);
    
    p {
      margin: 0;
    }
  }
  
  // Lists
  .milkdown ul, .milkdown ol,
  .ProseMirror ul, .ProseMirror ol {
    padding-left: 24px;
    margin: 0 0 16px;
  }
  
  .milkdown li,
  .ProseMirror li {
    margin: 4px 0;
    color: var(--text-primary);
    
    &::marker {
      color: var(--text-secondary);
    }
    
    p {
      margin: 0;
    }
  }
  
  // Task list
  .ProseMirror ul[data-type="taskList"] {
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
  
  // Table
  .milkdown table,
  .ProseMirror table {
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
  
  // Horizontal rule
  .milkdown hr,
  .ProseMirror hr {
    border: none;
    border-top: 2px solid var(--border-light);
    margin: 24px 0;
  }
  
  // Image
  .milkdown img,
  .ProseMirror img {
    max-width: 100%;
    border-radius: 8px;
    margin: 8px 0;
    
    &.ProseMirror-selectednode {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
  }
  
  // Strong & emphasis
  .milkdown strong,
  .ProseMirror strong {
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .milkdown em,
  .ProseMirror em {
    font-style: italic;
    color: var(--text-primary);
  }
  
  // Strikethrough
  .milkdown del,
  .milkdown s,
  .ProseMirror del,
  .ProseMirror s {
    text-decoration: line-through;
    color: var(--text-secondary);
  }
  
  // Selection
  .ProseMirror-selectednode {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  
  // Placeholder
  .ProseMirror p.is-editor-empty:first-child::before,
  .ProseMirror .is-empty::before {
    content: '开始写作...';
    float: left;
    color: var(--text-tertiary);
    pointer-events: none;
    height: 0;
  }
  
  // Gapcursor
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
}
</style>
