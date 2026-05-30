# Workit 项目全面审查报告

> **审查人**: 高见远（架构师）
> **日期**: 2025-07-02
> **项目**: Workit — 智能体工作台（Electron 42 + React 19 + TypeScript + Vite + sql.js + Tailwind CSS）

---

## 一、代码审查

### 1.1 架构分层

| 层级 | 文件 | 评分 | 说明 |
|------|------|------|------|
| 主进程 | `electron/main.cjs` (~1474行) | ⚠️ P1 | 单体文件过大，建议拆分 |
| IPC 桥接 | `electron/preload.cjs` (~68行) | ✅ | 规范、隔离合理、有 unsubscribe |
| API 层 | `src/api.ts` (~62行) | ✅ | 简洁，IPC/Fetch 双通道 |
| 页面组件 | `src/pages/*.tsx` | ✅ | 按功能拆分，懒加载 |
| 共享组件 | `src/components/*.tsx` | ✅ | 职责明确 |
| 工具层 | `src/utils/*.ts` | ✅ | 内容块、聊天解析、下载 |
| 类型定义 | `src/types/content.ts` | ✅ | 类型守卫完备 |

#### P1-01: `electron/main.cjs` 过大（1474行），应拆分

当前 `main.cjs` 包含：数据库（~200行）、IPC handler（~120行）、窗管（~80行）、自动更新（~70行）、剪贴板（~270行）、QC窗口（~40行）、文件读取等全部逻辑。

**建议**拆分为多个模块：
```
electron/
  main.cjs          → 入口，组装各模块
  database.cjs      → initDatabase, saveDb, query, run, formatReq...
  ipc.cjs           → setupIPC, handleDbQuery, handleRequirements...
  clipboard.cjs     → readClipboardImages, readClipboardFiles...
  window.cjs        → createWindow, createTray...
  updater.cjs       → setupAutoUpdater
  ai.cjs            → callAI, getDefaultModel, encryptApiKey...
```

---

### 1.2 错误处理

#### ✅ 做得好的

1. **数据库初始化**：完整的损坏→备份→恢复→新建降级链（`initDatabase` L67-119）
2. **主进程全局异常捕获**：`uncaughtException` + `unhandledRejection`（L48-52）
3. **IPC handler 顶层 try-catch**：`db-query` handler 有完整错误返回（L336）
4. **前端 toast 错误提示**：各页面均有 toast.error

#### P2-01: `handleRequirements` (L638) 异常时静默返回 `[]` 而非 `{error: ...}`

```javascript
// L638: 异常时返回空数组，前端无法区分「没有数据」和「查询失败」
} catch (e) { log('handleRequirements ERROR', e); return []; }
```

```diff
- } catch (e) { log('handleRequirements ERROR', e); return []; }
+ } catch (e) { log('handleRequirements ERROR', e); return { error: e.message || 'Server error' }; }
```

同样问题存在于 `handleDocuments`(L673)、`handleMcp`(L708)、`handleModels`(L747)。

#### P2-02: `Requirements.tsx` 中 `fetchPage` 缺少 loading/error 状态

`fetchPage` (L220-245) 使用 try-catch 但未设置 loading 状态，首次加载前可能显示空列表。另外 API 返回 `data.items` 时未校验 `data.items` 是否为数组。

#### P2-03: `Knowledge.tsx` 中 Tiptap editor 的 `useEditor` 依赖 `isEditing` 而非 `showEdit` 内容变化

L119-133 中，`useEditor` 依赖 `[isEditing]`，当编辑不同文档时（`showEdit` 先变 null 再变新文档），editor 可能不会重新创建。当前用 `useEffect` (L182-186) 手动 `setContent` 作为 workaround，但存在竞态风险。

---

### 1.3 安全问题

#### ✅ 做得好的

1. **contextIsolation: true + nodeIntegration: false**（L810）
2. **IPC 方法白名单**：`ALLOWED_METHODS`（L17）
3. **动态表名白名单**：`ALLOWED_TABLES`（L14）
4. **QC 窗口 IPC 限制**：只允许 GET requirements（L322-327）
5. **API Key 加密存储**：使用 `safeStorage.encryptString`（L206-233）
6. **XSS 防护**：Knowledge 使用 DOMPurify.sanitize（L419, L433, L686, L700）
7. **外部 URL 打开防护**：`webContents.setWindowOpenHandler` 阻止弹窗（L850）
8. **SQL 参数化查询**：主流程全部使用 `?` 占位符
9. **MCP/Models PUT 字段白名单**：防止任意列注入（L694-703, L734-741）
10. **`notify-requirements-changed` 已从 executeJavaScript 改为 webContents.send**（L1373-1377）

#### P2-04: `default` 路由中动态表名使用模板字符串拼接

```javascript
// L520, L547-549: resType 虽然通过了 ALLOWED_TABLES 白名单校验，
// 但使用模板字符串拼接 SQL 仍不是最佳实践
const req = query(`SELECT * FROM ${resType} WHERE id = ?`, [parseInt(resId)]);
run(`UPDATE ${resType} SET ai_summary = ?, ... WHERE id = ?`, [...]);
```

虽然有白名单防护，但更安全的做法是将这些操作路由到各自的 handler 函数中，避免模板字符串。当前风险评估为 **低风险**（白名单限制），但建议优化。

#### P2-05: `handleTestConnection` 中 API Key 通过 IPC 明文传递

```javascript
// L947-987: apiKey 作为 IPC 参数明文传输
ipcMain.handle('test-model-connection', async (_, baseUrl, apiKey, modelId) => {
```

虽然在 Electron 内 IPC 是进程内通信（不经过网络），但 `apiKey` 以明文出现在内存中。考虑到 `safeStorage` 的设计原则——加密存储但使用时解密——这是可接受的折中。不构成严重问题，但需知晓。

#### P2-06: `Knowledge.tsx` L419/433/686/700 中 `dangerouslySetInnerHTML` 的 `previewHtml` 已做 DOMPurify，但 `showDoc.content` 是用户输入的 HTML

DOMPurify 已应用于 `showDoc.content`，但需确认 DOMPurify 配置足够严格（如禁止 `<script>`、`<iframe>` 等）。当前使用默认配置，**建议显式配置**：

```javascript
DOMPurify.sanitize(content, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody',
    'tr', 'th', 'td', 'span', 'div', 'hr'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
});
```

---

### 1.4 React 组件审查

#### ✅ 做得好的

1. **memo 使用**：`ReqListItem`、`MemoizedContentBlocks`、`Dashboard`、`ContentBlockRenderer`、`Sidebar` 均使用 `memo`
2. **useCallback/useMemo 使用**：`Index.tsx` 中所有回调均 memoized，tabBar 用 useMemo
3. **懒加载**：所有页面组件使用 `lazy()` + `Suspense`
4. **浏览器 tab 保活**：webview 使用 `display:none` 而非卸载（L256-268）
5. **代码分割边界清晰**：每个页面独立 chunk
6. **useEditor 按需创建**：仅在编辑时初始化 Tiptap（L118-133）

#### P2-07: `Requirements.tsx` 图片预览 lightbox 代码重复

Lightbox 代码在 `Requirements.tsx` 中出现了**两次**（明细视图 L573-579 和表单视图 L608-614），逻辑完全相同。同样在 `QuickCapture.tsx` L1149-1165 也有类似代码。应复用 `ContentBlockRenderer` 內建的 lightbox 或抽取为共享组件 `ImageLightbox`。

#### P2-08: `Knowledge.tsx` 编辑器工具栏代码严重重复

工具栏在 `Knowledge.tsx` 中出现**两次**（tab 模式编辑 L462-485 和侧面板编辑 L743-776），几乎完全相同（约 35 行）。应抽取为 `EditorToolbar` 组件。

#### P2-09: `Index.tsx` 中 `sidebar` activeTab 判断使用长链式三元表达式

```tsx
// L233-241: 可读性差
activeTab={activeTab?.type === 'requirements' ? 'requirements' :
           activeTab?.type === 'dashboard' ? 'dashboard' : ...
```

建议使用 Map 查找或提前计算。

#### P2-10: `Settings.tsx` 模块级变量用于状态持久化

```typescript
// L7-10: 跨组件实例共享状态的非标准模式
let _updStatus: ... = 'idle';
let _updVersion = '';
let _updProgress = 0;
let _updError = '';
```

当 `Settings` 组件因 tab 切换卸载再挂载时，模块级变量保留更新状态。这是一个巧妙的 workaround，但违反了 React 数据流原则。建议使用 Context 或 zustand 等轻量状态管理。

---

### 1.5 代码重复和可维护性

| 问题 | 位置 | 重复度 |
|------|------|--------|
| 图片预览 lightbox | Requirements.tsx ×2, QuickCapture.tsx ×1 | 高 |
| 编辑器工具栏 | Knowledge.tsx ×2 | 高 |
| 文件类型 MIME 映射表 | main.cjs ×3 (L1015-1016, L1039, L1081-1082) | 高 |
| 日期格式化 | Requirements.tsx L392-396 | 低 |

#### P2-11: MIME/扩展名映射表在 `main.cjs` 中重复定义 3 次

`readClipboardImages`(L1015-1016)、`readClipboardFiles`(L1039)、`readLocalFile`(L1081-1082) 各有一份 MIME 映射表，共 ~200 行重复数据。应抽取为共享常量模块。

---

### 1.6 TypeScript 类型安全

#### ✅ 做得好的

- `ContentBlock` 类型定义完整，含类型守卫
- 组件 Props 均有 interface 定义

#### P2-12: `electron` API 类型使用 `any`

整个前端通过 `(window as any).electronAPI` 访问 IPC API，无类型提示。建议生成 `electronAPI` 的 TypeScript 声明文件或使用 `contextBridge` 的类型增强。

#### P2-13: `apiFetch` 返回类型不统一

`apiFetch` 返回 `{ json: () => Promise<any>, data: any }`，`data` 类型为 any。调用方需要做大量类型断言。

---

## 二、数据存储审查

### 2.1 表结构与索引

#### requirements 表

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
title TEXT NOT NULL
description TEXT DEFAULT ''
category TEXT DEFAULT '产品'
module TEXT DEFAULT '用户端'
priority TEXT DEFAULT '中'
status TEXT DEFAULT '待评估'
assignee TEXT DEFAULT ''
creator TEXT DEFAULT ''
due_date TEXT DEFAULT ''
tags TEXT DEFAULT '[]'         -- JSON string
images TEXT DEFAULT '[]'       -- JSON string
ai_summary TEXT DEFAULT ''
ai_tags TEXT DEFAULT '[]'      -- JSON string
image_descriptions TEXT DEFAULT '[]' -- JSON string
workflow_handler TEXT DEFAULT ''
workflow_history TEXT DEFAULT '[]'   -- JSON string
created_at TEXT DEFAULT (datetime('now','localtime'))
updated_at TEXT DEFAULT (datetime('now','localtime'))
content_blocks TEXT DEFAULT '[]'     -- ⚠️ ALTER TABLE 追加 (index 19)
```

**索引**：
- ✅ `idx_requirements_created_at` — 覆盖 ORDER BY created_at DESC
- ⚠️ `status` 和 `category` 字段常用于过滤但未建索引

#### P0-01: `requirements` 表缺少过滤字段索引

当前 `handleRequirements` 中 GET 列表查询在**内存中过滤**（L576-588），而非 SQL WHERE 子句。数据量大时性能下降明显。

```javascript
// 当前做法：SELECT 13列全部数据，再 JS filter
let all = query('SELECT id,title,...,created_at FROM requirements ORDER BY created_at DESC');
if (q.status && q.status !== '全部') all = all.filter(r => r[6] === q.status);
```

**建议**：在 SQL 层构建动态 WHERE 子句（参数化），并添加复合索引：
```sql
CREATE INDEX IF NOT EXISTS idx_req_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_req_category ON requirements(category);
```

#### P0-02: JSON 字段使用 TEXT 存储，无法进行 SQL 内查询

`tags`、`images`、`ai_tags`、`image_descriptions`、`workflow_history`、`content_blocks` 均存储为 JSON 字符串。SQLite 支持 `json_extract()` 函数，但当前未使用。如果未来需要按 tag 搜索，性能会很差。

**建议**（长期）：考虑使用 SQLite JSON1 扩展的函数进行查询，或为高频查询字段建立关联表。

#### documents 表

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
title TEXT NOT NULL
category TEXT DEFAULT 'guide'
type TEXT DEFAULT 'MD'
size TEXT DEFAULT ''
views INTEGER DEFAULT 0
stars INTEGER DEFAULT 0
date TEXT DEFAULT ''
tags TEXT DEFAULT '[]'
featured INTEGER DEFAULT 0
file_path TEXT DEFAULT ''
content TEXT DEFAULT ''
image_descriptions TEXT DEFAULT '[]'
created_at TEXT DEFAULT (datetime('now','localtime'))
updated_at TEXT DEFAULT (datetime('now','localtime'))
```

⚠️ **无索引**：`featured`、`category`、`created_at` 均无索引。

#### P1-02: `documents` 表缺少索引

```sql
CREATE INDEX IF NOT EXISTS idx_docs_featured ON documents(featured);
CREATE INDEX IF NOT EXISTS idx_docs_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_docs_created_at ON documents(created_at);
```

#### mcp_servers 表 / models 表

结构合理，数据量小，暂无索引需求。

---

### 2.2 列索引正确性

#### formatReq（明细查询，index 19 = content_blocks）

```javascript
// L750-763: ✅ 正确
// ALTER TABLE ADD COLUMN content_blocks 追加到末尾（index 19）
// 原始列 15-18: workflow_handler, workflow_history, created_at, updated_at
return {
  id: r[0], title: r[1], ..., workflowHandler: r[15], workflowHistory: r[16],
  createdAt: r[17], updatedAt: r[18],
  contentBlocks: JSON.parse(r[19] || '[]'),  // ✅ index 19
};
```

#### formatReqList（列表查询，不含 content_blocks）

```javascript
// L766-773: ⚠️ 需验证 SELECT 语句

// handleRequirements L576 的 SELECT 语句：
// SELECT id,title,description,category,module,priority,status,assignee,creator,images,ai_summary,ai_tags,created_at
//   0    1       2         3      4       5      6     7        8      9     10         11      12
```

| formatReqList 映射 | 索引 | 列名 | ✅/❌ |
|---|---|---|---|
| `r[0]` → id | 0 | id | ✅ |
| `r[1]` → title | 1 | title | ✅ |
| `r[2]` → desc | 2 | description | ✅ |
| `r[3]` → category | 3 | category | ✅ |
| `r[4]` → module | 4 | module | ✅ |
| `r[5]` → priority | 5 | priority | ✅ |
| `r[6]` → status | 6 | status | ✅ |
| `r[7]` → assignee | 7 | assignee | ✅ |
| `r[8]` → creator | 8 | creator | ✅ |
| `r[9]` → images | 9 | images | ✅ |
| `r[10]` → aiSummary | 10 | ai_summary | ✅ |
| `r[11]` → aiTags | 11 | ai_tags | ✅ |
| `r[12]` → createdAt | 12 | created_at | ✅ |

**✅ `formatReqList` 列索引与 SELECT 语句一致。**

---

### 2.3 SQL 安全性

#### ✅ 参数化查询

主 CRUD 操作全部使用 `?` 占位符 + 参数数组：
```javascript
query('SELECT * FROM requirements WHERE id = ?', [id]);
run('INSERT INTO requirements (...) VALUES (?,?,...,?)', [...values]);
run(`UPDATE requirements SET ... WHERE id=?`, [...values, id]);
```

#### ✅ 动态字段白名单

```javascript
// MCP PUT: L694-703
if (enabled !== undefined) { fields.push('enabled=?'); vals.push(enabled?1:0); }
if (config !== undefined) { fields.push('config=?'); vals.push(JSON.stringify(config)); }
// ... only known fields allowed
```

**无 SQL 注入风险。**

#### P2-14: `dashboard/activities` SQL 使用硬编码中文字段映射

```javascript
// L396-397
const iconMap = { '待评估': 'AlertCircleIcon', '设计中': 'EditIcon', ... };
const colorMap = { '待评估': '#f59e0b', '设计中': '#6366f1', ... };
return rows.map(r => ({ id: r[0], icon: iconMap[r[2]] || 'ClockIcon', ... }));
```

当数据库中状态的值为意外值（如写入错误），`iconMap[r[2]]` 返回 `undefined`，fallback 到 `'ClockIcon'`。当前处理合理，但建议在后端添加状态值校验。

---

### 2.4 数据库文件管理

#### ✅ 做得好的

1. **原子写入**：`saveDb()` 使用 `tmpPath + renameSync`（L176-186）
2. **启动备份**：每次启动自动备份到 `.bak` 文件（L72-76）
3. **损坏恢复链**：主DB损坏→尝试备份恢复→备份也损坏→保留损坏文件+新建（L91-119）
4. **去抖保存**：200ms debounce 减少磁盘写入频率（L169-173）

#### ✅ 备份策略

当前只有一层备份（`.bak`），每次启动覆盖。对于本地桌面应用是合理的。数据可通过 `.corrupt.{timestamp}` 文件恢复。

#### P2-15: 无定期自动保存（只有变更时 debounced save）

```javascript
// L169-173: 仅在调用 run() 后触发 debounced save
function run(sql, params = []) {
  if (!db) { ... return; }
  db.run(sql, params);
  debouncedSaveDb();
}
```

如果应用崩溃在两次 `run()` 调用之间（如长时间未执行写操作），最后一批变更可能丢失。对于桌面应用这是可接受的（sql.js 内存中的 DB 不会损坏），但如果需要更高可靠性，可添加定时保存（如每 5 分钟）。

---

### 2.5 content_blocks JSON 序列化

#### ✅ 序列化

```javascript
// POST (L610-611)
const contentBlocksStr = typeof content_blocks === 'string'
  ? content_blocks
  : JSON.stringify(content_blocks || []);
run(`INSERT INTO requirements (..., content_blocks) VALUES (...,?)`, [..., contentBlocksStr]);

// PUT (L627-628)
const contentBlocksStr = typeof content_blocks === 'string'
  ? content_blocks
  : JSON.stringify(content_blocks || []);
```

处理了两种输入（已序列化的字符串 / 对象数组），✅ 合理。

#### ✅ 反序列化

```javascript
// formatReq (L761)
contentBlocks: (() => {
  try { return JSON.parse(r[19] || '[]'); }
  catch { return []; }
})(),
```

有 try-catch 保护，✅ 正确。

#### P2-16: `formatReqList` 未返回 `contentBlocks` 字段

列表查询有意排除 `contentBlocks` 以减小数据传输量（✅ 设计合理）。前端通过 `Requirements.tsx` L259-265 在详情视图时按需加载完整数据，补充 `detailBlocks`。逻辑正确，但需注意 `apiFetch` 返回的 `r.data?.contentBlocks` 在 PUT 更新后可能不包含最新数据——当前通过 `useEffect` 的依赖数组 `[viewType, detailReqId, detailReq?.contentBlocks]` 可自动刷新。

---

### 2.6 数据库迁移策略

#### ✅ 当前迁移方式

```javascript
// L150: 原地 SQL 更新
db.run("UPDATE requirements SET status = '待评估' WHERE status = '待评审'");

// L153-159: ALTER TABLE 带 try-catch
try {
  db.run("ALTER TABLE requirements ADD COLUMN content_blocks TEXT DEFAULT '[]'");
} catch (e) {
  // Column may already exist — ignore
}
```

#### P2-17: 缺少版本化迁移机制

当前迁移是幂等式的（每次启动检查），但缺少版本号追踪。如果未来需要多步骤迁移（如拆分表、数据转换），需要引入迁移版本系统。

**建议**：添加 `schema_version` 表：
```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now','localtime'))
);
```

---

## 三、问题汇总

### P0（高优先级—应立即修复）

| ID | 分类 | 描述 | 文件 |
|----|------|------|------|
| P0-01 | 数据存储 | `requirements` 表缺少 `status`/`category` 过滤索引，列表查询全量加载后 JS 过滤 | `main.cjs` L576-588 |
| P0-02 | 数据存储 | `documents` 表缺少 `featured`/`category`/`created_at` 索引 | `main.cjs` L130-136 |

### P1（中优先级—应尽快修复）

| ID | 分类 | 描述 | 文件 |
|----|------|------|------|
| P1-01 | 架构 | `main.cjs` 1474行单体文件，应拆分为 5-6 个模块 | `electron/main.cjs` |
| P1-02 | 可维护性 | 编辑器工具栏重复2次（~70行） | `Knowledge.tsx` L462-485, L743-776 |

### P2（低优先级—可择机优化）

| ID | 分类 | 描述 | 文件 |
|----|------|------|------|
| P2-01 | 错误处理 | CRUD handler 异常时返回空数组而非 `{error:...}` | `main.cjs` L638, L673, L708, L747 |
| P2-02 | React | `fetchPage` 缺少 loading 状态 | `Requirements.tsx` L220 |
| P2-03 | React | Tiptap editor 重建依赖不完整 | `Knowledge.tsx` L119-133 |
| P2-04 | 安全 | `default` 路由动态表名使用模板字符串（低风险） | `main.cjs` L520 |
| P2-05 | 安全 | `test-model-connection` IPC 明文传 API Key（可接受） | `main.cjs` L947 |
| P2-06 | 安全 | DOMPurify 使用默认配置，建议显式配置 | `Knowledge.tsx` |
| P2-07 | 可维护性 | 图片预览 lightbox 重复3次 | `Requirements.tsx` ×2, `QuickCapture.tsx` ×1 |
| P2-08 | 可维护性 | 编辑器工具栏重复2次 | `Knowledge.tsx` |
| P2-09 | 可维护性 | 长链式三元表达式可读性差 | `Index.tsx` L233-241 |
| P2-10 | 架构 | 模块级变量用于状态持久化 | `Settings.tsx` L7-10 |
| P2-11 | 可维护性 | MIME 映射表重复3次 | `main.cjs` |
| P2-12 | 类型安全 | `electronAPI` 缺少 TypeScript 类型声明 | 全局 |
| P2-13 | 类型安全 | `apiFetch` 返回类型为 `any` | `api.ts` |
| P2-14 | 数据存储 | 硬编码中文字段映射无运行时校验 | `main.cjs` L396-397 |
| P2-15 | 数据存储 | 无定期自动保存，仅 debounce | `main.cjs` L169 |
| P2-16 | 数据存储 | `formatReqList` 不含 contentBlocks | `main.cjs` L766 |
| P2-17 | 数据存储 | 缺少版本化迁移机制 | `main.cjs` |

---

## 四、整体评价

### 优点

1. **安全基础扎实**：contextIsolation + nodeIntegration:false + 参数化SQL + API Key加密 + DOMPurify + IPC白名单，安全防护到位
2. **数据库健壮**：原子写入 + 启动备份 + 损坏恢复链 + debounced save，数据安全有保障
3. **React 最佳实践**：memo/useCallback/useMemo 使用规范，代码分割/懒加载合理
4. **IPC 设计合理**：QC 窗口权限受限，preload 提供 unsubscribe 能力
5. **content_blocks 设计优秀**：向前兼容旧的 desc+images 格式，新旧数据无缝切换

### 主要改进方向

1. **拆分 `main.cjs`**：1474行单体文件是最大的技术债务，建议优先拆分
2. **添加数据库索引**：随着数据增长，内存过滤会成为性能瓶颈
3. **减少代码重复**：lightbox、编辑器工具栏、MIME 映射表
4. **完善错误处理**：CRUD handler 统一返回格式，添加 loading/error 状态
