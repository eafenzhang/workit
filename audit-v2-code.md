# Workit 代码质量审查报告 v2

> **审查人**：寇豆码（Alex, Engineer）
> **审查日期**：2025-07-16
> **审查范围**：5 个后端文件 + 8 个前端页面 + 4 个组件文件
> **审查标准**：10 维度全面审查

---

## 总体评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 1. 未使用的 imports | ⚠️ 7/10 | 发现 1 处未使用 import，2 处疑似死代码导出 |
| 2. console.log 清理 | ✅ 10/10 | 仅保留 console.error（符合规范），无调试日志 |
| 3. 硬编码字符串 | ⚠️ 6/10 | 大部分页面缺少字符串常量化，Knowledge 和 Settings 较好 |
| 4. useEffect 依赖数组 | ⚠️ 5/10 | 多处 eslint-disable，存在潜在闭包陷阱 |
| 5. 事件监听器清理 | ✅ 9/10 | 大部分有正确清理，electron 主进程窗口事件可改进 |
| 6. key 属性 | ✅ 9/10 | 列表渲染 key 稳定，个别使用 `index` 降级但可接受 |
| 7. 条件渲染 | ✅ 10/10 | 未发现 `&&` 短路渲染 `"0"` 风险 |
| 8. 内联样式 | ⚠️ 6/10 | 大量内联 style，部分文件有提取常量（ProfileWizard.C、QuickCapture.FILE_CHIP_STYLE） |
| 9. JSDoc 注释 | ⚠️ 6/10 | ContentBlockRenderer 和 Requirements 较好，数据库层和 IPC 层缺失严重 |
| 10. 死代码 | 🔴 3/10 | **2 个致命运行时 Bug + 2 处死代码** |

---

## 🔴 致命问题（必须修复）

### B1: `generateAISummary` 未定义 — 运行时崩溃

**文件**：`electron/ipc.cjs`，第 294 行

```javascript
const summary = content ? generateAISummary(content) : title;
```

`generateAISummary` 从未在任何地方定义或导入。触发路径：Knowledge 页面 → AI 总结 → `db-query` → `documents/{id}/summarize` action → **ReferenceError 崩溃**。

**修复建议**：在 `database.cjs` 中实现 `generateAISummary` 函数（本地文本摘要），或改为调用 `callAI`：

```javascript
const summary = content ? content.substring(0, 200) + '...' : title;
```

> 注：此 action 现已极少被触发（前端 Knowledge.tsx `handleAISummary` 调用的是 `/api/documents/${id}/summarize`，而 IPC 中匹配的路径模式是 `documents/{id}/summarize`，但路由到 `handleDbQuery` 的 `default` 分支中）。需确认前后端路径一致性。

---

### B2: `activities` 变量未定义 — 导出报告崩溃

**文件**：`src/pages/Insights.tsx`，第 185 行

```javascript
const handleExport = useCallback(() => {
    // ...
}, [kpis, areaData, barData, aiInsights, activities]);
//                                          ^^^^^^^^^^
//                                      未定义变量！
```

`activities` 变量在整个组件中从未声明。点击「导出报告」按钮时，`useCallback` 在组件首次渲染求值依赖数组即抛出 `ReferenceError`。

**修复建议**：移除 `activities` 或在组件中添加对应 state：

```javascript
// 方案 A：移除未使用的依赖
}, [kpis, areaData, barData, aiInsights]);

// 方案 B：添加实际的活动数据 state（如果需要）
const [activities, setActivities] = useState<any[]>([]);
```

---

## 🟡 中等问题（建议修复）

### M1: `Trash2Icon` 未使用 import

**文件**：`src/pages/Home.tsx`，第 3 行

```typescript
import { Trash2Icon, XIcon, Loader2Icon, PlusIcon, ClockIcon } from 'lucide-react';
```

`Trash2Icon` 在 JSX 中从未使用（删除对话用的是 `XIcon`）。建议移除以减少打包体积。

---

### M2: 死代码 — `MCP_FIELDS` 和 `MODEL_FIELDS`

**文件**：`electron/database.cjs`，第 18-33 行

```javascript
const MCP_FIELDS = new Map([...]);
const MODEL_FIELDS = new Map([...]);
```

这两个 Map 被 `module.exports` 导出，但**没有任何文件导入使用它们**。IPC 层（`ipc.cjs`）中的 `handleMcp` 和 `handleModels` 使用手动 `if (xxx !== undefined)` 校验，而非这些白名单。

**建议**：要么删除以清理代码，要么让 IPC 层使用它们统一校验逻辑。

---

### M3: 死代码 — `ROLE_CONFIGS`

**文件**：`electron/database.cjs`，第 390-396 行

```javascript
const ROLE_CONFIGS = {
  '市场': { personality: '...', memory_skills: '...', avatarColor: '#f59e0b' },
  // ...
};
```

被 `module.exports` 导出，但从未被任何文件导入。前端使用的是 `src/data/rolePresets.ts` 中的 `ROLE_PRESETS`。这两个数据结构功能重复但值不一致。

**建议**：统一到一个数据源。如果前端已自给自足，删除后端版本。

---

### M4: useEffect 依赖数组不完整（多处 eslint-disable）

以下文件存在 eslint-disable-next-line react-hooks/exhaustive-deps：

| 文件 | 行号 | 缺失依赖 | 风险 |
|------|------|----------|------|
| `Requirements.tsx` | 221 | `fetchPage` | `fetchPage` 是 `useCallback`，理论上稳定但依赖链长 |
| `Requirements.tsx` | 264 | `fetchPage` | 同上 |
| `Knowledge.tsx` | 312 | `fetchDocs`, `setShowDoc`, `setShowEdit` | 函数引用可能过期 |
| `Knowledge.tsx` | 328 | 无（仅 docChangeKey） | 低风险 |
| `Knowledge.tsx` | 361 | `editor` | editor 是 TipTap 实例，依赖不完整可能导致内容不同步 |
| `Knowledge.tsx` | 381, 394 | `isTextFile`, `isOfficeFile` | 这些是组件内函数，稳定但非最佳实践 |

**建议**：移除 eslint-disable，用 `useCallback` 包裹所有依赖，或使用 `useRef` 存储最新值。

---

### M5: Model.tsx — `m.provider` 字段映射不一致

**文件**：`src/pages/Model.tsx`

`ModelItem` 接口定义有 `provider: string`（第 9 行），但数据库模型表存储的字段是 `provider`（字符串如 "deepseek"、"minimax" 等）。在 list item 渲染中（第 215 行）：

```typescript
{(PROVIDER_LIST.find(p => p.id === m.provider)?.models || []).find(x => x.id === m.modelId)?.name || m.modelId}
```

这里假设 `m.provider` 等于 `PROVIDER_LIST` 中的 `p.id`。如果数据库中 `provider` 值与前端 `PROVIDER_LIST` 的 `id` 不一致，模型名称将回退到 `m.modelId`。目前看起来一致，但缺少防御性校验。

---

## 🟢 低风险问题（可选修复）

### L1: 硬编码字符串未常量化

大部分 toast 消息和 UI 文案内联在 JSX 中。以下是提取较好的文件作为对比：

| 文件 | 状态 |
|------|------|
| `Knowledge.tsx` | ✅ 有 `MESSAGES` 常量，覆盖 toast 消息 |
| `Settings.tsx` | ✅ 有 `MESSAGES` 常量 |
| `Requirements.tsx` | ⚠️ toast 消息散落各处（如 `'创建失败'`, `'需求创建成功'` 等） |
| `Model.tsx` | ⚠️ toast 消息内联 |
| `MCP.tsx` | ⚠️ toast 消息内联 |
| `Home.tsx` | ⚠️ 部分文案内联 |
| `QuickCapture.tsx` | ⚠️ toast 消息内联 |
| `Profile.tsx` | ⚠️ toast 消息内联 |
| `ProfileWizard.tsx` | ⚠️ 验证消息内联 |

**建议**：统一提取到各页面顶部的 `MESSAGES` 常量（参考 Knowledge.tsx 模式）。

---

### L2: 后端入口文件缺少 JSDoc

**文件**：`electron/database.cjs`

关键函数缺少 JSDoc：
- `initDatabase()` — 复杂初始化逻辑，无文档
- `query()` / `run()` — 核心数据库操作，无文档
- `callAI()` — AI 调用入口，无文档
- `formatReq()` / `formatDoc()` — 列索引映射，注释仅在代码尾部

**文件**：`electron/ipc.cjs`

整个 `setupIPC` 函数体无函数级 JSDoc，所有 handler 函数均无文档。

**建议**：至少为导出的公共 API 添加 JSDoc。

---

### L3: window.cjs 中 IPC handler 注册在 createWindow 内部

**文件**：`electron/window.cjs`

`get-settings`、`set-minimize-to-tray`、`toggle-qc-window`、`test-model-connection`、`read-clipboard-*` 等 handler 在 `createWindow()` 函数内注册。这导致：

1. 如果窗口被销毁后重建，handler 会重复注册（Electron ipcMain.handle 会覆盖旧 handler，但事件监听器不会）
2. handler 与窗口生命周期耦合，逻辑上不清晰

**建议**：将这些 handler 提取到 `setupIPC` 或独立的设置模块中。

---

### L4: Insights.tsx — aiInsights key 使用 `insight.title || i`

**文件**：`src/pages/Insights.tsx`，第 455 行

```typescript
<div key={insight.title || i} ...>
```

如果两个 insight 有相同的 title，React 的 reconciliation 会出错。虽然 AI 生成的 title 通常不重复，但建议使用更稳定的 key（如 `insight.title + '-' + i` 或添加唯一 ID）。

---

### L5: 内联样式过多

项目大量使用内联 `style={{...}}`，每个组件有 50-200+ 处内联样式。好的一面是使用 CSS 变量（`var(--wiki-*)`）保持主题一致性。

已提取常量的示例：
- `ProfileWizard.tsx`：`C = { card, input, primary, secondary, chip }` ✅
- `QuickCapture.tsx`：`FILE_CHIP_STYLE` ✅
- `Profile.tsx`：`C = { input, card, chip }` ✅

建议页面级别的公共样式也提取（如 `statusConfig`、`priorityConfig` 在 Requirements.tsx 中已提取 ✅）。

---

## ✅ 审查通过项（无问题）

| 维度 | 文件 | 说明 |
|------|------|------|
| console.log 清理 | 全部 | 仅保留 `console.error`（符合规范），无 `console.log` 调试残留 |
| 条件渲染 `&&` 风险 | 全部 | 所有 `&&` 左侧均为 boolean，无数字 0 风险 |
| 事件清理 | preload.cjs, QuickCapture.tsx, Settings.tsx | addEventListener 均有对应 removeEventListener，返回 unsubscribe 函数 |
| key 属性 | 全部页面 | 列表 map 使用稳定 key（id、name 等） |
| 类型安全 | 全部 .tsx | 使用 TypeScript 接口定义，有显式类型注解 |
| Chat 逻辑 | database.cjs | `callAI`/`chatWithAI`/`_callModel` 有 Anthropic vs OpenAI 区分，超时处理，错误解析 |
| 加密 | database.cjs | `encryptApiKey`/`decryptApiKey` 使用 Electron safeStorage，有明文回退 |
| SQL 注入防护 | ipc.cjs | `ALLOWED_TABLES` 白名单、`ALLOWED_METHODS` 白名单、字段级白名单校验 |
| QC 窗口隔离 | ipc.cjs | QC 窗口只能读 requirements，其他操作被拒绝 |

---

## 修复优先级

| 优先级 | ID | 问题 | 影响 |
|--------|-----|------|------|
| 🔴 P0 | B1 | `generateAISummary` 未定义 | 文档 AI 总结功能崩溃 |
| 🔴 P0 | B2 | `activities` 未定义 | 洞察导出报告功能崩溃 |
| 🟡 P1 | M1 | Trash2Icon 未使用 | Tree-shaking 无效，轻微增加 bundle |
| 🟡 P1 | M4 | useEffect 依赖不完整 | 潜在过时闭包 Bug |
| 🟢 P2 | M2/M3 | 死代码 | 代码可维护性 |
| 🟢 P2 | L1-L5 | 低风险改进 | 代码质量和一致性 |

---

## 总结

代码整体质量较好：核心安全措施到位（SQL 注入防护、API Key 加密、QC 窗口隔离）、TypeScript 类型覆盖全面、事件清理规范。**但存在 2 个致命 Bug 需要立即修复**（B1、B2），以及 `eslint-disable` 依赖数组问题（M4）可能在特定场景下导致数据不同步。

关键修复后，建议：
1. 全局移除所有 `eslint-disable-next-line react-hooks/exhaustive-deps`，修复真正的依赖问题
2. 统一提取 toast 文案常量
3. 清理 `MCP_FIELDS`/`MODEL_FIELDS`/`ROLE_CONFIGS` 死代码或让 IPC 层使用它们
