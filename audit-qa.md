# Workit 项目功能测试与性能审查报告

> **QA 工程师**: 严过关 (Edward)  
> **审查日期**: 2025-05-29  
> **项目版本**: 1.0.8  
> **技术栈**: Electron 42 + React 19 + TypeScript + Vite + sql.js

---

## 一、功能测试

### 1. Requirements.tsx — 需求采集/列表/详情/状态流转/搜索过滤

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 1.1 | 列表空状态缺失 | **P1** | L465-468 | `requirements.map()` 在数据为空时渲染空白区域，用户无从知晓是「暂无数据」还是「加载中」。应增加空状态提示组件。 |
| 1.2 | 并行上传竞态 | **P1** | L376-377 | `Array.from(e.target.files).forEach(f => uploadImage(f))` 同时发起多个上传请求，`setUploading(true)` 只在首个调用时设置，上传状态和错误提示不可靠。应改为串行队列或批量上传接口。 |
| 1.3 | handleDelete 无错误处理 | **P1** | L357-361 | `.then(() => {...})` 缺少 `.catch()`，删除失败时用户界面无反馈，`onCloseSelf()` 仍会执行导致用户误以为删除成功。 |
| 1.4 | fetchPage 无网络异常处理 | **P1** | L220-245 | `apiFetch` 调用无 try/catch，网络断开时静默失败，用户看到的是旧数据而非错误提示。 |
| 1.5 | handleUpdate 冗余 .json() | **P2** | L347 | `.then(r => r.json())` 链式调用在统一 apiFetch 封装下冗余（apiFetch 已解析 JSON）。功能正常但增加维护困惑。 |
| 1.6 | pageSize 硬编码 | **P2** | L175 | 每页固定 10 条无用户配置入口，大量需求时翻页负担重。 |
| 1.7 | handleCreate Step2 空 catch | **P2** | L319 | `try { resetForm(); ... } catch {}` 完全吞掉异常，虽不影响核心流程但违反错误处理原则。 |

### 2. Knowledge.tsx — 知识库 CRUD / 文档上传

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 2.1 | 编辑器条件重建 | **P1** | L119-133 | `useEditor` 依赖 `[isEditing]`，每次进入编辑模式创建全新 Tiptap 实例。频繁切换编辑/预览会导致性能抖动和内存增长。建议改用 `editor?.commands.setContent()` 复用实例。 |
| 2.2 | 文档列表无加载状态 | **P1** | L138-145 | `fetch` 请求期间无 loading 指示器，切换分类时用户可能看到旧数据闪烁。 |
| 2.3 | 分类管理仅存 localStorage | **P1** | L110-114 | 分类（Category）CRUD 仅操作 `localStorage` 和组件 state，不同步到后端数据库。重装应用或清除缓存后分类丢失。 |
| 2.4 | 文件上传无进度 | **P2** | L221-257 | `for...of` 循环上传多文件，单文件失败不影响其他，但用户无法获知整体进度。 |
| 2.5 | AI 总结结果未持久化 | **P2** | L311-319 | `handleAISummary` 仅修改组件内 `showDoc` 的 content，未调用后端保存，刷新页面后 AI 总结丢失。 |
| 2.6 | Office 预览加载无超时 | **P2** | L208-217 | `fetchDocPreview` 无超时机制，后端转换慢时用户会看到无限加载。 |

### 3. Dashboard.tsx — 仪表盘统计

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 3.1 | Promise.all 无错误处理 | **P1** | L52-62 | 三个 API 任一失败会导致整个仪表盘白屏，`loading` 永远为 `true`。应使用 `Promise.allSettled` 或独立 try/catch。 |
| 3.2 | "查看全部"按钮无跳转 | **P2** | L168 | 活动列表「查看全部」按钮无 onClick 处理，纯视觉装饰。 |

### 4. Insights.tsx — AI 洞察分析

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 4.1 | Promise.all 无错误处理 | **P1** | L22-33 | 与 Dashboard 相同问题，任一 API 失败导致页面空白。 |
| 4.2 | 「刷新」「导出报告」按钮无功能 | **P1** | L86-93 | 两个按钮仅渲染视觉样式，`onClick` 未绑定任何处理函数。用户点击无反应。 |
| 4.3 | AI 洞察 GET 返回非数组 | **P2** | L29-31 | `Array.isArray(insightsData)` 检查在非数组时静默忽略，用户看到的是「尚未生成」而非错误提示。 |

### 5. Model.tsx — 模型配置 CRUD + API 密钥管理

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 5.1 | **CircleIcon 未导入（运行时崩溃）** | **P0** | L169 | `{m.hasApiKey ? <CheckCircleIcon .../> : <CircleIcon .../>}` — `CircleIcon` 不在页面 imports 中。虽 `unplugin-auto-import` 理论上自动注入，但 `CircleIcon` 不在 lucide 导出列表中 (lucide 中该图标名为 `Circle` 非 `CircleIcon`)。**运行时必崩**。 |
| 5.2 | handleTestConnection 无 fallback 提示 | **P1** | L69-73 | `electronAPI` 不可用时，没有 toast 提示用户必须在 Electron 环境下测试，用户体验困惑。 |
| 5.3 | 编辑时 API Key 强制清空 | **P2** | L113 | `handleEdit` 硬编码 `apiKey: ''`，虽出于安全考虑，但未提示用户"不修改请留空"。 |
| 5.4 | handleSubmit 未验证 modelId | **P2** | L80-109 | 仅验证 `form.apiKey` 非空，未检查 `form.modelId`，可能提交空 modelId 导致后端异常。 |

### 6. MCP.tsx — MCP 工具配置

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 6.1 | AddServerModal 无校验反馈 | **P1** | L177-178 | `if (!name || !command) return;` — 仅静默返回，无 toast 或输入框高亮提示用户填写必填项。 |
| 6.2 | toggleServer 发送冗余数据 | **P1** | L36-43 | 发送完整 `{...server, enabled: !server.enabled}` 到 PUT 接口，包含 args、env、config 等不应变更的字段。 |
| 6.3 | saveToken 无错误处理 | **P2** | L52-63 | API 调用无 `.catch()`，失败时用户无法获知。 |

### 7. Settings.tsx — 系统设置 + 自动更新

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 7.1 | 自动更新流程脆弱 | **P1** | L62-79 | 下载分为 `checkForUpdate` + `downloadUpdate` 两步，中间无超时保护。若 `downloadUpdate` 卡住，进度条永远停在 0%。 |
| 7.2 | setTimeout 无清理 | **P2** | L76 | 3 秒后清除错误消息的 timer 在组件卸载时未取消，可能导致内存泄漏警告。 |

### 8. Browser.tsx — 内嵌浏览器

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 8.1 | **webview 事件监听器泄漏** | **P0** | L115-140 | `wvRefCallback`（ref callback）每次渲染都执行，绑定新的 `addEventListener`；cleanup effect (L135-140) 仅在 unmount 时运行。re-render 时旧监听器未移除，导致**事件重复触发和内存泄漏**。应将事件绑定移至 `useEffect` 中，或使用 `useRef` 追踪已绑定状态。 |
| 8.2 | 空 try/catch 吞掉所有 webview 错误 | **P1** | L79-88 | `handleWebviewLoad` 整体包裹 `try {} catch {}`，所有 webview 异常完全静默。 |
| 8.3 | navigateTo 静默忽略空 URL | **P1** | L60-68 | `if (!u) return;` — 用户粘贴空白内容后无任何反馈。 |

### 9. QuickCapture.tsx — 粘贴解析/文件上传/提交

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 9.1 | paste handler 复杂度过高 | **P1** | L440-629 | 单个 `useEffect` 内 190 行逻辑，混合了浏览器 clipboard、Electron IPC、文件路径解析、HTML 解析、fallback 等。极度难以测试和维护。应拆分为独立函数和 hook。 |
| 9.2 | 大量空 catch 块 | **P2** | 多处 | `try {} catch {}` 在多处用于跳过不支持的 clipboard API，但完全静默不利于调试。 |
| 9.3 | 提交中文件上传错误静默 | **P1** | L867-877 | `handleSubmit` 中 data: URL 文件上传失败仅 `console.error`，用户不知道部分文件未成功上传。 |

### 10. ContentBlockRenderer.tsx — 文字/图片/视频/文件/表格渲染

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 10.1 | **blob URL 内存泄漏** | **P1** | L205 | `resolveEmbedUrl` 调用 `URL.createObjectURL(blob)` 但从不调用 `URL.revokeObjectURL()`。每次打开 PDF/Office 文件的详情页都创建新 blob URL 且不回收。 |
| 10.2 | FileBlock 组件过大 | **P2** | L188-376 | 单个组件 ~190 行处理 PDF、Office (data:/http:)、空内容、手动上传 5+ 种状态。建议拆分。 |

---

## 二、性能审查

### 1. Bundle 体积分析

| 产物 | 大小 | 问题 |
|------|------|------|
| `dist/` 总计 | **2.7 MB** | 作为 Electron 桌面应用可接受，但仍有优化空间 |
| `vendor-react` | 556 KB | React 19 + ReactDOM，正常范围 |
| `vendor-recharts` | 377 KB | **P2**：Dashboard 和 Insights 才使用，但被**主动加载**（非 lazy）。recharts 应随页面的动态 import 按需加载 |
| `xlsx` | 420 KB | xlsx 已是动态 import（OfficePreview 懒加载），实际按需加载 ✅ |
| `index` (主 bundle) | 491 KB | 主入口偏大，包含路由、公共组件、Auth 等 |
| `vendor-icons` | (未独立分块) | lucide-react icons 通过 auto-import 注入但可能未被 tree-shaking 有效拆出，建议验证 vendor-icons chunk 是否存在 |

**建议**:
- **P1**: 验证 `vendor-icons` 分块策略是否生效（当前 dist 中未见独立 icons chunk）
- **P2**: 将 recharts 改为页面级懒加载，减少首屏下载量约 377KB
- **P2**: 对 `index-L9-li1Ri.js` (491KB) 作进一步 code splitting，可将路由页面级组件独立分块

### 2. React 渲染性能

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 2.1 | useMemo 过度使用 | **P2** | Requirements.tsx L268-278 | `statusStats` 使用 `useMemo` 但依赖 `allStatusCounts`（state），每次 counts 变化必然重建，memo 未省去计算且增加内存开销。简单数组格式化的 memo 反而有损性能。 |
| 2.2 | knowledge editor 重建 | **P1** | Knowledge.tsx L119-133 | 依赖 `[isEditing]` 导致每次编辑/取消都完整销毁+重建 Tiptap。应改为条件渲染 EditorContent + content 切换。 |
| 2.3 | fetchPage 依赖 pageSize 常量 | **P2** | Requirements.tsx L245 | `useCallback` 依赖数组包含 `pageSize`，该值从不变化但每次渲染被重新比较。虽不影响行为但增加 deps 噪音。 |
| 2.4 | Browser ref callback 不稳定 | **P2** | Browser.tsx L115-133 | `wvRefCallback` 每次渲染可能被调用（React ref callback 行为），结合 P0 事件泄漏问题，频繁创建新回调。 |

### 3. 数据库查询

当前使用 sql.js（SQLite 编译为 WASM），前后端通过 Electron IPC 通信。API 层的 `apiFetch` 统一封装了 ipc→db 和 fetch→express 两条路径。

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 3.1 | 列表页每次切筛选都全量查 count | **P2** | Requirements.tsx L200 | `fetchPage(1)` 同时拉取 `data.counts`（全状态统计），与分页数据同一请求，已合理优化 ✅ |
| 3.2 | Knowledge 重复拉取全量文档 | **P2** | Knowledge.tsx L138-145 + L163-176 | 页面初始化时两次 `fetch('/api/documents')`：一次渲染列表，一次统计分类计数。可合并为一次全量请求。 |

### 4. 内存管理

| # | 问题 | 优先级 | 位置 | 描述 |
|---|------|--------|------|------|
| 4.1 | blob URL 泄漏 | **P1** | ContentBlockRenderer.tsx L205 | 详见功能测试 10.1。每次文件预览创建 blob URL 不回收。 |
| 4.2 | webview 事件监听器泄漏 | **P0** | Browser.tsx L115-140 | 详见功能测试 8.1。re-render 导致监听器叠加。 |
| 4.3 | Settings setTimeout 泄漏 | **P2** | Settings.tsx L76 | 3 秒清除错误消息的 timer 无 cleanup。 |
| 4.4 | autoAnalyzeRef timer 清理完整 ✅ | — | Requirements.tsx L193 | `useEffect(() => () => clearTimeout(...))` 正确清理。 |

### 5. 加载策略

| # | 问题 | 优先级 | 描述 |
|---|------|--------|------|
| 5.1 | recharts 非 lazy | **P2** | Dashboard + Insights 都直接 import recharts，而非常用页面。建议改为 `React.lazy(() => import('./Dashboard'))` |
| 5.2 | 页面级 lazy loading ✅ | — | 大部分页面已通过路由级 code splitting 实现懒加载（Knowledge-*.js、Requirements-*.js 等独立 chunks）。 |
| 5.3 | OfficePreview 懒加载 ✅ | — | `lazy(() => import('./OfficePreview'))` 配合 Suspense，正确。 |
| 5.4 | 无 Service Worker / 预缓存 | **P2** | Electron 环境下可借助 `protocol.registerFileProtocol` 实现离线缓存策略。 |

---

## 三、汇总统计

| 优先级 | 数量 | 关键项 |
|--------|------|--------|
| **P0** | 2 | CircleIcon 未导入（Model.tsx）、webview 事件监听器泄漏（Browser.tsx） |
| **P1** | 20 | 错误处理缺失、Promise.all 无 catch、blob URL 泄漏、编辑器重建、分类不持久化等 |
| **P2** | 19 | 代码组织、Bundle 优化、冗余代码、小优化项 |

**总计**: 41 个问题

### 发布阻塞项 (P0)

| # | 模块 | 问题 |
|---|------|------|
| 1 | Model.tsx:169 | `CircleIcon` 未导入/不存在，打开模型配置页 → 运行时崩溃（白屏） |
| 2 | Browser.tsx:115-140 | webview ref callback 每次渲染叠加事件监听器，长时间使用后内存持续增长 + 事件重复触发 |

---

*报告生成时间: 2025-05-29 | QA Engineer: Edward (严过关)*
