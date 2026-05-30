/** Quick action card configuration */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: 'navigate' | 'fill';
  target?: string;  // tab type for navigate action
  prompt?: string;  // fill text for fill action
  color: string;
  bg: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'quick-capture',
    label: '快速采集',
    icon: 'SparklesIcon',
    action: 'navigate',
    target: 'requirements',
    color: '#6366f1',
    bg: '#6366f112',
  },
  {
    id: 'knowledge-base',
    label: '知识库',
    icon: 'DatabaseIcon',
    action: 'navigate',
    target: 'knowledge',
    color: '#10b981',
    bg: '#10b98112',
  },
  {
    id: 'insights',
    label: '洞察分析',
    icon: 'LightbulbIcon',
    action: 'navigate',
    target: 'insights',
    color: '#f59e0b',
    bg: '#f59e0b12',
  },
  {
    id: 'model-config',
    label: '模型配置',
    icon: 'CpuIcon',
    action: 'navigate',
    target: 'model',
    color: '#8b5cf6',
    bg: '#8b5cf612',
  },
];

export const SUGGESTED_PROMPTS: string[] = [
  '帮我分析最近的需求趋势',
  '整理本周新增的知识文档',
  '生成本月的洞察分析报告',
  '查看当前项目的进度概览',
];

export const WELCOME_MESSAGES: string[] = [
  '有什么我可以帮你的？',
  '今天想做什么？',
  '开始新的一天，从需求开始',
  '知识沉淀，从这里开始',
];

/** Return a time-based greeting string, optionally with a name */
export function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  let prefix = '上午好';
  if (hour < 6) prefix = '夜深了';
  else if (hour < 12) prefix = '上午好';
  else if (hour < 14) prefix = '中午好';
  else if (hour < 18) prefix = '下午好';
  else prefix = '晚上好';
  return name ? `${prefix}，${name}` : `${prefix}`;
}

/** Format today's date as Chinese locale date string */
export function getTodayDate(): string {
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const w = weekdays[now.getDay()];
  return `${y}年${m}月${d}日 星期${w}`;
}

/** Generate a unique ID for chat messages */
export function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
