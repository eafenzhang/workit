# Workit 架构、性能与数据存储审计报告

> **审计人**：高见远（架构师）  
> **审计日期**：2025-05-31  
> **项目**：Workit — 智能体工作台  
> **技术栈**：Electron 42 + React 19 + TypeScript + Vite + sql.js + Tailwind CSS

---

## 一、架构审查

### 1.1 模块化

| 维度 | 评级 | 说明 |
|------|------|------|
| 主进程拆分 | ⚠️ 良好但有改进空间 | 5 个模块职责基本清晰，但 `window.cjs` (623行) 和 `ipc.cjs` (492行) 过大 |
| 循环依赖 | ✅ 无 | 依赖链: `main.cjs → database.cjs / ipc.cjs / window.cjs / updater.cjs`，`ipc.cjs → database.cjs + window.cjs`，无循环 |
| 模块职责边界 | ⚠️ 需关注 | `window.cjs` 混杂了窗口管理、托盘、剪贴板、文件读取、模型测试、扩展管理等 7 种职责 |
| 命名一致性 | ⚠️ 不一致 | 主进程用 CJS (`require`/`module.exports`)，渲染进程用 ESM (`import`/`export`)，跨边界时类型不互通 |

**`window.cjs` 职责拆分建议**：

```
当前 window.cjs (623行) 包含:
  ├── 窗口创建与管理        (~80行)
  ├── 托盘管理              (~40行)
  ├── IPC: 设置相关          (~30行)
  ├── IPC: QC窗口            (~60行)
  ├── IPC: 剪贴板读取         (~250行) ← 最大块
  ├── IPC: 本地文件读取       (~30行)
  ├── IPC: 模型连接测试       (~40行)
  ├── IPC: 扩展安装           (~15行)
  └── IPC: 其他               (~30行)

建议拆分为:
  electron/window.cjs      — 窗口创建 + 托盘 + QC窗口
  electron/clipboard.cjs   — 剪贴板相关 IPC handlers
  electron/file-ops.cjs    — 文件读取、扩展安装、外部打开
```

**`ipc.cjs` 职责拆分建议**：当前 492 行涵盖了 requirements/documents/mcp/models/insights/knowledge_categories/storage/stats 的 CRUD + AI 调用路由。建议将 insights 相关 handler 提取到 `electron/insights.cjs`。

### 1.2 IPC 安全

| 检查项 | 状态 | 详情 |
|--------|------|------|
| contextIsolation | ✅ | `contextIsolation: true`，`nodeIntegration: false` |
| preload 暴露范围 | ✅ | 仅暴露必要 API，未暴露 `ipcRenderer` 原始对象 |
| API Key 加密存储 | ✅ | `safeStorage.encryptString()` + base64 编码 |
| API Key 解密使用 | ✅ | `decryptApiKey()` 有明文回退兼容逻辑 |
| QC 窗口权限隔离 | ✅ | QC 窗口仅允许 `GET requirements`，其他操作返回 `Access denied` |
| 方法白名单 | ✅ | `ALLOWED_METHODS = ['GET','POST','PUT','DELETE']` |
| 动态表名白名单 | ✅ | `ALLOWED_TABLES` 验证所有动态 SQL 表名 |
| 动态字段白名单 | ✅ | `MCP_FIELDS` / `MODEL_FIELDS` Map 验证 PUT 操作字段 |
| 导航限制 | ✅ | 仅允许 `localhost:5173`、`file://`、`localhost` |
| XSS 防护 (DOMPurify) | ✅ | Knowledge 编辑器内容使用 DOMPurify 净化 |
| executeJavaScript 替代 | ✅ | P0-06 已替换为 `webContents.send` |

**🔴 严重问题**：

1. **`read-local-file` IPC handler（window.cjs:298）允许渲染进程读取任意本地文件路径**。攻击者可通过 XSS 或恶意扩展读取用户系统中的任意文件（包括 SSH 密钥、浏览器 cookie 等）。应限制为仅允许读取 `userData/uploads/` 和 `app.getPath('temp')` 下的文件。

2. **`test-model-connection` IPC handler（window.cjs:169）接收明文 `apiKey` 参数**。虽然这是测试连接的场景，但 API Key 通过 IPC 以明文传输。建议让渲染进程传递 `modelId`，由主进程从加密存储中读取并解密 API Key。

**🟡 中等问题**：

3. **`install-extension` IPC handler（window.cjs:570）中 `extId` 直接拼入路径**：`path.join(app.getPath('userData'), 'extensions', extId)`。应验证 `extId` 仅包含安全字符（如 `/^[a-zA-Z0-9_-]+$/`），防止路径穿越。

4. **`open-path-external` IPC handler（window.cjs:559）可打开任意路径**：应限制为已记录的文件路径（如从数据库查询 `file_path` 字段）或 `userData` 下的文件。

### 1.3 类型安全

| 检查项 | 状态 | 详情 |
|--------|------|------|
| ElectronAPI 类型声明 | ✅ | `electron.d.ts` 有完整声明 |
| ContentBlock 类型守卫 | ✅ | `isContentBlock()` + `isValidContentBlocks()` |
| 枚举类型 | ✅ | `RoleKey`、`BlockType` 使用字面量联合类型 |

**🔴 严重问题**：

5. **`api.ts` 核心函数返回 `Promise<any>`**：`call()` 和 `apiFetch()` 的返回值完全无类型约束。这是整个前端数据流的入口，`any` 类型导致下游所有数据使用都失去类型检查。

```typescript
// 当前
async function call(method: string, table: string, data?: any, id?: number | string): Promise<any>

// 建议
async function call<T = unknown>(method: string, table: string, data?: unknown, id?: number | string): Promise<T | { error: string }>
```

6. **数据库格式化函数使用数组索引无类型安全**：`formatReq(r)` 用 `r[0]`、`r[1]`...`r[19]` 访问列。表结构变更时极易产生列错位 bug。注释标明了 `content_blocks` 的列偏移问题（index 19 而非 15），说明这已经是已知痛点。

**🟡 中等问题**：

7. **`electron.d.ts` 中多处 `any`**：`readClipboardFiles: () => Promise<any[]>`、`checkForUpdate: () => Promise<any>`、`dbQuery` 返回 `Promise<any>`。应定义具体接口。

8. **`Home.tsx:72` 使用 `(window as any).electronAPI`**：应使用 `window.electronAPI`（已在 `electron.d.ts` 中声明）。

9. **前后端类型不匹配**：
   - `electron.d.ts` 声明 `onWindowMaximizedChange`，但 `preload.cjs` 暴露的是 `onMaximizeChange`
   - `electron.d.ts` 声明 `showQC`/`hideQC`/`closeQC`/`toggleQC`/`getAppVersion`/`openExternal`，但 `preload.cjs` 中 **均未暴露**
   - `electron.d.ts` 中 `dbQuery` 的参数命名为 `params`，实际调用用 `args`

### 1.4 错误传播

| 检查项 | 状态 | 详情 |
|--------|------|------|
| IPC try/catch | ✅ | 所有 handler 包裹 try/catch |
| 错误日志 | ✅ | `log()` 函数写入 `workit.log` |
| ErrorBoundary | ✅ | React 级错误捕获组件 |
| 渲染进程崩溃监听 | ✅ | `render-process-gone` + `did-fail-load` |

**🟡 中等问题**：

10. **错误返回格式不统一**：
    - 大部分返回 `{ error: string }`
    - `handleRequirements` catch 返回 `{ error: 'Failed to load', message: e.message }`（额外 `message` 字段）
    - `handleDbQuery` 外层的 try/catch 返回 `{ error: e.message }`，但内层各 handler 可能有不同格式
    - **渲染进程无法可靠区分"错误响应"和"正常数据"**，只能检查 `result.error` 属性是否存在

11. **AI 调用错误未分类**：网络超时、认证失败、模型错误、JSON 解析失败都返回统一的 `{ error: e.message }`。前端无法针对不同错误类型做差异化处理。

12. **`api.ts` 不检查 IPC 返回的 `error` 字段**：`call()` 函数直接返回 IPC 结果，不判断是否包含 `error`。错误检查和展示完全依赖各页面自行处理。

### 1.5 React 架构

| 检查项 | 状态 | 详情 |
|--------|------|------|
| 页面级代码分割 | ✅ | 所有页面 `lazy(() => import(...))` |
| Context 分层 | ✅ | ThemeContext → AuthContext 独立 |
| Tab 管理 | ✅ | 自定义标签页系统，支持最大 10 个标签 |
| 浏览器标签保活 | ✅ | `display:none` 而非卸载 webview |
| useMemo/useCallback | ✅ | 关键计算和回调已包裹 |

**🟡 中等问题**：

13. **`Home.tsx` memo 失效**：`handleSend` 依赖 `messages`，每次新消息都会重新创建 `handleSend`，导致 `HomeInput` 收到新的 `onSend` prop。而 `memo(Home)` 包裹在顶层，内部状态频繁变化使 memo 无效。

14. **`Index.tsx:315` 行过大**：标签页管理逻辑 + 10 种页面的 switch-case + 浏览器保活逻辑全部在一个组件内。建议将 page router 提取为独立组件。

15. **Knowledge 编辑器非懒加载**：`useEditor`、`StarterKit`、`Placeholder`、`Image`、`EditorContent`、`DOMPurify` 在 `Knowledge.tsx` 顶层导入。即使用户仅浏览文档列表，编辑器代码也会加载。

16. **`accentColorMap` 是存根**：`ThemeContext.tsx` 中所有主题的 `accentColor` 都返回 `'#ffffff'`，颜色主题功能未完成。

---

## 二、性能审查

### 2.1 Bundle 体积分析

```
dist/assets/ 产物清单（总计约 2.4MB JS + 37KB CSS）:

vendor-mammoth-CIgVpQns.js     502 KB  ⚠️ 仅 DOCX 预览使用，可按需加载
vendor-recharts-D3j2ijLR.js    487 KB  ⚠️ 仅 Insights 页面使用，已正确拆分
vendor-xlsx-CNerDvZX.js        429 KB  ⚠️ 仅 Excel 预览使用，已按需加载
vendor-editor-C-MCx3Cu.js      392 KB  ⚠️ tiptap+DOMPurify，已正确拆分
vendor-react-47AsclFV.js       285 KB  ✅ React+ReactDOM，合理
vendor-toast-Cs-u6Se1.js        33 KB  ⚠️ sonner toast 库可能偏大
Requirements-C-TTpS3b.js        36 KB  ✅
Knowledge-AqV0G7J0.js           40 KB  ✅
index-d3eKyRpZ.js               26 KB  ✅ 入口文件
index-Ckv6vT4-.css              37 KB  ✅ 单文件 CSS

总计 JS: ~2,400 KB (未压缩)
```

**分包策略评价**：✅ 良好。重依赖（mammoth/xlsx/recharts/tiptap）均有独立 chunk。`vendor-react` 和 `vendor-icons` 的分离合理。

**🟡 改进建议**：

17. **CSS 为单文件 37KB**：建议按页面拆分或至少分离首屏关键 CSS（Tailwind 的 `@layer base` 部分）。

18. **缺少压缩报告**：建议在构建流程中加入 `rollup-plugin-visualizer` 分析实际 gzip/brotli 体积。

19. **`vendor-toast` 33KB**：sonner 库本身约 5KB。应检查是否有其他依赖被错误打包进此 chunk。

### 2.2 React 渲染性能

**🔴 严重问题**：

20. **`handleRequirements` GET 使用客户端 JS 过滤而非 SQL WHERE**（ipc.cjs:316-328）：

```javascript
// 当前：加载全部行到内存，JS 过滤
let all = query(db, 'SELECT ... FROM requirements ORDER BY created_at DESC');
if (q.search) all = all.filter(r => ...);
if (q.status) all = all.filter(r => r[6] === q.status);
// ... 然后 JS 分页
const paged = all.slice((page - 1) * ps, page * ps);
```

当需求数量增长到数千条时，每次列表查询都会加载全部数据到主进程内存。应改为 SQL 层面的 WHERE + LIMIT/OFFSET。

21. **`formatReq` 每行执行 5 次 `JSON.parse`**（database.cjs:356-368）：
    - `JSON.parse(r[10]||'[]')` — tags
    - `JSON.parse(r[11]||'[]')` — images
    - `JSON.parse(r[14]||'[]')` — imageDescriptions
    - `JSON.parse(r[16]||'[]')` — workflowHistory
    - `JSON.parse(r[19]||'[]')` — contentBlocks

对于列表查询（100 条数据），这意味着 500 次 JSON.parse。虽然单次开销小，但高频场景下可考虑延迟解析（仅在展开详情时解析）。

22. **`Home.tsx` `handleSend` 依赖链导致 HomeInput 不必要重渲染**：每次新消息 → `handleSend` 重建 → `HomeInput` 收到新 `onSend` prop → 可能触发重渲染。应使用 `useRef` 存储最新 messages，或分离 `send` 逻辑。

### 2.3 大文件加载策略

| 模块 | 加载方式 | 状态 |
|------|----------|------|
| mammoth (DOCX) | `useEffect` 内动态 `import('mammoth')` | ✅ 按需 |
| xlsx (Excel) | `useEffect` 内动态 `import('xlsx')` | ✅ 按需 |
| recharts | `LazyRecharts.tsx` 单 Promise 共享 | ✅ 按需 + 单 chunk |
| tiptap + DOMPurify | **顶层静态 import** | 🔴 非按需 |

**🔴 问题 23**：`Knowledge.tsx` 顶层 import 了 tiptap 全家桶。当用户仅浏览知识库列表（不编辑）时，392KB 的 `vendor-editor` chunk 仍会加载。建议将编辑器相关代码封装为 `lazy(() => import('./KnowledgeEditor'))` 组件。

### 2.4 Electron 主进程性能

| 检查项 | 状态 | 详情 |
|--------|------|------|
| 数据库写入防抖 | ✅ | 200ms debounce + 原子写入 (tmp + rename) |
| 查询索引 | ✅ | status/category/type/featured/created_at 均有索引 |
| 列表查询优化 | 🔴 | 客户端 JS 过滤（见问题 20） |
| 日志写入 | ⚠️ | 每次 `log()` 调用 `fs.appendFile` — 高频场景 |

**🟡 问题 24**：`log()` 每次调用 `fs.appendFile()`。在高频 IPC 场景（如快速翻页）下可能产生数百次文件写入。建议加入日志缓冲区（如 100 条批量写入或 1 秒定时刷新）。

**🟡 问题 25**：`insights/charts` 返回硬编码数据（ipc.cjs:102-120），`areaData` 的 1-7 月数据中仅 5 月有真实数据填充。图表数据的时间维度查询不完整。

---

## 三、数据存储审查

### 3.1 表结构

```sql
requirements (22 列)          documents (15 列)
├── id INTEGER PK             ├── id INTEGER PK
├── title TEXT NOT NULL       ├── title TEXT NOT NULL
├── description TEXT          ├── category TEXT
├── category TEXT             ├── type TEXT
├── module TEXT               ├── size TEXT
├── priority TEXT             ├── views INTEGER
├── status TEXT               ├── stars INTEGER
├── assignee TEXT             ├── date TEXT
├── creator TEXT              ├── tags TEXT (JSON)
├── due_date TEXT             ├── featured INTEGER
├── tags TEXT (JSON)          ├── file_path TEXT
├── images TEXT (JSON)        ├── content TEXT
├── ai_summary TEXT           ├── image_descriptions TEXT (JSON)
├── ai_tags TEXT (JSON)       ├── created_at TEXT
├── image_descriptions TEXT   └── updated_at TEXT
├── workflow_handler TEXT
├── workflow_history TEXT
├── content_blocks TEXT (JSON)
├── created_at TEXT
└── updated_at TEXT

mcp_servers (9 列)            models (11 列)
├── id INTEGER PK             ├── id INTEGER PK
├── name TEXT                 ├── name TEXT
├── type TEXT                 ├── provider TEXT
├── command TEXT              ├── base_url TEXT
├── args TEXT (JSON)          ├── api_key TEXT (加密)
├── env TEXT (JSON)           ├── model_id TEXT
├── enabled INTEGER           ├── enabled INTEGER
├── config TEXT (JSON)        ├── is_default INTEGER
└── created_at TEXT           ├── config TEXT (JSON)
                              └── created_at TEXT

knowledge_categories (3 列)   schema_version (2 列)
├── id INTEGER PK             ├── version INTEGER PK
├── name TEXT UNIQUE          └── applied_at TEXT
└── created_at TEXT
```

**评价**：✅ 表结构清晰，覆盖所有业务实体。JSON 列的使用合理（SQLite 无原生数组类型）。

**🟡 问题 26**：`requirements` 表 22 列过多。`images`、`ai_tags`、`image_descriptions` 若仅用于 AI 分析结果展示，可考虑单独建表。当前设计下每行 UPDATE 都需传递全部 22 列的占位符。

**🟡 问题 27**：`tags` 在 `requirements` 和 `documents` 中均为 JSON 数组字符串。缺少统一的标签表进行规范化。标签搜索只能靠 LIKE 或客户端 JSON.parse 过滤。

### 3.2 索引完整性

| 表 | 当前索引 | 缺失索引 |
|----|----------|----------|
| requirements | `created_at`, `status`, `category` | `priority`, `assignee`, `module`, 复合索引 `(status, created_at)` |
| documents | `type`, `featured` | `category`, `created_at` |
| mcp_servers | 无 | — （小表，可接受） |
| models | 无 | — （小表，可接受） |
| knowledge_categories | `name UNIQUE` (隐式) | — |

**🔴 问题 28**：列表查询使用了 `ORDER BY created_at DESC` 且有 `WHERE status=?` 过滤。缺少复合索引 `(status, created_at)` 会导致 SQLite 在过滤后仍需全表扫描排序（或使用 `created_at` 索引但逐行检查 status）。

**🟡 问题 29**：`requirements` 列表支持按 `assignee`、`priority` 过滤但缺少相应索引。数据量小时无影响，超过 5000 条时性能下降明显。

### 3.3 SQL 安全

| 检查项 | 状态 |
|--------|------|
| 所有查询使用参数化 (? 占位符) | ✅ |
| 动态表名白名单验证 | ✅ |
| 动态字段白名单验证 | ✅ |
| 字符串拼接 SQL | ✅ 无 |
| ALTER TABLE 使用固定列名 | ✅ |

**评价**：✅ SQL 注入防护做得非常好。三层白名单防护（方法 → 表名 → 字段名）+ 全参数化查询，是这次审计中安全方面最亮眼的部分。

### 3.4 Content Blocks JSON 处理

| 检查项 | 状态 | 详情 |
|--------|------|------|
| 类型定义 | ✅ | `ContentBlock` 接口 + `BlockType` 联合类型 |
| 类型守卫 | ✅ | `isContentBlock()` + `isValidContentBlocks()` |
| 序列化 | ✅ | POST/PUT 均使用 `JSON.stringify` |
| 反序列化 | ✅ | `formatReq` 中 try/catch 包裹 `JSON.parse` |

**🟡 问题 30**：`content_blocks` 列的添加使用 `ALTER TABLE ... ADD COLUMN` + try/catch 忽略"列已存在"错误（database.cjs:182-188）。这不是标准的迁移方式——`schema_version` 表已有但未用于 content_blocks 迁移。建议改为版本化迁移。

**🟡 问题 31**：写入时不验证 JSON 结构是否符合 `ContentBlock` 类型。可以存入 `{type: "invalid", content: 123}` 这类无效数据，在读取时 try/catch 兜底返回 `[]`。

### 3.5 localStorage 使用分析

| Key | 用途 | 大小风险 | 评价 |
|-----|------|----------|------|
| `user_profile` | 用户配置 | ~200B | ✅ 合理 |
| `user` | 旧版用户数据 | ~100B | ⚠️ 与 `user_profile` 冗余 |
| `theme` | 主题设置 | ~20B | ✅ 合理 |
| `home_messages` | 当前对话消息 | 可变 | ⚠️ 与 conversations 重复 |
| `home_conversations` | 所有对话历史 | 🔴 可变 | 包含全部消息全文 |
| `quick_collect_enabled` | QC开关 | ~5B | ✅ 合理 |

**🔴 问题 32**：`home_conversations` 存储所有对话的完整消息历史在一个 localStorage key 中。活跃用户可能积累数十条对话、数千条消息，每条消息含完整文本。这会：
- 超过 localStorage 5-10MB 限制导致写入失败
- 每次读写都需要序列化/反序列化全部数据
- 与 `home_messages` 存在数据重复

**建议**：对话历史应存储在 SQLite 的 `conversations` 表中，localStorage 仅保留 `activeConversationId`。

**🟡 问题 33**：删除对话时（`handleDeleteConv`），只删除了 `home_conversations` 中的条目，但 `home_messages` 中可能有残留。两个 key 的数据同步不保证。

### 3.6 数据库备份/恢复/损坏处理

| 检查项 | 状态 | 详情 |
|--------|------|------|
| 启动时备份 | ✅ | `copyFileSync(dbPath, dbPath + '.bak')` |
| 损坏检测 | ✅ | `SELECT 1` 完整性检查 |
| 从备份恢复 | ✅ | 主库损坏 → 尝试 .bak 恢复 |
| 二次损坏处理 | ✅ | 备份也损坏 → 重命名损坏文件 → 创建新库 |
| 原子写入 | ✅ | 写入 .tmp → rename → .db |
| 写入防抖 | ✅ | 200ms debounce |

**🟡 问题 34**：仅维护一个 `.bak` 备份文件，每次启动覆盖。如果用户在本次会话中损坏数据库（如断电），`.bak` 仍是启动时的状态。建议：
- 定期（如每 30 分钟）自动备份
- 保留最近 3 个备份的轮转

**🟡 问题 35**：未使用 SQLite WAL 模式。WAL 模式可提升并发读取性能并降低损坏风险。对于 sql.js（内存数据库），这不直接适用，但保存到磁盘时应考虑。

**🟡 问题 36**：无用户可触发的备份/恢复 UI。用户无法手动备份数据库或在数据丢失时选择从特定时间点恢复。

---

## 四、问题汇总与优先级

### 🔴 P0 — 必须修复

| # | 问题 | 位置 | 风险 |
|---|------|------|------|
| 1 | `read-local-file` 允许读取任意本地文件 | window.cjs:298 | **安全漏洞**：任意文件读取 |
| 2 | `test-model-connection` API Key 明文 IPC 传输 | window.cjs:169 | **安全漏洞**：密钥泄露风险 |
| 5 | `api.ts` 核心函数返回 `Promise<any>` | api.ts:30,58 | **类型安全**：全链路类型丢失 |
| 20 | 需求列表使用客户端 JS 过滤而非 SQL | ipc.cjs:316-328 | **性能**：数据量大时 O(n) 全量加载 |
| 23 | tiptap 编辑器非按需加载 | Knowledge.tsx:5-10 | **性能**：首屏多加载 392KB |
| 32 | `home_conversations` 全量存 localStorage | Home.tsx:21 | **数据**：localStorage 溢出风险 |

### 🟡 P1 — 应该修复

| # | 问题 | 位置 |
|---|------|------|
| 3 | `install-extension` extId 未校验 | window.cjs:570 |
| 4 | `open-path-external` 无路径白名单 | window.cjs:559 |
| 6 | 数据库格式化函数使用数组索引 | database.cjs:355-387 |
| 7 | `electron.d.ts` 多处 `any` | electron.d.ts |
| 8 | `Home.tsx` 使用 `(window as any)` | Home.tsx:72 |
| 9 | 前后端 API 类型不匹配 (showQC/hideQC等) | preload.cjs vs electron.d.ts |
| 10 | 错误返回格式不统一 | ipc.cjs 多处 |
| 11 | AI 错误未分类 | ipc.cjs, database.cjs |
| 12 | `api.ts` 不检查 error 字段 | api.ts:30-34 |
| 16 | `accentColorMap` 存根 | ThemeContext.tsx:27 |
| 21 | `formatReq` 每行 5 次 JSON.parse | database.cjs:355-368 |
| 28 | 缺少复合索引 `(status, created_at)` | database.cjs |
| 33 | 对话删除时 localStorage 数据不一致 | Home.tsx |

### 🔵 P2 — 建议优化

| # | 问题 | 位置 |
|---|------|------|
| 13 | `memo(Home)` 因 messages 依赖变化失效 | Home.tsx |
| 14 | `Index.tsx` 过大 (315行) | Index.tsx |
| 15 | window.cjs 职责混杂 (7种职责) | window.cjs |
| 17 | CSS 单文件未拆分 | dist |
| 18 | 缺少 bundle 压缩体积分析 | vite.config.ts |
| 19 | `vendor-toast` 33KB 偏大 | dist 产物 |
| 22 | `handleSend` 依赖链导致不必要的重渲染 | Home.tsx |
| 24 | `log()` 高频写入无缓冲 | database.cjs:35-44 |
| 25 | `insights/charts` 返回硬编码数据 | ipc.cjs:102-120 |
| 26 | `requirements` 表 22 列过多 | database.cjs |
| 27 | 缺少统一标签表 | schema |
| 29 | 缺少 priority/assignee 索引 | database.cjs |
| 30 | content_blocks 迁移非版本化 | database.cjs:182-188 |
| 31 | content_blocks 写入无结构验证 | ipc.cjs |
| 34 | 仅一个 `.bak` 备份文件 | database.cjs:67-68 |
| 35 | 未使用 WAL 模式 | database.cjs |
| 36 | 无用户可触发的备份/恢复 UI | — |

---

## 五、总体评价

### 优势

1. **IPC 安全三层白名单设计**（方法 → 表名 → 字段名）是本次审计发现的最佳实践，SQL 注入防护达到生产级标准。
2. **数据库损坏恢复机制**完整（检测 → 备份恢复 → 二次损坏创建新库），覆盖了主要故障场景。
3. **代码分割策略**合理，recharts/mammoth/xlsx 等重依赖均有独立 chunk 且按需加载。
4. **原子写入 + 防抖保存**保证了数据一致性。
5. **QC 窗口权限隔离**是好的纵深防御设计。

### 主要风险

1. **三个安全漏洞**需优先级处理：任意文件读取、API Key 明文 IPC 传输、路径穿越。
2. **类型安全短板**：`api.ts` 返回 `any` 导致全链路类型丢失，是架构层面的技术债。
3. **列表查询性能**：客户端 JS 过滤随数据量增长会显著退化，需改为 SQL 层面分页。
4. **localStorage 对话历史存储**：缺乏容量控制和数据一致性保证。

### 技术债务评估

- **安全债务**：3 项 P0，需 1-2 天修复
- **类型债务**：`any` 泛滥，需 2-3 天重构
- **性能债务**：SQL 查询和 React 渲染优化，需 2-3 天
- **数据债务**：localStorage 迁移到 SQLite，需 1-2 天

**综合评级**：B+（良好）。架构设计整体合理，安全意识和工程实践到位，但在类型安全、性能优化和数据存储方面存在可改进空间。
