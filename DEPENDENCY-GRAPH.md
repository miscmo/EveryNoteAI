# 模块依赖图

> 本文档展示项目的模块依赖关系，使用 Mermaid 图表可视化。

## 前端模块依赖 (Vue/TypeScript)

```mermaid
graph TD
    subgraph Entry["入口"]
        main["src/main.ts<br/>(Vue 应用入口)"]
    end
    
    subgraph Core["核心"]
        App["src/App.vue<br/>(根组件)"]
        Router["src/router/index.ts<br/>(路由配置)"]
    end
    
    subgraph Views["页面视图"]
        Home["src/views/Home.vue<br/>(主页面)"]
        Settings["src/views/Settings.vue<br/>(设置页)"]
    end
    
    subgraph Components["组件"]
        Sidebar["src/components/Sidebar.vue<br/>(侧边栏)"]
        TreeNode["src/components/TreeNode.vue<br/>(树节点-递归)"]
        NoteEditor["src/components/NoteEditor.vue<br/>(笔记编辑器)"]
        NoteList["src/components/NoteList.vue<br/>(笔记列表)"]
        NoteItem["src/components/NoteItem.vue<br/>(笔记项)"]
        EmptyEditor["src/components/EmptyEditor.vue<br/>(空编辑器)"]
    end
    
    subgraph Stores["Pinia 状态管理"]
        NotebooksStore["src/stores/notebooks.ts"]
        FoldersStore["src/stores/folders.ts"]
        NotesStore["src/stores/notes.ts"]
        TagsStore["src/stores/tags.ts"]
        SettingsStore["src/stores/settings.ts"]
    end
    
    subgraph Styles["样式"]
        GlobalScss["src/styles/global.scss"]
        Variables["src/styles/variables.scss"]
    end
    
    %% 入口依赖
    main --> App
    main --> Router
    main --> GlobalScss
    
    %% 路由依赖
    Router --> Home
    Router --> Settings
    
    %% App 依赖
    App --> Router
    
    %% Home 页面依赖
    Home --> Sidebar
    Home --> NoteEditor
    Home --> EmptyEditor
    Home --> NotebooksStore
    Home --> FoldersStore
    Home --> NotesStore
    Home --> TagsStore
    
    %% Sidebar 依赖
    Sidebar --> TreeNode
    Sidebar --> NoteList
    Sidebar --> NotebooksStore
    Sidebar --> FoldersStore
    Sidebar --> NotesStore
    Sidebar --> TagsStore
    Sidebar --> Variables
    
    %% TreeNode 递归
    TreeNode --> TreeNode
    TreeNode --> Variables
    
    %% NoteList 依赖
    NoteList --> NoteItem
    
    %% NoteEditor 依赖
    NoteEditor --> NotesStore
    NoteEditor --> TagsStore
    
    %% Settings 依赖
    Settings --> SettingsStore
    
    %% Store 依赖 electronAPI
    NotebooksStore -.-> electronAPI["window.electronAPI"]
    FoldersStore -.-> electronAPI
    NotesStore -.-> electronAPI
    TagsStore -.-> electronAPI
    SettingsStore -.-> electronAPI
```

## 后端模块依赖 (Electron/Node.js)

```mermaid
graph TD
    subgraph Main["主进程"]
        mainTs["electron/main.ts<br/>(主进程入口)"]
    end
    
    subgraph Preload["预加载"]
        preload["electron/preload.ts<br/>(API 桥接)"]
    end
    
    subgraph Services["服务模块"]
        database["electron/database.ts<br/>(SQLite 数据库)"]
        aiService["electron/ai-service.ts<br/>(OpenAI 服务)"]
        githubSync["electron/github-sync.ts<br/>(GitHub 同步)"]
        simpleStore["electron/simple-store.ts<br/>(设置存储)"]
    end
    
    subgraph External["外部依赖"]
        electron["electron"]
        sqljs["sql.js"]
        openai["OpenAI API"]
        github["GitHub API"]
    end
    
    %% 主进程依赖
    mainTs --> database
    mainTs --> aiService
    mainTs --> githubSync
    mainTs --> simpleStore
    mainTs --> electron
    
    %% 预加载依赖
    preload --> electron
    
    %% 服务依赖
    database --> sqljs
    aiService --> simpleStore
    aiService -.-> openai
    githubSync --> simpleStore
    githubSync -.-> github
```

## IPC 通信依赖

```mermaid
graph LR
    subgraph Renderer["渲染进程"]
        VueApp["Vue 应用"]
        Stores["Pinia Stores"]
    end
    
    subgraph Bridge["桥接层"]
        electronAPI["window.electronAPI"]
        preload["preload.ts"]
    end
    
    subgraph Main["主进程"]
        ipcHandlers["IPC Handlers"]
        Services["服务模块"]
    end
    
    VueApp --> Stores
    Stores --> electronAPI
    electronAPI --> preload
    preload -->|"ipcRenderer.invoke()"| ipcHandlers
    ipcHandlers --> Services
    Services -->|"返回结果"| ipcHandlers
    ipcHandlers -->|"IPC 响应"| preload
    preload --> electronAPI
    electronAPI --> Stores
    Stores --> VueApp
```

## 数据流依赖

```mermaid
flowchart TD
    subgraph UI["用户界面层"]
        Components["Vue 组件"]
    end
    
    subgraph State["状态层"]
        Pinia["Pinia Stores"]
    end
    
    subgraph IPC["IPC 层"]
        API["electronAPI"]
        Preload["preload.ts"]
        Handlers["IPC Handlers"]
    end
    
    subgraph Data["数据层"]
        SQLite["SQLite 数据库"]
        FileStore["文件存储"]
    end
    
    subgraph External["外部服务"]
        OpenAI["OpenAI API"]
        GitHub["GitHub API"]
    end
    
    Components -->|"调用 action"| Pinia
    Pinia -->|"调用 API"| API
    API -->|"contextBridge"| Preload
    Preload -->|"ipcRenderer"| Handlers
    Handlers -->|"CRUD"| SQLite
    Handlers -->|"读写"| FileStore
    Handlers -->|"AI 请求"| OpenAI
    Handlers -->|"同步"| GitHub
    
    SQLite -->|"返回数据"| Handlers
    OpenAI -->|"AI 响应"| Handlers
    GitHub -->|"同步结果"| Handlers
    Handlers -->|"IPC 响应"| Preload
    Preload -->|"Promise 结果"| API
    API -->|"更新状态"| Pinia
    Pinia -->|"响应式更新"| Components
```

## 组件树结构

```mermaid
graph TD
    App["App.vue"]
    
    App --> RouterView["router-view"]
    
    RouterView --> Home["Home.vue"]
    RouterView --> Settings["Settings.vue"]
    
    Home --> Sidebar["Sidebar.vue"]
    Home --> Resizer["Resizer"]
    Home --> EditorContainer["编辑器容器"]
    
    Sidebar --> SearchBox["搜索框"]
    Sidebar --> AllNotesEntry["所有笔记入口"]
    Sidebar --> NotebookList["笔记本列表"]
    Sidebar --> TagList["标签列表"]
    Sidebar --> ContextMenu["右键菜单"]
    
    NotebookList --> TreeNode1["TreeNode (笔记本)"]
    TreeNode1 --> TreeNode2["TreeNode (文件夹)"]
    TreeNode2 --> TreeNode3["TreeNode (笔记)"]
    TreeNode2 --> TreeNode2_sub["TreeNode (子文件夹)"]
    
    EditorContainer --> NoteEditor["NoteEditor.vue"]
    EditorContainer --> EmptyEditor["EmptyEditor.vue"]
    
    NoteEditor --> TitleInput["标题输入框"]
    NoteEditor --> AIMenu["AI 助手菜单"]
    NoteEditor --> ViewToggle["视图切换"]
    NoteEditor --> TagBar["标签栏"]
    NoteEditor --> MarkdownArea["Markdown 编辑区"]
    
    Settings --> AppearanceSection["外观设置"]
    Settings --> AISection["AI 设置"]
    Settings --> SyncSection["同步设置"]
```

## Store 依赖关系

```mermaid
graph TD
    subgraph Stores["Pinia Stores"]
        notebooks["notebooks.ts<br/>笔记本管理"]
        folders["folders.ts<br/>文件夹管理"]
        notes["notes.ts<br/>笔记管理"]
        tags["tags.ts<br/>标签管理"]
        settings["settings.ts<br/>设置管理"]
    end
    
    subgraph API["electronAPI 接口"]
        notebookAPI["notebook.*"]
        folderAPI["folder.*"]
        noteAPI["note.*"]
        tagAPI["tag.*"]
        settingsAPI["settings.*"]
        aiAPI["ai.*"]
        githubAPI["github.*"]
    end
    
    notebooks --> notebookAPI
    folders --> folderAPI
    notes --> noteAPI
    tags --> tagAPI
    settings --> settingsAPI
    settings --> aiAPI
    settings --> githubAPI
```

---

## 如何阅读此图

1. **箭头方向**: 表示依赖方向，A → B 表示 A 依赖 B
2. **虚线箭头**: 表示异步调用或外部依赖
3. **子图**: 将相关模块分组，便于理解层次结构
4. **颜色**: 不同颜色区分不同类型的模块

## 在线查看

将 Mermaid 代码复制到以下工具可在线查看：
- [Mermaid Live Editor](https://mermaid.live/)
- [GitHub](直接在 GitHub 上查看 .md 文件会自动渲染)
- VS Code 安装 "Markdown Preview Mermaid Support" 插件

---

*生成时间: 2024-12-24*
