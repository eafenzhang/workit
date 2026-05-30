# Workit UI/UX 交互一致性审查报告

> 审查日期：2025-07-17  
> 审查范围：9 个页面 + 6 个组件  
> 审查维度：7 项

---

## 总览评分

| 维度 | 评分 | 状态 |
|------|------|------|
| 1. 颜色一致性 | ⭐⭐⭐ | ⚠️ 需改进 |
| 2. 圆角一致性 | ⭐⭐⭐⭐ | ✅ 基本一致 |
| 3. 间距一致性 | ⭐⭐⭐ | ⚠️ 存在偏差 |
| 4. 暗色模式适配 | ⭐⭐⭐ | ⚠️ 需改进 |
| 5. 交互反馈 | ⭐⭐⭐ | ⚠️ 部分缺失 |
| 6. 空/加载/错误态 | ⭐⭐⭐⭐ | ✅ 较完善 |
| 7. 字体大小一致性 | ⭐⭐⭐⭐ | ✅ 基本一致 |

---

## 1. 颜色一致性

### 1.1 CSS 变量使用情况

**✅ 正确使用 CSS 变量的场景（良好实践）：**

所有页面和组件的主体结构均正确使用了以下 CSS 变量：
- `var(--wiki-bg)` — 页面背景
- `var(--wiki-surface)` — 卡片/容器背景
- `var(--wiki-surface2)` — 次级容器背景
- `var(--wiki-text)` — 主文字颜色
- `var(--wiki-text2)` — 次级文字
- `var(--wiki-text3)` — 三级文字
- `var(--wiki-border)` — 边框颜色
- `var(--wiki-accent)` — 强调色
- `var(--wiki-overlay)` / `var(--wiki-overlay-heavy)` — 遮罩层

**❌ 硬编码颜色的场景（需要改进）：**

| 颜色值 | 用途 | 出现位置 | 建议 |
|--------|------|----------|------|
| `#ef4444` | 错误/删除/危险操作 | Requirements, Knowledge, Model, MCP, Settings, Sidebar, 多个组件 | 新建 `--wiki-danger` 变量 |
| `#10b981` | 成功/启用状态 | Requirements, Model, MCP, Insights, Sidebar | 新建 `--wiki-success` 变量 |
| `#6366f1` | AI 按钮/分析功能 | Requirements, Knowledge, HomeInput, ContentBlockRenderer | 新建 `--wiki-accent2` 或 `--wiki-ai` 变量 |
| `#f59e0b` | 警告/收藏/星级 | Requirements, Knowledge, Browser, Sidebar | 新建 `--wiki-warning` 变量 |
| `#06b6d4` | 状态"实现中" | Requirements.tsx (statusConfig) | 纳入设计系统 |
| `#8b5cf6` | 状态"测试中" | Requirements.tsx (statusConfig) | 纳入设计系统 |
| `#ec4899` | 图片类型/消息中心 | Knowledge.tsx, Sidebar.tsx | 纳入设计系统 |
| `#22c55e` | 表格文件类型 | Knowledge.tsx | 纳入设计系统 |
| `#f97316` | PPT 文件类型 | Knowledge.tsx | 纳入设计系统 |
| `#6b7280` | TXT 文件类型 | Knowledge.tsx | 纳入设计系统 |
| `#1a1a1a` | 文件预览文字 | ContentBlockRenderer.tsx (L698) | 使用 `var(--wiki-text)` |
| `#fff` | 内嵌 iframe 背景 | Browser.tsx (L242) | 暗色模式无法适配 |
| `rgba(0,0,0,0.6)` | 模态遮罩 | Model.tsx (L261), MCP.tsx (L170), QuickCapture.tsx (L456) | 使用 `var(--wiki-overlay)` |
| `rgba(0,0,0,0.4)` | 浏览器预览遮罩 | Browser.tsx (L663) | 使用 `var(--wiki-overlay)` |
| `rgba(255,255,255,0.05)` | 视频全屏控制栏 | ContentBlockRenderer.tsx (L176) | 使用 `var(--wiki-surface2)` + opacity |

### 1.2 Tailwind 类名与内联样式混用

`Requirements.tsx` 存在大量 `text-wiki-text` / `text-wiki-text2` / `text-wiki-text3` 作为 Tailwind 类名，但这些并不是标准 Tailwind 类，实际渲染依赖全局 CSS 定义。同时同一文件中又大量使用 `style={{ color: 'var(--wiki-text)' }}` 内联样式。两种写法混用降低了可维护性。

**建议：** 统一使用内联 `style` 方式引用 CSS 变量（与其他页面保持一致），或确认全局 CSS 确实定义了 `text-wiki-*` 工具类。

---

## 2. 圆角一致性

### 2.1 圆角值分布

| 圆角值 | 使用场景 | 文件 |
|--------|----------|------|
| `rounded-xl` (12px) | 消息气泡、Profile 卡片、HomeInput 容器 | Home.tsx, Profile.tsx, ProfileWizard.tsx |
| `rounded-lg` (8px) | 按钮、卡片、输入框、下拉菜单 **（主力圆角）** | 几乎所有文件 |
| `rounded-md` (6px) | 小图标容器、状态标签、Settings 卡片 | Requirements, Knowledge, Settings, Sidebar |
| `rounded` (4px) | 分页按钮、状态流转按钮 | Requirements.tsx (L497), Knowledge.tsx (L242) |
| `rounded-full` | 状态圆点、头像、浮动按钮 | 多处 |

### 2.2 问题

1. **Home.tsx 消息气泡** 使用 `rounded-xl` 同时通过内联 `borderBottomRightRadius: '4px'` / `borderBottomLeftRadius: '4px'` 覆盖局部圆角。这种 12px→4px 的混合是刻意的设计选择（聊天气泡风格），可以保留。

2. **Requirements.tsx 分页器** 使用 `rounded`（4px），而其他地方同类按钮使用 `rounded-lg`（8px）。建议统一为 `rounded-lg`。

3. **Settings.tsx** 在 `rounded-lg` 和 `rounded-md` 之间混用：导航项用 `rounded-lg`，内容卡片用 `rounded-lg`，但 `p-5 rounded-lg` 中的 padding 5（20px）配合 rounded-lg（8px）视觉上协调。

4. **Profile.tsx / ProfileWizard.tsx** 使用 `rounded-xl` 作为卡片圆角，与其他页面的 `rounded-lg` 不一致。

**建议：**
- 主容器/卡片：统一 `rounded-lg`
- 模态弹窗：统一 `rounded-lg`
- 小按钮/标签：统一 `rounded-md`
- 特殊场景（聊天气泡、头像）可保留现有设计

---

## 3. 间距一致性

### 3.1 页面级 Padding

| 页面 | 水平 Padding | 垂直 Padding |
|------|-------------|-------------|
| Home.tsx | `px-6`(header) / `px-4`(content) | `py-2.5`(header) / `py-4`(msg) |
| Requirements.tsx | `px-8` | `pt-8` / `pb-6` |
| Knowledge.tsx | `p-6`(main) / `p-5`(sidebar) | — |
| Insights.tsx | `p-8` | — |
| Model.tsx | `p-8` | — |
| MCP.tsx | `p-8` | — |
| Settings.tsx | `p-8`(content) / `p-4`(sidebar) | — |
| Profile.tsx | `p-8` | — |
| Browser.tsx | `px-3`(toolbar) | `py-2`(toolbar) |

**主页与其他页面的 padding 不一致：** Home 使用 `px-4`/`px-6`，而其他 6 个页面使用 `px-8`/`p-8`。

### 3.2 组件间距

| 间距 | 场景 | 一致性 |
|------|------|--------|
| `gap-2` | 按钮组内间距 | ✅ 一致 |
| `gap-3` | 筛选栏、操作按钮组 | ✅ 一致 |
| `gap-4` | 表单字段、消息列表 | ✅ 一致 |
| `mb-4` | 区块间距 | ✅ 一致 |
| `mb-6` | 大区块间距 | ⚠️ Insights 用 `mb-6`，其他用 `mb-4` |

### 3.3 按钮内边距

| 尺寸 | Padding | 场景 |
|------|---------|------|
| 标准按钮 | `px-4 py-2` | 主操作按钮 ✅ |
| 小按钮 | `px-3 py-1.5` / `px-3 py-2` | 辅助操作 ⚠️ 不统一 |
| 图标按钮 | `p-1` / `p-1.5` / `p-2` | ⚠️ 3 种尺寸混用 |

**建议：**
- 页面 padding 统一为 `px-8`（除 Home 首页有特殊布局需求可保留）
- 辅助按钮统一 `px-3 py-1.5`
- 图标按钮统一 `p-1.5`

---

## 4. 暗色模式适配

### 4.1 适配良好的部分

- 所有使用 `var(--wiki-*)` 的部分自动适配暗色模式 ✅
- Settings 页面提供完整的浅色/深色/系统主题切换 ✅
- 页面布局结构使用 CSS 变量背景和边框 ✅

### 4.2 存在暗色模式问题的场景

| 问题 | 位置 | 严重度 |
|------|------|--------|
| 语义色（红/绿/蓝/黄）硬编码不随主题变化 | 全局 | 🔴 高 |
| 模态遮罩 `rgba(0,0,0,0.6)` 暗色下过暗 | Model, MCP, QuickCapture | 🟡 中 |
| `#ffffff` 内嵌 iframe 背景 | Browser.tsx L242 | 🟡 中 |
| `#1a1a1a` 文件预览文字 | ContentBlockRenderer L698 | 🟡 中 |
| `#fff` 硬编码文字色（status pill 激活态） | Requirements.tsx L471 | 🟡 中 |
| `rgba(239,68,68,0.1)` 等硬编码背景 | 多处删除/危险按钮 | 🟢 低 |
| `rgba(99,102,241,0.08)` AI 分析区域背景 | Requirements.tsx L581 | 🟢 低 |

### 4.3 关键修复建议

1. **创建语义化 CSS 变量：**
```css
--wiki-danger: #ef4444;
--wiki-danger-bg: rgba(239, 68, 68, 0.1);
--wiki-success: #10b981;
--wiki-success-bg: rgba(16, 185, 129, 0.1);
--wiki-warning: #f59e0b;
--wiki-warning-bg: rgba(245, 158, 11, 0.12);
--wiki-info: #6366f1;
--wiki-info-bg: rgba(99, 102, 241, 0.12);
```

2. **暗色模式下调整 overlay：**
```css
[data-theme="dark"] {
  --wiki-overlay: rgba(0, 0, 0, 0.7);
}
```

---

## 5. 交互反馈

### 5.1 Hover 状态

| 文件 | Hover 实现 | 评价 |
|------|-----------|------|
| Home.tsx | `hover:brightness-95` 用于历史列表 | ⚠️ 风格不同 |
| Requirements.tsx | `hover:bg-wiki-surface2` | ✅ 统一 |
| Knowledge.tsx | `hover:bg-wiki-surface2` + `hover:border-indigo-500/40` 卡片 | ⚠️ 边框 hover 风格特殊 |
| Insights.tsx | `hover:border-indigo-500/30` 洞察卡片 | ✅ 合理 |
| Model.tsx | `hover:bg-wiki-surface2` | ✅ 统一 |
| MCP.tsx | `hover:bg-wiki-surface2` | ✅ 统一 |
| Settings.tsx | 开关无 hover 效果 | ⚠️ 缺失 |
| Profile.tsx | `hover:opacity-90` | ✅ 合理 |
| Browser.tsx | `hover:bg-wiki-surface2` | ✅ 统一 |
| Sidebar.tsx | `hover:bg-wiki-surface2`（动态） | ✅ 统一 |
| TitleBar.tsx | `hover:bg-wiki-surface2` + `hover:bg-red-500`（关闭按钮） | ✅ 合理 |
| HomeInput.tsx | `hover:brightness-95` 模型选择 | ⚠️ 风格不同 |
| QuickCapture.tsx | `hover:scale-110` 浮动按钮 | ✅ 合理 |

### 5.2 Active/Pressed 状态

⚠️ **全局缺失：** 几乎所有按钮都缺少 `active` 状态（按下时的视觉反馈）。仅有 Settings.tsx 的标签切换有切换动画。

### 5.3 Disabled 状态

- `disabled:opacity-30` — Requirements.tsx 分页 ✅
- `disabled:opacity-50` — HomeInput.tsx textarea ⚠️ 与其他不一致
- `disabled:cursor-not-allowed` — Settings.tsx ⚠️ 仅部分使用
- `disabled:opacity-30` + `disabled:cursor-not-allowed` — Knowledge.tsx 分类编辑 ✅
- 状态流转按钮通过 `cursor: 'default'` 实现视觉禁用 ⚠️ 非标准方式

### 5.4 Focus 状态

- ✅ `focus:outline-none` 广泛使用
- ❌ 缺少替代的 focus 可见指示器（如 `focus:ring-2`）。对于键盘导航用户不友好。

**建议：**
- 统一 hover 效果为 `hover:bg-wiki-surface2`
- 添加 `active:scale-[0.98]` 或 `active:brightness-90` 作为按下反馈
- 统一 disabled 样式：`disabled:opacity-40 disabled:cursor-not-allowed`
- 为可聚焦元素添加 `focus-visible:ring-2 focus-visible:ring-[var(--wiki-text)]` 替代方案

---

## 6. 空状态 / 加载态 / 错误态

### 6.1 按页面评分

| 页面/组件 | 空状态 | 加载态 | 错误态 |
|-----------|--------|--------|--------|
| Home.tsx | ✅ 欢迎页 | ✅ 发送中 spinner | ⚠️ 仅 catch 显示错误消息 |
| Requirements.tsx | ❌ 无空列表态* | ✅ 加载 spinner | ❌ 静默忽略错误 |
| Knowledge.tsx | ✅ 空文档提示 | ⚠️ 无显式加载态 | ❌ 无错误处理 |
| Insights.tsx | ✅ 未生成提示 | ✅ Skeleton + spinner | ✅ 错误+重试按钮 |
| Model.tsx | ✅ 空模型提示 | ✅ 加载 spinner | ❌ 静默处理 |
| MCP.tsx | ✅ 空服务提示 | ❌ 无加载态 | ❌ 静默处理 |
| Settings.tsx | — | ⚠️ 更新状态覆盖全面 | ⚠️ 部分覆盖 |
| Profile.tsx | — | ❌ 无加载态 | ❌ 无错误态 |
| Browser.tsx | ✅ 空 URL 提示 | ✅ 加载进度条 (P1-11) | ❌ webview 无错误态 |
| HomeInput.tsx | ✅ 禁用态 | — | — |
| ProfileWizard.tsx | — | — | ✅ 表单验证 |
| QuickCapture.tsx | ✅ 空剪贴板 toast | — | ✅ toast 错误提示 |

\* Requirements 空列表态：当列表为空时只显示空白区域，缺少"暂无需求"的空状态提示。

### 6.2 最佳实践标杆

**Insights.tsx** 是错误状态处理的最佳范例：
- KPI 区域：Skeleton 加载 → 错误卡片+重试按钮 → 正常数据
- 图表区域：Skeleton 加载 → 错误卡片+重试按钮 → Suspense+图表
- AI 洞察：未生成引导 → Loader2Icon 加载 → 错误卡片+重试 → 洞察卡片

**Knowledge.tsx** 是空状态处理的最佳范例：空文档列表有图标+标题+引导文字。

### 6.3 改进建议

1. **Requirements.tsx**：列表为空时显示引导性空状态（如"点击新建需求开始"）；加载失败时显示重试按钮而非静默失败。
2. **Knowledge.tsx**：添加文档列表的加载骨架屏。
3. **MCP.tsx**：添加列表加载指示器。
4. **Profile.tsx**：添加数据加载中的骨架屏。
5. **Browser.tsx**：添加 webview 加载失败时的友好提示。

---

## 7. 字体大小一致性

### 7.1 当前层级体系

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| H1 页面标题 | `text-xl` (20px) | `font-semibold` | 所有页面标题 ✅ |
| H2 区块标题 | `text-base` (16px) | `font-semibold` | Settings 二级标题 |
| H3 小标题 | `text-sm` (14px) | `font-semibold` | Insights KPI 标题 |
| 正文 | `text-sm` (14px) | `font-normal` | 描述文字、消息内容 |
| UI 文字 | `text-xs` (12px) | `font-medium` / `font-normal` | 按钮、标签、表单 |
| 辅助文字 | `text-xs` (12px) | `font-normal` | `text-wiki-text3` 注释 |
| 微文字 | `text-[10px]` / `text-[11px]` | — | 极小标签、文件元数据 |

### 7.2 不一致问题

1. **详情页标题：** Requirements 详情用 `text-base font-bold`，Knowledge 详情用 `text-lg font-bold`。应统一为 `text-lg font-semibold`。

2. **描述文字：** Requirements 列表用 `text-sm`，Knowledge 描述用 `text-sm`，Insights 描述用 `text-sm`。✅ 一致。

3. **模态标题：** Model 模态用 `text-lg font-semibold`，Knowledge 分类编辑用 `text-base font-semibold`。建议统一为 `text-lg font-semibold`。

4. **消息内容：** Home.tsx 消息气泡用 `text-sm`，ContentBlockRenderer 文本块在 chatFormat 模式下用 `text-xs`。不一致。

5. **文件名字大小：** QuickCapture FileChip 用 `text-xs font-medium`，Knowledge 用 `text-xs font-medium`。✅ 一致。

### 7.3 字重使用规范

| 场景 | 当前用法 | 建议 |
|------|---------|------|
| 页面标题 | `font-semibold` | ✅ 保持 |
| 区块标题 | `font-semibold` / `font-bold` / `font-medium` | 统一为 `font-semibold` |
| 卡片标题 | `font-semibold` / `font-bold` | 统一为 `font-semibold` |
| 按钮文字 | `font-medium` | ✅ 保持 |
| 标签文字 | `font-medium` | ✅ 保持 |

---

## 优先级问题汇总

### 🔴 P0 — 必须修复

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 1 | 语义状态色硬编码，暗色模式不可读 | 全局 | 暗色用户体验 |
| 2 | `#fff` 硬编码在状态 pill 激活态 | Requirements.tsx L471 | 暗色模式对比度 |
| 3 | `#1a1a1a` 文件预览文字硬编码 | ContentBlockRenderer L698 | 暗色模式不可见 |
| 4 | 页面 padding 不一致（`px-4` vs `px-8`） | Home vs 其他页面 | 视觉跳动 |

### 🟡 P1 — 建议修复

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 5 | 模态遮罩硬编码 `rgba(0,0,0,0.6)` | Model, MCP, QuickCapture | 暗色模式一致性 |
| 6 | `rounded` vs `rounded-lg` 混用 | Requirements 分页 | 视觉细节 |
| 7 | 全局缺少 `active` 按压状态 | 所有按钮 | 交互反馈 |
| 8 | 全局缺少 `focus-visible` 焦点环 | 所有可聚焦元素 | 键盘可访问性 |
| 9 | disabled 透明度不一致（0.3 vs 0.5） | 多处 | 行为一致性 |
| 10 | Requirements 列表缺少空状态 | Requirements.tsx | 用户体验 |

### 🟢 P2 — 可优化

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 11 | 详情页标题字重不一致 | Requirements vs Knowledge | 细微视觉 |
| 12 | 图标按钮 padding 不统一（`p-1`/`p-1.5`/`p-2`） | 多处 | 细微视觉 |
| 13 | 缺少静默错误的用户提示 | Requirements, Knowledge, MCP | 调试体验 |
| 14 | Sidebar navItems 颜色硬编码 | Sidebar.tsx | 一致性 |
| 15 | AI 面板背景硬编码 `rgba(99,102,241,0.08)` | Requirements.tsx | 暗色模式微调 |

---

## 附录：建议的新增 CSS 变量

```css
:root {
  /* 语义状态色 */
  --wiki-danger: #ef4444;
  --wiki-danger-bg: rgba(239, 68, 68, 0.10);
  --wiki-success: #10b981;
  --wiki-success-bg: rgba(16, 185, 129, 0.10);
  --wiki-warning: #f59e0b;
  --wiki-warning-bg: rgba(245, 158, 11, 0.12);
  --wiki-info: #6366f1;
  --wiki-info-bg: rgba(99, 102, 241, 0.12);
  
  /* 遮罩 */
  --wiki-overlay: rgba(0, 0, 0, 0.6);
  --wiki-overlay-heavy: rgba(0, 0, 0, 0.75);
}

[data-theme="dark"] {
  --wiki-overlay: rgba(0, 0, 0, 0.75);
  --wiki-overlay-heavy: rgba(0, 0, 0, 0.85);
}
```

---

*报告由 Product Manager Alice 生成*
