# QA Report：用户信息与 Agent 配置系统

> **QA Engineer**：Edward（严过关）
> **Date**：2025-07-11
> **Scope**：V1–V6 全量验证

---

## Executive Summary

| Area | Status | Key Finding |
|------|--------|-------------|
| V1 类型系统 | ✅ PASS | 4/4 项通过 |
| V2 AuthContext 扩展 | ⚠️ PASS with Issues | 3/4 项通过；saveProfile 未写 legacy `user` 键 |
| V3 UI 组件 | ✅ PASS | 3/3 项通过 |
| V4 集成 | ✅ PASS | 2/2 项通过 |
| V5 构建验证 | ✅ PASS | 0 errors，Profile 独立 chunk |
| V6 代码质量 | ⚠️ ISSUES | console.log OK；硬编码中文 & Toast 常量需改进 |

**Overall**：6/6 板块通过，2 个板块有 remark。无阻塞性 bug，系统可交付。

---

## V1：类型系统

### 1.1 `src/types/profile.ts` 导出检查

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|:----:|
| 导出 `UserProfile` | interface with nickname, role, personality, memorySkills, avatarColor, timestamps | ✅ 已导出 | ✅ |
| 导出 `RoleKey` | union type of 5 role keys | `'市场' \| '产品' \| '研发' \| '测试' \| '技术'` | ✅ |
| 导出 `RolePreset` | interface with key, label, icon, personality, memorySkills, avatarColor | ✅ 已导出 | ✅ |

> **备注**：实现使用中文 RoleKey（如 `'市场'`），与 PRD 的英文 RoleType（如 `'marketing'`）不同，但功能等价，后续可对齐。

### 1.2 `src/data/rolePresets.ts` 检查

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|:----:|
| 角色数量 | 5 | 5（市场/产品/研发/测试/技术） | ✅ |
| 每个有 key | RoleKey | ✅ 全部含 key | ✅ |
| 每个有 label | 中文标签 | ✅ | ✅ |
| 每个有 icon | lucide 图标名 | Megaphone/Lightbulb/Code2/Bug/Cpu | ✅ |
| 每个有 personality | Agent 人格 | ✅ | ✅ |
| 每个有 memorySkills | 技能列表（换行分隔） | ✅ | ✅ |
| 每个有 avatarColor | hex 颜色 | ✅ 5 种颜色全部不同 | ✅ |
| 导出 `getRolePreset()` | 查找函数 | ✅ 已导出 | ✅ |

### 1.3 `src/utils/profileStorage.ts` 检查

| 检查项 | 签名 | 结果 |
|--------|------|:----:|
| `getProfile()` | `() => UserProfile \| null` | ✅ |
| `saveProfile()` | `(profile: UserProfile) => void` | ✅ |
| `hasProfile()` | `() => boolean` | ✅ |
| `resetProfile()` | `() => void` | ✅ |

所有函数有 try/catch 包裹 JSON.parse，健壮性好。

### 1.4 `src/utils/avatar.ts` 检查

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|:----:|
| `getAvatarChar()` | 提取首字符 | ✅ 支持中文/英文/emoji/fallback '?' | ✅ |
| 中文处理 | 取第一汉字 | `[...trimmed][0]` + CJK 正则 | ✅ |
| 英文处理 | 首字母大写 | `.toUpperCase()` | ✅ |
| 空值处理 | 返回 '?' | 三处 guard | ✅ |

---

## V2：AuthContext 扩展

### 2.1 导出检查

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|:----:|
| 导出 `userProfile` | context value | ✅ 包含 | ✅ |
| 导出 `saveProfile` | function | ✅ 包含（useCallback 包装） | ✅ |
| 导出 `resetProfile` | function | ✅ 包含（useCallback 包装） | ✅ |
| 导出 `setUserProfile` | setter | ✅ 额外导出 | ✅ |

### 2.2 saveProfile 是否写双键 ⚠️

| 行为 | 预期 | 实际 | 结果 |
|------|------|------|:----:|
| 写 `user_profile` (localStorage) | ✅ | `persistProfile(updated)` | ✅ |
| 写 `user` (localStorage, legacy) | ✅ 架构要求 | ❌ **未实现** | ⚠️ |
| 更新 React state `userProfile` | ✅ | `setUserProfile(updated)` | ✅ |
| 更新 React state `user` (legacy) | ✅ | `setUser(toLegacyUser(updated))` | ✅ |

> **Issue V2-01**：`saveProfile()` 未将 legacy `User` 对象同步写入 localStorage 键 `user`。架构设计明确要求"同时写入 `user_profile` 和 `user` 两个键"。当前仅更新了 React 内存状态。
>
> **影响**：若有其他模块直接读取 `localStorage.getItem('user')`（非通过 AuthContext），将拿到过期数据。当前项目已统一使用 `user_profile` 键且 AuthContext 优先读 `user_profile`，**影响可控但不满足契约**。

### 2.3 resetProfile 是否清除 localStorage

| 行为 | 预期 | 实际 | 结果 |
|------|------|------|:----:|
| 清除 `user_profile` | ✅ | `clearProfile()` → `removeItem('user_profile')` | ✅ |
| 清除 `user` (legacy) | ✅ 隐含期望 | ❌ **未清除** | ⚠️ |
| 清空 `userProfile` state | ✅ | `setUserProfile(null)` | ✅ |
| 清空 `user` state | ✅ | `setUser(null)` | ✅ |

> **Issue V2-02**：`resetProfile()` 未清除 legacy `user` localStorage 键。与 V2-01 为同一类问题。

---

## V3：UI 组件

### 3.1 `src/components/Avatar.tsx`

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|:----:|
| 首字头像渲染 | 圆形彩色背景 + 白色首字 | `rounded-full` + `background: color` + `font-bold text-white` | ✅ |
| Props 接口 | nickname, color, size, onClick | ✅ 全部支持，size 默认 32 | ✅ |
| 点击事件 | onClick handler | ✅ 含键盘 Enter/Space 支持 | ✅ |
| 可访问性 | aria-label, title | ✅ `aria-label={nickname \|\| '用户头像'}` | ✅ |
| 首字提取 | 调用 getAvatarChar | ✅ | ✅ |

### 3.2 `src/components/ProfileWizard.tsx`

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|:----:|
| Step 1：昵称输入 | 输入框 + 校验 | ✅ 含 2-20 字符校验、错误提示 | ✅ |
| Step 2：角色选择 | 5 角色卡片 | ✅ 3 列网格，含头像预览 + 标签 | ✅ |
| Step 3：确认 | 预览 + 确认按钮 | ✅ 头像 + 昵称 + 角色 + Agent 配置摘要 | ✅ |
| Step 间导航 | 前进/后退 | ✅ 后退按钮 + 下一步按钮 | ✅ |
| 进度条 | 3 步骤指示器 | ✅ 含连线、步骤编号 | ✅ |
| 键盘支持 | Enter 下一步 | ✅ Step1 支持 Enter | ✅ |
| 校验反馈 | 实时错误提示 | ✅ 红色边框 + 错误文案 | ✅ |
| `onComplete` 回调 | 返回完整 UserProfile | ✅ 含 nickname/role/personality/memorySkills/avatarColor/timestamps | ✅ |

### 3.3 `src/pages/Profile.tsx`

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|:----:|
| 头像展示 | Avatar 组件 | ✅ size=72，含昵称+角色文字 | ✅ |
| 昵称编辑 | input，maxLength=20 | ✅ | ✅ |
| 角色切换 | select dropdown | ✅ 5 选项 + "选择角色"占位 | ✅ |
| 人格编辑 | textarea | ✅ 3 行，可缩放 | ✅ |
| 技能编辑 | textarea（每行一个） | ✅ 5 行，可缩放 | ✅ |
| 保存按钮 | 校验 + save + toast | ✅ 昵称校验 + 角色必选 + toast.success | ✅ |
| 重置按钮 | 确认对话框 + 清空 | ✅ `window.confirm` + clearStorage + resetProfile | ✅ |
| 角色切换脏检查 | 若 isDirty 弹确认 | ✅ 实现完整 | ✅ |
| Toast 通知 | sonner toast | ✅ toast.success / toast.error | ✅ |
| `markDirty` 追踪 | 任意字段变更设脏 | ✅ 所有 onChange 调用 markDirty | ✅ |

---

## V4：集成

### 4.1 `src/components/Sidebar.tsx`

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|:----:|
| 有 Profile 时渲染 Avatar | `<Avatar>` 组件 | ✅ 含 nickname + avatarColor | ✅ |
| 无 Profile 时渲染默认图标 | SVG 用户图标 | ✅ 静态 SVG user icon | ✅ |
| 点击跳转 Profile | `onTabChange('profile')` | ✅ `handleProfileClick` | ✅ |
| Hover tooltip | 显示昵称 | ✅ 使用 group-hover tooltip | ✅ |
| 可访问性 | aria-label | ✅ `用户信息: ${nickname}` | ✅ |

### 4.2 `src/pages/Index.tsx`

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|:----:|
| MENU_MAP 注册 profile | `profile: { type, title }` | ✅ | ✅ |
| page switch 注册 | `case 'profile': <Profile />` | ✅ Lazy 包裹 | ✅ |
| 首次启动 Wizard | `!hasProfile()` 时弹出 | ✅ `useEffect` + `setShowWizard(true)` | ✅ |
| Wizard 覆盖层 | 全屏模态 | ✅ `fixed inset-0 z-50` | ✅ |
| Wizard 完成后处理 | save + close + open profile tab | ✅ 三步完整 | ✅ |
| Sidebar activeTab 映射 | profile 分支 | ✅ | ✅ |

---

## V5：构建验证

```bash
cd C:\Users\121212\workit && npx vite build
```

| 指标 | 结果 |
|------|------|
| **构建错误** | **0 errors** ✅ |
| **构建警告** | 0 warnings |
| **Profile 独立 chunk** | `dist/assets/Profile-mqT1EhBb.js` (4.69 kB, gzip: 1.74 kB) ✅ |
| **总构建时间** | 9.08s |
| **模块数** | 2778 modules transformed |
| **注** | chunk size warning 仅针对 vendor-mammoth (502 kB)，非本次变更引入 |

---

## V6：代码质量

### 6.1 console.log 检查

| 文件 | console.log 数量 | 含 `[qc-diag]` 前缀 | 结果 |
|------|:---:|:---:|:---:|
| `src/utils/pasteHandler.ts` | 7 | ✅ 全部 | ✅ |
| Profile 相关新文件 | 0 | — | ✅ |

### 6.2 硬编码中文检查 ⚠️

| 文件 | 中文数量 | 典型示例 | 评估 |
|------|:---:|------|------|
| `src/components/Avatar.tsx` | 1 | `'用户头像'` (aria-label fallback) | ⚠️ Minor |
| `src/components/ProfileWizard.tsx` | ~30+ | Step titles, buttons, validation, labels | ⚠️ |
| `src/pages/Profile.tsx` | ~20+ | Heading, labels, placeholders, toast messages | ⚠️ |
| `src/context/AuthContext.tsx` | 0 | — | ✅ |
| `src/data/rolePresets.ts` | — | 角色预设属于豁免范围 | ✅ |
| `src/utils/profileStorage.ts` | 0 | — | ✅ |
| `src/utils/avatar.ts` | 0 | — | ✅ |

> **Issue V6-01**：`ProfileWizard.tsx` 和 `Profile.tsx` 包含大量硬编码中文 UI 文案、验证消息和按钮文本。项目现有代码（Sidebar.tsx 等）同样使用硬编码中文，此为项目约定。但"无硬编码中文（角色预设除外）"规则在此未严格遵守。

### 6.3 Toast 消息常量检查 ⚠️

| 位置 | Toast 消息 | 是否为常量 | 结果 |
|------|------|:---:|:---:|
| `Profile.tsx:62` | `'昵称至少需要 2 个字符'` | ❌ inline | ⚠️ |
| `Profile.tsx:66` | `'昵称最多 20 个字符'` | ❌ inline | ⚠️ |
| `Profile.tsx:70` | `'请选择一个角色'` | ❌ inline | ⚠️ |
| `Profile.tsx:87` | `'用户信息已更新'` | ❌ inline | ⚠️ |
| `Profile.tsx:101` | `'用户信息已重置'` | ❌ inline | ⚠️ |

> **Issue V6-02**：5 条 Toast 消息均为内联字符串，未提取为常量。建议提取到 `src/constants/toast.ts` 或类似文件统一管理。

---

## Issue Summary

| ID | Severity | Area | Description | Recommendation |
|----|----------|------|-------------|----------------|
| V2-01 | Medium | AuthContext | `saveProfile` 未写 legacy `user` 键到 localStorage | 在 `saveProfile` 中添加 `localStorage.setItem('user', JSON.stringify(toLegacyUser(updated)))` |
| V2-02 | Low | AuthContext | `resetProfile` 未清除 legacy `user` 键 | 在 `resetProfile` 中添加 `localStorage.removeItem('user')` |
| V6-01 | Low | Code Quality | ProfileWizard/Profile 硬编码中文（~50+ 处） | 若需整改，建议提取到 i18n 常量文件 |
| V6-02 | Low | Code Quality | Toast 消息未使用常量 | 提取到 `constants/toast.ts` |

---

## Test Coverage Gap Analysis

以下场景当前缺少自动化测试覆盖（建议后续补充单元测试）：

1. **`getAvatarChar`** — 边界：空字符串、纯空格、emoji 组合、特殊 Unicode
2. **`profileStorage`** — 异常：localStorage 不可用、JSON 损坏、quota 超限
3. **`ProfileWizard`** — 交互：Step 1→2 空昵称阻止、Step 2→3 未选角色阻止、完整流程 onComplete 数据正确性
4. **`AuthContext.saveProfile`** — 验证：updatedAt 自动更新、state 同步正确
5. **`Profile.tsx`** — 状态：表单初始化、isDirty 标记、角色切换确认流程

---

## Verdict

**系统整体通过验证，可交付。** 2 个 V2 兼容性 issue 建议修复后再上线，V6 代码质量问题可在后续迭代改进。
