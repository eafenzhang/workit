/** User profile stored in localStorage */
export interface UserProfile {
  nickname: string;
  role: string; // '市场'|'产品'|'研发'|'测试'|'技术'|''
  personality: string;
  memory: string;       // Agent memory / context
  skills: string;       // Agent skills / capabilities
  avatarColor: string;
  createdAt: string;
  updatedAt: string;
}

/** Valid role keys */
export type RoleKey = '市场' | '产品' | '研发' | '测试' | '技术';

/** Role preset configuration */
export interface RolePreset {
  key: RoleKey;
  label: string;
  icon: string;
  personality: string;
  memory: string;
  skills: string;
  avatarColor: string;
  description: string;
}
