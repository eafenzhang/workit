# Workit 功能完整性审计报告

> **审计人**: 严过关 (Edward) — QA Engineer  
> **审计日期**: 2025-07-08  
> **审计范围**: 全部页面 (9个) + 核心组件 (6个)  
> **审计维度**: CRUD 完整性 / 边界条件 / 错误处理 / 状态管理 / 数据一致性 / 路由完整性

---

## 一、总览评分

| 维度 | 评分 | 说明 |
|------|------|------|
| CRUD 完整性 | ⭐⭐⭐⭐ (8/10) | 核心页面 CRUD 完整，MCP 缺少编辑功能 |
| 边界条件 | ⭐⭐⭐ (6/10) | 多数页面缺超长文本截断、特殊字符处理 |
| 错误处理 | ⭐⭐⭐⭐ (7/10) | 大部分有 try/catch + toast，但部分静默吞错 |
| 状态管理 | ⭐⭐⭐⭐ (8/10) | loading/empty/error/success 四态覆盖较全 |
| 数据一致性 | ⭐⭐⭐ (7/10) | 前后端 API 路径基本匹配，部分参数命名不一致 |
| 路由完整性 | ⭐⭐⭐⭐ (8/10) | 所有页面可访问，含 404 兜底 |

**综合评分: 7.3/10**

---

## 二、页面逐页审查

### 1. Home.tsx — AI 对话首页

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **CRUD 完整性** | ✅ | 新对话/历史对话浏览/删除对话均实现 |
| **状态管理** | ✅ | 含 sending (loading)、empty (欢迎页)、error (catch 分支) |
| **边界条件** | ⚠️ | 对话标题 `slice(0,30)` 轻微截断，但无超长消息处理；对话列表无限增长无上限 |
| **错误处理** | ⚠️ | API 失败有 catch 但仅显示 `未知错误`，无重试按钮；非 Electron 环境返回硬编码提示 |
| **数据一致性** | ✅ | `HomeSendPayload` 类型匹配 `chatSend` IPC 参数 |
| **特有问题** | ⚠️ | `useEffect` 依赖 `messages` 导致每次发消息后重连 listener；conversations 未设置最大数量上限 |

**评级: B+**

---

### 2. Requirements.tsx — 需求采集库

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **CRUD 完整性** | ✅ | Create/Read/Update/Delete 完整，含状态流转 |
| **状态管理** | ✅ | loading spinner、empty 列表、API 错误静默降级 |
| **搜索过滤** | ✅ | 关键词搜索(300ms debounce)、状态/优先级/模块/日期/负责人过滤 |
| **分页** | ✅ | 服务端分页，pageSize=10，上一页/下一页 |
| **边界条件** | ⚠️ | `filterAssigneeInput` 初始值 `'全部'`（与 `filterAssignee` 同），边界不清；日期范围无校验（from > to 无提示） |
| **错误处理** | ⚠️ | `fetchPage` catch 为空 — 网络错误时用户看不到任何反馈（静默保持旧数据） |
| **数据一致性** | ⚠️ | 前端 `Requirement` 接口与后端字段不完全一致（`workflowHandler`/`workflowHistory`/`contentBlocks` 后端可能不返回） |
| **特有问题** | ⚠️ | 编辑返回按钮逻辑复杂（`localView` 与 `initialTab` 两种状态源）；`handleCreate` 中 `res.data` 用法与 `apiFetch` 返回的 `{json, data}` 不一致 — 可能取不到 id |

**评级: B**

---

### 3. Knowledge.tsx — 知识库

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **CRUD 完整性** | ✅ | 文档 CRUD + 分类 CRUD + 文件上传 + AI 总结 |
| **状态管理** | ✅ | loading/empty/error 三态覆盖，文件内容加载含 `__loading__` / `null` 区分 |
| **富文本编辑器** | ✅ | TipTap 编辑器完整工具栏（粗体/斜体/H1-H3/列表/引用/代码块/图片/链接/撤销重做） |
| **边界条件** | ⚠️ | `DOMPurify.sanitize` 用于 XSS 防护但仅用于渲染侧 — API 侧无校验；大文件上传无进度条 |
| **错误处理** | ⚠️ | `handleSaveEdit` 返回 `Promise<any>` 但调用 `.then()` 时可能触发未捕获异常 |
| **数据一致性** | ⚠️ | 文档类型 `type` 与上传文件扩展名映射有上限但非穷举（仅列表中的格式）；分类使用 `name` 作为前端 id 可能导致同名冲突 |
| **特有问题** | ⚠️ | `handlePasteImage` 与 `handleDropImage` 重复调用 `handleImageUpload` 但实现不同；编辑器 `useEditor` 创建时 `content: ''` — 切换文档时依赖 `useEffect` 同步内容 |

**评级: B+**

---

### 4. Insights.tsx — 洞察分析

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **CRUD 完整性** | N/A | 只读页面，无 CRUD 需求 |
| **状态管理** | ✅ | KPI/图表/AI 洞察 三块各自独立 loading/error/success，骨架屏优雅 |
| **边界条件** | ⚠️ | KPI 空数组无 empty 状态提示；图表数据为空时显示空白区域而非空状态 |
| **错误处理** | ✅ | 各块有独立重试按钮，AI 洞察有 POST 生成 + 错误展示 |
| **数据一致性** | ⚠️ | `handleExport` 引用 `activities` 变量但该变量已从代码中删除 — **编译错误风险** |
| **特有问题** | ⚠️ | `apiFetch(API.insights.aiInsights)` GET 方式 path 为 `/api/insights/ai-insights` 但后端 table 解析可能出错（`ai-insights` 含横杠） |

**评级: B**

---

### 5. Model.tsx — 模型配置

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **CRUD 完整性** | ✅ | Create/Read/Update/Delete + 启用/禁用 + 设为默认 + 连接测试 |
| **状态管理** | ✅ | loading spinner、empty 引导、表单验证 + saving/testing 状态 |
| **边界条件** | ✅ | API Key 使用 password 输入框隐藏；编辑时 Key 留空不覆盖 |
| **错误处理** | ✅ | 表单校验 + toast 错误 + API 失败静默 |
| **数据一致性** | ⚠️ | `setDefault` 发 `{is_default: true}` (snake_case)，后端可能期望 camelCase `isDefault` |
| **特有问题** | ✅ | 9 家供应商硬编码在前端，后端模型列表通过 API 获取，合理设计 |

**评级: A-**

---

### 6. MCP.tsx — MCP 工具

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **CRUD 完整性** | ⚠️ | Create/Read/Delete/Toggle + 导入导出 + Token 管理；**缺少编辑 (Update) 功能** |
| **状态管理** | ✅ | loading/empty/表单验证/saving 状态 |
| **边界条件** | ⚠️ | 无服务器数量上限；导入无格式校验（非 JSON 会报错但不友好） |
| **错误处理** | ✅ | try/catch + toast；API 失败静默 |
| **数据一致性** | ⚠️ | 导入使用 `/api/mcp_servers`，列表使用 `/api/mcp` — 路径不统一；`toggleServer` 发送完整 server 对象（PUT）但可能不包含所有字段 |
| **特有问题** | ⚠️ | `AddServerModal` 中 `env` 固定为空对象，无自定义环境变量输入 |

**评级: B-**

---

### 7. Settings.tsx — 系统设置

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **CRUD 完整性** | N/A | 配置型页面，非 CRUD |
| **二级菜单** | ✅ | 8 个子导航（系统/外观/采集/AI/API/更新/数据/关于）完整 |
| **状态管理** | ✅ | 各模块有独立状态，更新检查含 6 态（idle/checking/available/downloading/ready/error） |
| **边界条件** | ✅ | API 端点 URL 正则校验 + onBlur；超时范围 1-300 校验 |
| **错误处理** | ✅ | 更新检查含 30s 超时 + 错误展示 + 重试 |
| **数据一致性** | ✅ | 使用 localStorage 持久化，与 QuickCapture toggle 事件联动 |
| **特有问题** | ⚠️ | `_updStatus` 等模块级变量不是 React 状态，跨组件共享不可靠；清理缓存时可能误删用户自定义 CSS |

**评级: A-**

---

### 8. Profile.tsx — 用户信息

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **CRUD 完整性** | ✅ | Read/Update + Reset（通过 save/reset 实现） |
| **状态管理** | ✅ | isDirty 追踪、nickname 长度校验、角色切换确认 |
| **边界条件** | ✅ | 昵称 2-20 字符限制，maxLength 属性 |
| **错误处理** | ✅ | validation + toast 错误提示 |
| **数据一致性** | ✅ | 使用 `useAuth().saveProfile` 保持上下文同步 |
| **特有问题** | ⚠️ | `handleRoleChange` 的 confirm 仅在 `isDirty && personality && memorySkills` 全真时触发；如果只有 nickname 被修改（personality 为空），切换角色不会警告 |

**评级: A**

---

### 9. Browser.tsx — 内嵌浏览器

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **CRUD 完整性** | N/A | 浏览器功能页面，非 CRUD |
| **功能完整性** | ✅ | URL 导航、前进/后退/刷新、书签(收藏/取消)、历史记录、外部浏览器打开 |
| **状态管理** | ✅ | webview loading 进度条、空状态引导、书签同步 |
| **边界条件** | ✅ | 书签上限 30、历史上限 100、URL 自动补全 https |
| **错误处理** | ⚠️ | webview 加载失败无用户可见错误提示（静默失败） |
| **数据一致性** | ✅ | 书签/历史通过 localStorage + CustomEvent 实现多标签同步 |
| **特有问题** | ⚠️ | `webview` 的 `src` 属性变更会触发重载（setUrl 导致一次不必要的重渲染）；`handleWebviewLoad` 中 `setUrl` 逻辑存在死循环风险 |

**评级: B+**

---

## 三、组件逐组件审查

### 1. QuickCapture.tsx — 快速采集

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **功能完整性** | ✅ | 粘贴解析（文本/图片/视频/文件/表格）、文件上传、拖拽排序、全屏预览 |
| **状态管理** | ✅ | modal 打开/关闭、采集列表管理、上传 loading |
| **边界条件** | ⚠️ | 大文件 base64 编码可能阻塞、无采集项数量上限 |
| **错误处理** | ⚠️ | 多处 `catch { /* ignore */ }` 静默吞错 |
| **数据一致性** | ⚠️ | 提交发送 `content_blocks`(snake_case) 但 `apiFetch` 中 body 序列化后 key 不变，需确认后端支持 |
| **特有问题** | ⚠️ | 浮动按钮拖拽逻辑在 `mouseDown` 中同时处理拖拽和点击（`mouseUp` 中判断移动距离），可能误触发 |

**评级: B+**

---

### 2. ContentBlockRenderer.tsx — 统一渲染

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **功能完整性** | ✅ | 文字/图片/视频/文件/表格 5 种类型全覆盖 |
| **状态管理** | ✅ | 空内容处理(title/placeholder)、图片 lightbox、视频全屏 |
| **边界条件** | ✅ | 空图片/空视频/空文件/空表格均有占位提示 |
| **错误处理** | ✅ | 视频 `onError` 切换为失败提示、文件 blob URL 清理 |
| **数据一致性** | ✅ | `ContentBlock` 类型与接口定义严格对应 |
| **特有问题** | ⚠️ | `imageIndexMap` 使用 mutable 变量跟踪（`let map: number[]`），非纯函数式；多次调用可能产生错误映射 |

**评级: A-**

---

### 3. ProfileWizard.tsx — 用户创建向导

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **功能完整性** | ✅ | 三步骤（昵称→角色→确认）+ 返回 + 校验 |
| **状态管理** | ✅ | 步骤状态、表单验证、禁用态 |
| **边界条件** | ✅ | 昵称长度 2-20，必填校验 |
| **错误处理** | ✅ | 内联错误提示 |
| **数据一致性** | ✅ | onComplete 回调返回标准 UserProfile |
| **特有问题** | ⚠️ | 角色选择步骤允许跳过（不选角色直接下一步亦可但按钮 disabled），UX 可优化 |

**评级: A**

---

### 4. HomeInput.tsx — 首页输入框

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **功能完整性** | ✅ | 文本输入、模型选择下拉、MCP 开关、发送按钮 |
| **状态管理** | ✅ | disabled/empty 禁用态、auto-height |
| **边界条件** | ✅ | max-height 160px、1分钟缓存过期 |
| **错误处理** | ⚠️ | providers/MCP 加载失败静默 |
| **数据一致性** | ⚠️ | 使用 `apiFetch(API.models)` 但 `API.models` 是字符串，而 `apiFetch` 返回 `{json, data}` — 调用方式不一致 |
| **特有问题** | ⚠️ | 模型选择器 popover 无点击外部关闭逻辑 |

**评级: B**

---

### 5. Sidebar.tsx — 侧边栏导航

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **功能完整性** | ✅ | 7 个导航项 + 设置 + 用户信息 |
| **状态管理** | ✅ | active/collapsed 状态 + hover tooltip |
| **边界条件** | ✅ | 折叠态隐藏内容仅图标 |
| **错误处理** | N/A | 纯 UI 组件 |
| **数据一致性** | ✅ | navItems 与 MENU_MAP(Index) 保持一致 |
| **特有问题** | ⚠️ | 存在 `messages` 导航项但 Messages 页面仅为占位（"暂无消息内容"），功能未实现 |

**评级: A-**

---

### 6. TitleBar.tsx — 自定义标题栏

| 审查项 | 状态 | 发现 |
|--------|------|------|
| **功能完整性** | ✅ | 侧边栏切换、浏览器按钮、窗口控制（最小化/最大化/关闭） |
| **状态管理** | ✅ | maximized 状态通过 IPC 监听 |
| **边界条件** | ✅ | WebkitAppRegion drag/no-drag 正确设置 |
| **错误处理** | ⚠️ | `api?.isMaximized?.()` 失败无 fallback |
| **数据一致性** | ✅ | 与 Electron API 接口对齐 |
| **特有问题** | ✅ | 无 |

**评级: A**

---

## 四、全局性问题

### 4.1 API 路径不一致

| 页面/组件 | 使用的路径 | 问题 |
|-----------|-----------|------|
| MCP.tsx 导入 | `/api/mcp_servers` | 与列表路径 `/api/mcp` 不一致 |
| MCP.tsx toggle | `/api/mcp/${id}` PUT | 发送完整 server 对象，可能覆盖后端字段 |
| HomeInput.tsx | `apiFetch(API.models)` | `API.models` = `/api/models` 字符串，`apiFetch` 返回 `{json, data}`，未解包 |
| Insights.tsx export | 引用 `activities` | 该变量已被删除，会导致运行时 ReferenceError |

### 4.2 错误处理模式不一致

| 模式 | 位置 | 问题 |
|------|------|------|
| `catch { /* ignore */ }` | QuickCapture, MCP, Model | 用户无法得知操作失败 |
| `catch { toast.error(...) }` | Requirements, Knowledge | 好的实践 |
| `catch (e) { setMessages(...) }` | Home | 好的实践（显示错误消息） |
| `catch { setLoading(false) }` | Model | 静默失败但至少退出 loading |

### 4.3 数据竞态条件

- Requirements 的 `fetchPage` 在快速切换筛选条件时可能产生竞态（旧请求的响应覆盖新请求的结果）
- Knowledge 的 `setShowDoc` 切换时 `fileContent`/`previewHtml` 的异步加载未取消前一个请求

### 4.4 XSS 防护

- Knowledge.tsx 使用 `DOMPurify.sanitize` 对用户输入 HTML 做清理 ✅
- Home.tsx 对话消息直接渲染，无 HTML 转义 ⚠️（`whitespace-pre-wrap` + `break-words` 只做 CSS 处理）
- ContentBlockRenderer 文本块直接渲染，无 XSS 防护 ⚠️

### 4.5 localStorage 依赖

多处使用 localStorage 无 try/catch（隐私模式下可能抛异常）：
- Home.tsx (LS_KEY, CONV_KS)
- QuickCapture.tsx (qc-float-x/y)
- Settings.tsx (多处)
- Profile.tsx (通过 profileStorage)

---

## 五、问题清单（按严重程度排序）

### 🔴 严重 (Critical)

| # | 位置 | 问题描述 | 影响 |
|---|------|---------|------|
| CR-1 | Insights.tsx L185 | `handleExport` 引用已删除的 `activities` 变量 | **运行时崩溃** |
| CR-2 | Requirements.tsx L326 | `res.data` 可能为 undefined — `apiFetch` 在 Electron 模式返回 `{json, data}` 但 IPC 可能直接返回原始数据 | **创建需求可能失败** |

### 🟠 重要 (Major)

| # | 位置 | 问题描述 | 影响 |
|---|------|---------|------|
| MJ-1 | MCP.tsx | 缺少编辑(Update)功能 | **功能缺失** |
| MJ-2 | Knowledge.tsx | 编辑器内容同步依赖 useEffect，切换文档时可能丢失未保存内容 | **数据丢失** |
| MJ-3 | Model.tsx L141 | `setDefault` 发送 `is_default`(snake_case)，与后端字段可能不匹配 | **设置默认失败** |
| MJ-4 | HomeInput.tsx L40 | `apiFetch(API.models)` 调用方式错误 — 传入字符串而非 URL | **模型列表加载失败** |

### 🟡 一般 (Minor)

| # | 位置 | 问题描述 | 影响 |
|---|------|---------|------|
| MN-1 | Requirements.tsx | `fetchPage` catch 为空，静默保持旧数据 | **用户体验差** |
| MN-2 | Home.tsx | 对话列表无上限，localStorage 可能撑满 | **性能下降** |
| MN-3 | QuickCapture.tsx | 大文件 base64 编码阻塞 UI | **体验卡顿** |
| MN-4 | Settings.tsx | `_updStatus` 模块级变量非 React 响应式 | **状态可能不同步** |
| MN-5 | ContentBlockRenderer.tsx | `imageIndexMap` 使用 mutable 非纯函数 | **潜在映射错误** |

### 🔵 建议 (Suggestion)

| # | 位置 | 建议 |
|---|------|------|
| SG-1 | 全局 | 统一使用 `API` 常量中定义的路径，消除散落字符串 |
| SG-2 | Home.tsx | 添加对话历史搜索功能 |
| SG-3 | Browser.tsx | 添加页面加载失败的错误提示 |
| SG-4 | MCP.tsx | 添加环境变量自定义输入 |
| SG-5 | Knowledge.tsx | 文档上传添加进度条 |
| SG-6 | HomeInput.tsx | 模型选择 popover 添加点击外部关闭 |
| SG-7 | Requirements.tsx | 添加批量操作（批量删除/批量变更状态） |
| SG-8 | 全局 | 为 localStorage 操作添加 try/catch 包裹 |

---

## 六、路由完整性验证

| 路由 | 页面 | 可访问 | 备注 |
|------|------|--------|------|
| `home` | Home.tsx | ✅ | 默认首页 |
| `requirements` / `requirements-detail` / `requirements-create` / `requirements-edit` | Requirements.tsx | ✅ | 多视图模式 |
| `knowledge` / `knowledge-detail` / `knowledge-create` / `knowledge-edit` | Knowledge.tsx | ✅ | 多视图模式 |
| `insights` | Insights.tsx | ✅ | |
| `model` | Model.tsx | ✅ | |
| `mcp` | MCP.tsx | ✅ | |
| `messages` | Messages.tsx | ✅ | 占位页面（功能未实现） |
| `settings` | Settings.tsx | ✅ | |
| `profile` | Profile.tsx | ✅ | |
| `browser` | Browser.tsx | ✅ | 支持多标签 |
| `login` | Login.tsx | ✅ | 存在但可能是遗留代码 |
| `*` (404) | NotFound.tsx | ✅ | 兜底 |

---

## 七、总结

**Workit 功能完整性总体良好**，核心业务流程（需求管理、知识库、模型配置）的 CRUD 基本完整，状态管理（loading/empty/error/success）覆盖较好。

**需要立即修复的 2 个严重问题：**
1. Insights.tsx 导出功能引用已删除变量
2. Requirements.tsx 创建需求可能因 `res.data` 为空而失败

**建议优先修复的 4 个重要问题：**
1. MCP 缺少编辑功能
2. Knowledge 编辑器内容同步机制
3. Model 设置默认的字段命名
4. HomeInput 模型列表加载方式

---

*报告结束 — 严过关 (Edward)*
