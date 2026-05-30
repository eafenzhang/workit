# Workit 全面核查汇总报告

> 审查日期：2026-05-31 | 4 角色并行：QA + PM + 架构 + 工程

---

## 综合评分

| 维度 | 审查人 | 评分/评级 | P0 | P1 | P2 |
|------|--------|-----------|----|----|-----|
| 功能完整性 | QA 严过关 | 7.3/10 | 2 | 4 | 14 |
| UI 交互一致性 | PM 许清楚 | — | 4 | 6 | 5 |
| 架构 + 性能 + 数据 | 架构师 高见远 | B+ | 6 | 12 | 18 |
| 代码质量 | 工程师 寇豆码 | — | 2 | 4 | 0 |
| **合计** | | | **14** | **26** | **37** |

---

## 🔴 P0 必须立即修复（14 项）

### 运行时崩溃（3 项）
| # | 文件 | 行 | 问题 |
|---|------|-----|------|
| QA-01 | `Insights.tsx` | 185 | `handleExport` 引用已删除的 `activities` 变量 → ReferenceError |
| CODE-01 | `ipc.cjs` | 294 | `generateAISummary` 未定义 → AI 总结崩溃 |
| QA-02 | `Requirements.tsx` | 326 | `res.data` 在 IPC 下为 undefined → 创建需求失败 |

### 安全漏洞（2 项）
| # | 文件 | 问题 |
|---|------|------|
| ARCH-01 | `window.cjs` | `read-local-file` 无路径白名单 → 任意文件读取 |
| ARCH-02 | `ipc.cjs` | `test-model-connection` 传明文 API Key 到渲染进程 |

### UI 一致性问题（4 项）
| # | 问题 |
|---|------|
| UX-01 | 语义状态色全局硬编码（`#ef4444`/`#10b981` 等），暗色模式不可读 |
| UX-02 | Requirements 状态 pill 激活态 `#fff` 硬编码 |
| UX-03 | ContentBlockRenderer 文件预览 `#1a1a1a` 硬编码 |
| UX-04 | 页面 padding 不统一（Home `px-4` vs 其余 `px-8`） |

### 架构/性能（3 项）
| # | 问题 |
|---|------|
| ARCH-03 | `api.ts` 全链路返回 `Promise<any>` → 类型安全缺失 |
| ARCH-04 | 需求列表查询用 JS `filter/sort` 而非 SQL WHERE/LIMIT |
| ARCH-05 | 对话历史 `home_conversations` 全量存 localStorage → 溢出风险 |

### 代码质量（2 项）
| # | 问题 |
|---|------|
| CODE-02 | `Home.tsx` `Trash2Icon` 导入未使用 |
| CODE-03 | `database.cjs` 中 `MCP_FIELDS`/`MODEL_FIELDS`/`ROLE_CONFIGS` 死代码 |

---

## 🟡 P1 应优先修复（26 项要点）

- QA: MCP 缺编辑功能、Knowledge 编辑器内容丢失风险、HomeInput API 调用方式错误
- UX: 圆角混用(`rounded`/`rounded-md`/`rounded-lg`)、全局缺 active 按压态和 focus-visible
- ARCH: window.cjs(623行) 和 ipc.cjs(492行) 过重需拆分、tiptap 非按需加载(+392KB)
- CODE: 6 处 `eslint-disable` 掩盖不完整 useEffect 依赖

---

## 详细报告文件

| 文件 | 审查人 | 内容 |
|------|--------|------|
| `audit-v2-functional.md` | QA 严过关 | 功能完整性 20+ 问题 |
| `audit-v2-ux.md` | PM 许清楚 | UI 一致性 15 项 |
| `audit-v2-arch.md` | 架构师 高见远 | 架构+性能+数据 36 项 |
| `audit-v2-code.md` | 工程师 寇豆码 | 代码质量 6 项 |
