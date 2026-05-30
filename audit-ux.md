# Workit UI/UX 交互审查报告

> 审查日期：2025-07-17  
> 审查人：Alice（产品经理）  
> 审查范围：8 个页面组件 + 6 个 UI 组件  
> 技术栈：React 19 + Tailwind CSS + MUI + Recharts + lucide-react + Tiptap

---

## 审查总览

| 维度 | 评级 | P0 数量 | P1 数量 | P2 数量 |
|------|------|---------|---------|---------|
| 视觉一致性 | B | 1 | 2 | 1 |
| 交互流畅性 | B- | 2 | 2 | 1 |
| 响应式适配 | B+ | 0 | 1 | 1 |
| 暗色模式 | C+ | 3 | 2 | 1 |
| 无障碍性 | D | 2 | 3 | 1 |
| 信息架构 | B+ | 0 | 1 | 2 |

**总计：P0 × 8，P1 × 11，P2 × 7**

---

## 一、视觉一致性

### P0-01: 暗色模式图表颜色全部硬编码，深色背景下不可读

**文件**: `Dashboard.tsx` L116-118, L125-142; `Insights.tsx` L123-127, L139-144

Dashboard 中 AreaChart 的渐变色（`#6366f1`、`#06b6d4`、`#10b981`）和 Insight 中 BarChart 的 `fill="#6366f1"` 均为硬编码。这些颜色在浅色模式下尚可，但暗色模式下图例色块、图表线条与深色背景对比不足，趋于刺眼或难以分辨。

```tsx
// Dashboard.tsx L116 — 图例色块硬编码
<div className="w-2 h-2 rounded-full" style={{ background: '#6366f1' }} />
// L125-142 — 渐变定义硬编码
<linearGradient id="g1" ...>
  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
```

**建议**: 将图表色板抽取为 CSS 变量 `--wiki-chart-1` ~ `--wiki-chart-5`，在 `.dark` 中替换为更适合暗色主题的色值（如提高亮度 / 饱和度）。

---

### P1-01: 圆角（border-radius）不统一

**文件**: 全局

项目混用 `rounded-lg`（8px）、`rounded-md`（6px）、`rounded-full`、`rounded`（4px）。

| 位置 | 值 |
|------|-----|
| 卡片容器 | `rounded-lg` |
| 按钮 | `rounded-lg` 或 `rounded-md` |
| 输入框 | `rounded-lg` 或 `rounded-md` |
| 状态标签 | `rounded` |
| 图标容器 | `rounded-md` 或 `rounded` |

Dashboard L84 卡片用 `rounded-lg`，而 Knowledge L612 卡片同样用 `rounded-lg`，但 Settings L143 卡片也用 `rounded-lg`。问题在于输入框混用 `rounded-lg`（Requirements L407）和 `rounded-md`（Model L252）——用户感官上不统一。

**建议**: 统一为 `rounded-lg`（8px）作为交互元素主圆角，`rounded-full` 用于标签/徽章。

---

### P1-02: 间距（spacing）不统一

**文件**: `Dashboard.tsx`, `Requirements.tsx`, `Knowledge.tsx`

- Dashboard L66: `p-8`
- Requirements L402: `px-8 pt-8`（仅顶部有 padding，底部没有）
- Knowledge L498: `p-5`（侧边栏）
- Settings L101: `p-8`
- Insights L63: `p-8`

同一层级页面应使用一致的页面级 padding。目前 Dashboard/Insights 用 `p-8`，而 Requirements 列表只有 `px-8 pt-8`（底部通过 `pb-6` 单独处理），Knowledge 主内容区用 `p-6`。

**建议**: 所有页面统一使用 `p-6` 或 `p-8`。

---

### P2-01: 多处内联样式与 Tailwind 混用，风格不统一

**文件**: 全局

代码中存在大量 `style={{ background: 'var(--wiki-surface)' }}` 内联样式与 Tailwind `className` 并存。这在 CSS 变量主题切换场景下是必要的，但部分组件（如 `FileChip.tsx` L74）用内联样式完全替代 Tailwind，失去 Tailwind 的响应式/状态变体（`hover:`、`dark:`）能力。

**建议**: 对仅需 CSS 变量的属性继续用内联，背景/边框/文字色统一走 Tailwind 的 `bg-wiki-*`、`text-wiki-*`、`border-wiki-*`。

---

## 二、交互流畅性

### P0-02: Requirements 列表无 loading 状态

**文件**: `Requirements.tsx` L465-469

列表从 API 加载期间无任何 loading 指示器。用户首次进入看到空白列表，可能误以为无数据。

```tsx
// L465 — 无 loading 判断，直接 map
{requirements.map((req) => (...))}
```

**建议**: 添加 `loading` 状态，显示骨架屏或 spinner。可复用 Index.tsx 中的 `Loading` 组件。

---

### P0-03: Dashboard 数据请求无错误处理

**文件**: `Dashboard.tsx` L51-63

三个 API 调用使用 `Promise.all`，但无 `.catch()`。任一接口失败时页面将永久停留在 loading 状态（`setLoading(true)` 初始值，永不改为 `false`）。

```tsx
// L56-62 — 无 catch，失败后 loading 永远为 true
Promise.all([...]).then(([...]) => {
  setStats(statsData);
  setLoading(false);
});
```

**建议**: 添加 `.catch()` 处理，设置 `error` 状态并展示重试按钮。

---

### P1-03: Model.tsx 页面 loading 状态使用旋转图标但无骨架

**文件**: `Model.tsx` L234

```tsx
{loading && <div ...><RefreshCwIcon size={24} className="animate-spin" /></div>}
```

模型列表加载时只在底部显示一个小旋转图标，而卡片区域瞬间从空状态变为满列表——缺少过渡。

**建议**: 使用骨架卡片（skeleton cards）替代旋转图标，消除布局跳动。

---

### P1-04: Browser 页面无页面加载进度指示

**文件**: `Browser.tsx` L217-218

webview 加载新页面时无任何进度反馈（如进度条或加载 spinner）。用户输入 URL 回车后到页面渲染之间有一段空白等待期。

**建议**: 监听 webview 的 `did-start-loading` / `did-stop-loading` 事件，在地址栏右侧或顶部显示加载进度条。

---

### P2-02: Knowledge 文本文件加载使用魔法字符串

**文件**: `Knowledge.tsx` L196, L411

```tsx
// L196
setFileContent('__loading__'); // show loading state
// L411
fileContent === '__loading__' ? (...) 
```

使用字符串常量 `'__loading__'` 标识加载状态，应改为 `useState<'loading' | 'loaded' | 'error'>` 显式状态管理。

---

## 三、响应式适配

### P1-05: 固定宽度导致小窗口布局挤压

**文件**: `Dashboard.tsx` L148, `Insights.tsx` L132

Dashboard 的柱状图卡片宽度固定 `w-[280px]`，Insights 的饼图卡片同样 `w-[280px]`。窗口宽度 < 1024px 时，这些固定宽度组件会挤压主内容区。

```tsx
// Dashboard L148
<div className="w-[280px] p-6 rounded-lg" ...>
```

**建议**: 改为 `min-w-[240px] max-w-[320px] flex-1` 或使用 `basis-1/3` 等响应式宽度。

---

### P2-03: Knowledge 侧边栏固定 200px 无折叠能力

**文件**: `Knowledge.tsx` L498

```tsx
<div className="flex flex-col w-[200px] min-w-[200px] ...">
```

在较小窗口（1280px 以下）时，200px 侧边栏加上主内容区的 260px 最小卡片宽度，总宽度偏紧。

**建议**: 添加折叠/展开按钮，或改为 `w-[180px]` 配合 `min-w-0`。

---

## 四、暗色模式

### P0-04: OfficePreview 组件完全硬编码浅色背景

**文件**: `OfficePreview.tsx` L126, L160-234

SheetView 子组件大量使用硬编码浅色：
- L126: `background: '#fff'`, `color: '#1a1a1a'`
- L160: `background: '#f8f9fa'`
- L183: `background: '#fff'`
- L170: `background: '#e8eaed'`
- L186-225: 所有单元格 `background: '#f1f3f4'` / `'#fff'` / `'#f8f9fa'`

```tsx
// L126
style={{ background: '#fff', color: '#1a1a1a', fontSize: '14px', lineHeight: '1.8' }}
```

在暗色模式下，Office 文档预览将是白底黑字在一片黑色界面中突兀出现，且表格文字完全不可读（黑字 + 暗背景 = 对比度不足时反而还行，但这里始终是白底所以实际上在暗色模式下会非常亮）。

**建议**: 全部替换为 CSS 变量引用或通过 ThemeContext 动态切换。

---

### P0-05: Knowledge 编辑器工具栏激活态硬编码 `bg-indigo-100`

**文件**: `Knowledge.tsx` L462-478

```tsx
// L462
className={`p-2 rounded-md ${editor?.isActive('bold') ? 'bg-indigo-100' : 'hover:bg-wiki-surface2'}`}
```

`bg-indigo-100` 是 Tailwind 硬编码类，暗色模式下浅蓝底 + 白字对比度极差，工具栏按钮激活状态不可见。

**建议**: 替换为 `bg-wiki-surface2` 或使用 `data-[active]` 配合 CSS 变量。

---

### P0-06: select/input 原生控件在暗色模式下无样式适配

**文件**: `Requirements.tsx` L423-429, `Model.tsx` L252-268, `Knowledge.tsx` L450

原生 `<select>` 和 `<input type="date">` 使用 OS 默认渲染。在 Windows 暗色模式下，下拉框底色为白色、文字为黑色，与暗色页面完全不协调。

**建议**: 使用自定义 Select 组件（如 Radix UI Select 或 Headless UI Listbox），或至少添加 `color-scheme: dark` CSS 属性。

---

### P1-06: QuickCapture 视频/文件全屏预览背景硬编码

**文件**: `QuickCapture.tsx` L1169, L1194

```tsx
// L1169 — 视频预览容器
style={{ background: '#1a1a2e' }}
// L1194 — 文件预览内容
style={{ background: '#fff' }}
```

这两个值在浅色模式下工作正常（全屏覆盖），但 `#1a1a2e` 在暗色模式下与暗色界面无区分，文件预览的白色背景过于刺眼。

**建议**: 全屏背景用 `#000` 统一，文件预览内容区改为读取当前主题变量。

---

### P2-04: 暗色模式下 Chart Tooltip 背景透明可能导致文字不可读

**文件**: `Dashboard.tsx` L139, `Insights.tsx` L125

```tsx
contentStyle={{ background: 'transparent', border: 'none', color: 'var(--wiki-text)', fontSize: 12 }}
```

Tooltip 背景透明，当 tooltip 悬浮在图表数据点上时，背景色透过 tooltip 文字。浅色模式数据点区域浅色，文字可读；暗色模式背景深色，白字可读。但没有任何背景遮罩，tooltip 文字可能和图表内容重叠导致可读性下降。

**建议**: 给 tooltip 添加半透明背景 `background: 'var(--wiki-surface)'` + 适当 padding。

---

## 五、无障碍性

### P0-07: 大量交互元素缺少 ARIA 标签

**文件**: 全局

- Sidebar 图标按钮仅有 `title` 属性，缺少 `aria-label`（`Sidebar.tsx` L59-87）
- 所有卡片点击区域无 `role="button"` 或 `tabIndex`（Dashboard L84, Requirements L108）
- 关闭按钮使用 `×` 字符无 `aria-label="关闭"`（Requirements L575, QuickCapture L1152）
- select 控件缺少关联 `<label>`（Requirements L422 虽有 label 但未用 `htmlFor`）

```tsx
// Sidebar.tsx L62 — 仅有 title，无 aria-label
<button ... title={item.label}>
```

**建议**: 
1. 所有图标按钮添加 `aria-label`
2. 可点击卡片添加 `role="button"` + `tabIndex={0}` + `onKeyDown` 处理 Enter/Space
3. 关闭按钮统一用 `aria-label="关闭"`
4. 表单控件用 `<label htmlFor={id}>` 关联

---

### P0-08: Model.tsx 使用了未导入的 CircleIcon —— 运行时错误

**文件**: `Model.tsx` L169

```tsx
// L3 imports — CircleIcon 未导入
import { CpuIcon, PlusIcon, TrashIcon, StarIcon, CheckCircleIcon, KeyIcon, RefreshCwIcon, XIcon, ChevronDownIcon } from 'lucide-react';

// L169 — 使用了 CircleIcon（未导入！）
{ m.hasApiKey ? <CheckCircleIcon ... /> : <CircleIcon size={24} style={{ color: '#ef4444' }} /> }
```

`CircleIcon` 未从 lucide-react 导入，运行时将抛出 `ReferenceError: CircleIcon is not defined`。应使用 `XCircleIcon` 或 `AlertCircleIcon`。

---

### P1-07: 无自定义焦点指示器

**文件**: 全局

项目完全依赖浏览器默认 `:focus-visible` 样式。在 Chrome 中表现为蓝色外框，与极简黑白设计语言不协调。自定义按钮、卡片区域按 Tab 键导航时焦点环不可预测。

**建议**: 在 `index.css` 中添加全局 focus-visible 样式：
```css
:focus-visible {
  outline: 2px solid var(--wiki-accent);
  outline-offset: 2px;
}
```

---

### P1-08: 禁用按钮仅用 opacity 降低视觉权重，无 cursor 提示

**文件**: `Requirements.tsx` L473

```tsx
// L473 — 禁用状态
className="... disabled:opacity-30 ..."
```

仅降低透明度不足以传达 "不可交互"。缺少 `cursor-not-allowed` 和 `aria-disabled`。

**建议**: 添加 `disabled:cursor-not-allowed` 和 `aria-disabled="true"`。

---

### P1-09: 知识库编辑器工具栏用 ClockIcon 表示编号列表

**文件**: `Knowledge.tsx` L470

```tsx
<button ... title="编号列表"><ClockIcon size={14} ... /></button>
```

使用 `ClockIcon`（时钟图标）表示"编号列表"在语义上是错误的。应使用 lucide-react 的 `ListOrderedIcon`。

**建议**: 替换为 `ListOrderedIcon`。

---

### P2-05: 图片预览 lightbox 缺少关闭的视觉提示

**文件**: `Requirements.tsx` L575, `ContentBlockRenderer.tsx` L569

关闭按钮仅为 `×` 字符 + 半透明白色，无背景圆形衬托。长图或亮色图片可能使关闭按钮不可见。

**建议**: 为关闭按钮添加半透明黑色圆形背景 `bg-black/50 rounded-full`。

---

## 六、信息架构

### P1-10: Requirements Detail 与 Create/Edit 在同一组件内路由切换，URL 无变化

**文件**: `Requirements.tsx` L196-294

`localView` 状态在组件内部切换列表/详情/编辑视图，但 URL 不变。用户无法通过浏览器后退按钮导航，也无法直接分享详情页链接。

**建议**: 考虑将详情/编辑视图拆分为独立路由或至少使用 `history.pushState` 更新 URL。

---

### P1-11: Knowledge.tsx 中 Tab 模式详情和侧面板详情代码完全重复

**文件**: `Knowledge.tsx` L378-443 vs L641-712

Tab 模式下文档详情的 JSX（L378-443）与侧面板详情（L641-712）几乎完全相同（header、image descriptions、file preview、AI summary button）。重复代码约 65 行，未来维护极易出现一侧更新另一侧遗漏的 Bug。

**建议**: 抽取 `<DocDetailContent>` 共享组件，在两种模式中复用。

---

### P2-06: 侧边栏仅图标无文字标签，新手学习成本高

**文件**: `Sidebar.tsx` L59-87

导航为纯图标（18px），hover 时弹出 tooltip。新用户首次使用时不知道各图标含义，需要逐个 hover。

**建议**: 在 App 首次启动时默认展开 sidebar 文字标签，或至少在 Dashboard 页添加 onboarding 引导。

---

### P2-07: 消息中心路由存在但组件可能未实现

**文件**: `Index.tsx` L207

```tsx
case 'messages':
  return <Lazy><Messages /></Lazy>;
```

`Messages` 组件被 lazy import 但在导航中有入口。如果组件未完整实现，建议先隐藏入口或标记为 "即将推出"。

---

## 七、附录：代码缺陷（Bug）

### BUG-01: Model.tsx CircleIcon 未导入（同 P0-08）

**文件**: `Model.tsx` L3, L169  
**严重性**: 🔴 Critical — 运行时崩溃  
**修复**: 将 `CircleIcon` 替换为 `XCircleIcon` 或 `AlertCircleIcon`，或添加 import。

---

### BUG-02: Requirements.tsx 图片 lightbox 代码重复 2 处

**文件**: `Requirements.tsx` L573-579 和 L608-614  

两处 lightbox 代码完全相同（detail view 和 create/edit view）。任何修改需要改两处。

**建议**: 抽取 `<ImageLightbox>` 组件复用。

---

## 八、优先级行动清单

### 🔴 P0（必须修复，阻塞发版）

| ID | 问题 | 位置 |
|----|------|------|
| P0-01 | 图表颜色硬编码不支持暗色模式 | Dashboard, Insights |
| P0-02 | Requirements 列表无 loading 状态 | Requirements.tsx L465 |
| P0-03 | Dashboard 数据请求无错误处理 | Dashboard.tsx L56 |
| P0-04 | OfficePreview 完全硬编码浅色背景 | OfficePreview.tsx |
| P0-05 | 编辑器工具栏激活态 bg-indigo-100 不适配暗色 | Knowledge.tsx L462 |
| P0-06 | 原生 select/date input 暗色模式无适配 | Requirements, Model, Knowledge |
| P0-07 | 交互元素缺少 ARIA 标签 | 全局 |
| P0-08 | Model.tsx CircleIcon 未导入（运行时错误）| Model.tsx L169 |

### 🟡 P1（应在下个迭代修复）

| ID | 问题 |
|----|------|
| P1-01 | 圆角不统一 |
| P1-02 | 页面级间距不统一 |
| P1-03 | Model 页面 loading 只有图标无骨架 |
| P1-04 | Browser 无页面加载进度 |
| P1-05 | 图表固定宽度约束响应式 |
| P1-06 | QuickCapture 全屏预览背景硬编码 |
| P1-07 | 无自定义焦点指示器 |
| P1-08 | 禁用按钮缺少 cursor 提示 |
| P1-09 | 编号列表按钮图标错误（ClockIcon）|
| P1-10 | Requirements 内部路由切换 URL 不变 |
| P1-11 | Knowledge 详情代码重复 65 行 |

### 🟢 P2（改进项，可排入 backlog）

| ID | 问题 |
|----|------|
| P2-01 | 内联样式与 Tailwind 混用 |
| P2-02 | Knowledge 魔法字符串 `__loading__` |
| P2-03 | Knowledge 侧边栏固定宽度无可折叠 |
| P2-04 | Chart Tooltip 背景透明可读性 |
| P2-05 | Lightbox 关闭按钮无视觉衬托 |
| P2-06 | 纯图标侧边栏新手学习成本 |
| P2-07 | Messages 路由可能未实现 |

---

*报告结束*
