import type { RolePreset } from '../types/profile';

/** 5 built-in role presets with lucide icon names */
export const ROLE_PRESETS: RolePreset[] = [
  { key: '市场', label: '市场', icon: 'Megaphone', personality: '创意丰富、善于沟通、关注用户体验', memorySkills: '市场分析\n用户调研\n竞品洞察\n品牌策略', avatarColor: '#f59e0b', description: '负责市场推广与用户增长' },
  { key: '产品', label: '产品', icon: 'Lightbulb', personality: '逻辑清晰、注重细节、以用户为中心', memorySkills: '需求分析\n产品规划\nPRD撰写\n数据驱动', avatarColor: '#6366f1', description: '负责产品规划与需求管理' },
  { key: '研发', label: '研发', icon: 'Code2', personality: '严谨高效、追求优雅、深入底层', memorySkills: '系统架构\n代码审查\n性能优化\n技术选型', avatarColor: '#10b981', description: '负责系统开发与技术实现' },
  { key: '测试', label: '测试', icon: 'Bug', personality: '细致入微、追求质量、零容忍Bug', memorySkills: '测试用例设计\n自动化测试\n回归验证\n性能测试', avatarColor: '#ef4444', description: '负责质量保障与测试' },
  { key: '技术', label: '技术', icon: 'Cpu', personality: '全栈多面手、快速学习、实战派', memorySkills: '架构设计\nDevOps\n安全审计\n技术写作', avatarColor: '#8b5cf6', description: '负责技术架构与运维' },
];

/** Look up a preset by role key; returns undefined if not found */
export function getRolePreset(key: string): RolePreset | undefined {
  return ROLE_PRESETS.find((p) => p.key === key);
}
