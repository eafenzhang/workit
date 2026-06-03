# PRD: Agent OS 桌面模式

## 1. 项目信息

| 项 | 值 |
|---|---|
| **Language** | 中文 |
| **Programming Language** | TypeScript + React + Electron（沿用现有技术栈） |
| **UI Framework** | Tailwind CSS + MUI（沿用现有），不引入新 UI 库 |
| **Project Name** | `agent_os_desktop` |
| **原始需求** | 在 Workit 桌面端新增 Agent OS 模式 —— 仿 macOS 桌面的沉浸式操作体验，所有功能页面以独立窗口形态运行。 |

---

## 2. 产品定义

### 2.1 Product Goals

1. **提供沉浸式桌面体验** —— 用户可切换至类似 macOS 桌面的操作环境，顶部菜单栏 + 桌面区 + Dock 栏，降低 AI 工具的操作门槛，借鉴用户熟悉的桌面操作系统交互模型。

2. **实现多窗口并行工作流** —— 每个功能页面独立为可拖拽、缩放、最小化的窗口，支持多窗口层叠同时操作（如边看知识库边与 AI 对话），突破当前单标签页切换的限制。

3. **无缝兼容现有功能体系** —— 现有侧边栏所有导航入口均在 Dock 栏中保留，两种模式（经典模式 / Agent OS 模式）通过标题栏切换按钮一键切换，不丢失现有功能。

### 2.2 User Stories

- **As a 重度 AI 用户**, I want 在桌面模式下同时打开聊天窗口和知识库窗口，so that 我可以一边查阅知识库资料一边与 AI 对话，无需频繁切换标签页。

- **As a 新用户**, I want 进入 Agent OS 模式后看到熟悉的 Dock 栏和桌面，so that 我可以用直觉操作而不需要学习侧边栏导航。

- **As a 效率型用户**, I want 将常用的功能（如采集库、模型配置）固定在桌面快捷方式，so that 我可以一键启动最常用的功能窗口。

- **As a 多任务工作者**, I want 打开的窗口可以拖拽排列、最小化到 Dock、通过 Dock 重新唤起，so that 我可以在多个工作上下文间灵活切换。

- **As a 暗色模式用户**, I want Agent OS 桌面模式完全支持暗色主题，so that 我在夜间工作时获得一致的视觉体验。

---

## 3. 技术规范

### 3.1 Requirements Pool

#### P0 — 必须实现（MVP 核心）

| ID | 需求 | 描述 |
|---|---|---|
| P0-01 | **OS 模式切换入口** | 在现有 TitleBar 右侧区域（窗口控制按钮左侧）新增一个切换图标按钮，点击后从"经典模式"切换到"Agent OS 桌面模式"，再次点击切回。按钮需有视觉状态区分（如高亮/填充态）。 |
| P0-02 | **桌面模式主框架** | 切换后渲染 Agent OS 页面，包含：顶部菜单栏（高度约 28px）、桌面区域（flex-1）、底部 Dock 栏（高度约 60-70px）。当前经典模式 UI（TitleBar + Sidebar + TabContent）隐藏。 |
| P0-03 | **Dock 栏功能入口** | Dock 栏展示所有现有侧边栏导航项的图标：首页、采集库、知识库、洞察分析、应用生态、模型配置、消息中心、系统设置、用户 Agent。点击 Dock 图标打开对应的功能窗口。Dock 栏居中或底部偏左布局。 |
| P0-04 | **功能窗口基础框架** | 每个功能页面以独立 `<Window>` 组件渲染，包含：标题栏（macOS 风格红黄绿圆点按钮 + 窗口标题）、内容区（渲染对应 Page 组件）。窗口默认尺寸 800×560px，初始位置桌面居中。 |
| P0-05 | **窗口拖拽与缩放** | 窗口支持标题栏拖拽移动（mousedown/mousemove 方案，不触发 Electron 原生窗口拖拽），窗口四角和边缘支持 resize（8 方向），最小尺寸 400×300px。 |
| P0-06 | **窗口控制按钮** | 红（关闭）、黄（最小化）、绿（全屏/最大化）macOS 风格圆点按钮。关闭 → 窗口移除；最小化 → 窗口隐藏，Dock 图标加下划线标记；全屏 → 窗口铺满桌面区域。 |
| P0-07 | **窗口 z-index 管理** | 点击窗口或标题栏时将该窗口提升到最顶层（z-index 自增管理），焦点窗口标题栏高亮、非焦点窗口标题栏变暗。 |
| P0-08 | **暗色模式适配** | Agent OS 桌面、Dock、窗口标题栏、窗口内容区全部使用现有 CSS 变量（`--wiki-*`），天然支持 `.dark` 类名切换及所有现有主题。 |
| P0-09 | **模式切换保留状态** | 从经典模式切到 OS 模式时，当前已打开的标签页应作为窗口还原（至少还原当前活跃标签页）。从 OS 模式切回经典模式时，恢复原有标签页视图。 |

#### P1 — 应该实现（增强体验）

| ID | 需求 | 描述 |
|---|---|---|
| P1-01 | **桌面快捷方式** | Dock 栏之外，桌面区域支持放置功能快捷方式图标（类似 macOS 桌面图标），双击打开对应窗口。快捷方式支持拖拽排列。 |
| P1-02 | **Dock 栏活跃标记** | Dock 图标下方圆点指示器：已打开窗口的图标显示圆点（类似 macOS running app indicator）。当前聚焦窗口的图标有更强视觉标记。 |
| P1-03 | **窗口最小化动画** | 最小化窗口时播放缩放动画到 Dock 对应图标位置（可用 CSS transition）。从 Dock 恢复时反向播放。 |
| P1-04 | **窗口最大化半屏吸附** | 拖拽窗口到桌面顶部边缘时吸附为最大化。可选：拖到左/右半屏实现分屏。 |
| P1-05 | **Dock 右键菜单** | 右键 Dock 图标弹出上下文菜单：打开新窗口 / 关闭所有窗口 / 固定到桌面。 |
| P1-06 | **桌面右键菜单** | 桌面空白区右键菜单：新建窗口（列出所有功能）/ 刷新桌面 / 切换壁纸。 |
| P1-07 | **桌面壁纸支持** | 桌面区域支持自定义壁纸（纯色 / 渐变 / 图片），默认使用当前主题的 `--wiki-bg`。壁纸随主题切换变化。 |

#### P2 — 可以后续实现（锦上添花）

| ID | 需求 | 描述 |
|---|---|---|
| P2-01 | **窗口分组与磁吸** | 相邻窗口拖拽时自动磁吸对齐（间距 8px），支持窗口组同步移动。 |
| P2-02 | **多桌面（Spaces）** | 顶部菜单栏支持创建多个虚拟桌面，不同桌面放置不同窗口集合，滑动切换。 |
| P2-03 | **窗口布局记忆** | 切换到经典模式再切回 OS 模式时，恢复之前的窗口位置、大小和打开状态。 |
| P2-04 | **顶部菜单栏功能菜单** | 仿 macOS 菜单栏：左侧 Apple logo + 应用名称，可展开下拉菜单（关于 / 偏好设置 / 退出等）。 |
| P2-05 | **Launchpad 模式** | Dock 栏或桌面提供 Launchpad 入口，点击后全屏展示所有功能的大图标网格（类似 macOS Launchpad）。 |
| P2-06 | **Widget 小组件** | 桌面支持放置小组件（天气、快捷笔记、系统状态等），可后续扩展。 |

### 3.2 UI Design Draft

```
┌──────────────────────────────────────────────────────┐
│  ● ● ●  Workit           [TabBar]    [🌐] [─] [□] [✕] │  ← TitleBar（经典模式）
│                                            [🖥️] ← OS 切换按钮  │
├──────────────────────────────────────────────────────┤
│                                                      │
│   ┌─────────────┐  ┌──────────────┐                 │
│   │  📁 知识库   │  │ 💬 聊天窗口   │                 │
│   │  ● ● ●      │  │  ● ● ●       │                 │
│   │────────────│  │─────────────│                 │
│   │             │  │              │                 │
│   │  内容区域   │  │  AI 对话     │                 │
│   │             │  │              │                 │
│   │             │  │              │                 │
│   └─────────────┘  └──────────────┘                 │
│        桌面区域（Desktop Area）                       │
│    🗂️ 采集库  📊 洞察  快捷方式图标                   │
│                                                      │
├──────────────────────────────────────────────────────┤
│  🏠   📊   📚   💡   🧩   ⚙️   💬   ⚙️   👤         │  ← Dock 栏
│ 首页 采集 知识 洞察 生态 模型 消息 设置 用户           │
└──────────────────────────────────────────────────────┘
```

#### 关键 UI 规格

**窗口组件（Window）规格：**
- 标题栏高度：36px，背景 `--wiki-surface`，底部边框 `--wiki-border`
- 红黄绿按钮：12px 直径圆形，间距 8px，位于标题栏左侧 padding 12px
  - 红：`#FF5F57`（关闭）| 黄：`#FFBD2E`（最小化）| 绿：`#28CA41`（全屏）
  - hover 时显示对应图标（✕ / ─ / ⤢）
- 窗口内容区：flex-1，overflow-auto
- 窗口阴影：`0 8px 32px rgba(0,0,0,0.12)`（暗色模式 `0 8px 32px rgba(0,0,0,0.4)`）
- 窗口圆角：8px（非全屏状态）
- 非焦点窗口：标题栏透明度降低，阴影减弱

**Dock 栏规格：**
- 高度：64px（含 padding）
- 背景：半透明毛玻璃效果 `rgba(255,255,255,0.72)` + backdrop-blur（暗色 `rgba(0,0,0,0.72)`）
- 图标大小：40×40px，圆角 10px
- 图标间距：4px
- hover 放大效果：scale(1.2)，transition 200ms
- Dock 位于底部居中，底部 margin 8px
- 活跃指示器：图标下方 4px 直径圆点

**桌面区域规格：**
- 背景色继承 `--wiki-bg`
- 快捷方式：80×90px 区域，图标 48×48px + 标签文字，支持双击和右键

**OS 切换按钮规格：**
- 位置：TitleBar 右侧，浏览器按钮和窗口控制按钮之间
- 图标：显示器/桌面风格图标（如 `MonitorIcon` 或 `LayoutGridIcon`）
- 激活态：背景 `--wiki-surface2`，图标色 `--wiki-accent`

### 3.3 现有功能映射表

| 经典模式侧边栏 | 菜单标识 | Dock 图标建议 | Page 组件 |
|---|---|---|---|
| 首页 | `home` | 🏠 HomeIcon | `<Home>` |
| 采集库 | `requirements` | ✨ SparklesIcon | `<Requirements>` |
| 知识库 | `knowledge` | 🗄️ DatabaseIcon | `<Knowledge>` |
| 洞察分析 | `insights` | 💡 LightbulbIcon | `<Insights>` |
| 应用生态 | `mcp` | 📦 PackageIcon | `<AppEcosystem>` |
| 模型配置 | `model` | 🔲 CpuIcon | `<Model>` |
| 消息中心 | `messages` | 💬 MessageSquareIcon | `<Messages>` |
| 系统设置 | `settings` | ⚙️ SettingsIcon | `<Settings>` |
| 用户 Agent | `profile` | 👤 UserIcon | `<Profile>` |
| 浏览器 | `browser` | 🌐 GlobeIcon | `<Browser>` |

### 3.4 架构建议

```
src/
├── components/
│   ├── agent-os/
│   │   ├── AgentOSDesktop.tsx    ← 桌面模式主容器（替代 Index 的经典布局）
│   │   ├── DockBar.tsx           ← 底部 Dock 栏
│   │   ├── DockIcon.tsx          ← Dock 单个图标
│   │   ├── DesktopArea.tsx       ← 桌面区域（壁纸 + 快捷方式）
│   │   ├── DesktopShortcut.tsx   ← 桌面快捷方式
│   │   ├── WindowManager.tsx     ← 窗口管理器（管理多个 Window 实例）
│   │   ├── Window.tsx            ← 单个窗口组件
│   │   ├── WindowTitleBar.tsx    ← 窗口标题栏（红黄绿按钮）
│   │   └── OSToggleButton.tsx    ← 模式切换按钮
│   └── ... (existing)
├── pages/
│   └── ... (existing, 复用)
├── hooks/
│   ├── useWindowManager.ts       ← 窗口状态管理 hook
│   └── useAgentOSMode.ts         ← OS 模式切换状态
└── context/
    └── AgentOSContext.tsx         ← OS 模式全局 Context
```

### 3.5 状态管理方案

**AgentOSContext 需管理的核心状态：**

```typescript
interface AgentOSState {
  isOSMode: boolean;                        // 是否处于 OS 模式
  windows: OSWindow[];                      // 当前打开的窗口列表
  activeWindowId: string | null;            // 当前焦点窗口 ID
  nextZIndex: number;                       // 下一个 z-index 值
  desktopShortcuts: string[];               // 桌面快捷方式（功能 type 列表）
  dockOrder: string[];                      // Dock 图标排列顺序
}

interface OSWindow {
  id: string;
  type: string;          // 对应 MENU_MAP 的 type
  title: string;
  x: number;             // 窗口左上角 X
  y: number;             // 窗口左上角 Y
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  params?: Record<string, any>;  // 额外参数（如 browser url）
}
```

---

## 4. 待确认问题（Open Questions）

1. **模式切换后的标签页状态**：从经典模式切换到 OS 模式时，现有打开的所有标签页是否都应转换为窗口？还是只转换当前活跃标签页？建议 MVP 阶段只转换当前活跃标签页。

2. **OS 模式独立窗口**：Agent OS 模式是仍在同一个 Electron BrowserWindow 内渲染（纯前端模拟桌面），还是每个功能窗口都是一个独立的 Electron BrowserWindow？建议使用纯前端模拟方案，性能和开发成本更优。

3. **窗口最大化的范围**：全屏窗口是铺满整个桌面区域（不含 Dock 栏），还是铺满整个 Electron 窗口（覆盖 Dock）？建议铺满桌面区域，保留 Dock 栏可见。

4. **Dock 栏浏览器入口**：当前浏览器是一个特殊标签页（始终渲染保持存活），在 OS 模式下浏览器窗口是否也复用 `display:none` 保活策略？建议每个浏览器窗口独立渲染 webview。

5. **首屏默认窗口**：首次进入 OS 模式时，是否默认打开首页窗口？还是显示空白桌面由用户自行打开？建议默认打开首页窗口。

6. **快捷键支持**：是否需要 Cmd+Tab 风格的应用切换器？建议 P2 实现。

---

*PRD 版本: v1.0 | 创建日期: 2025-07-17 | 作者: Alice (Product Manager)*
