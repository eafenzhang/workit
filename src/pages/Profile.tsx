import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// ── Toast message constants ──
const TOAST = {
  nicknameShort: '昵称至少 2 个字符',
  nicknameLong: '昵称最多 20 个字符',
  roleRequired: '请选择角色',
  saved: '已保存',
  reset: '已重置',
} as const;

import { SaveIcon, RotateCcwIcon, MegaphoneIcon, LightbulbIcon, Code2Icon, BugIcon, CpuIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, RoleKey } from '../types/profile';
import { ROLE_PRESETS, getRolePreset } from '../data/rolePresets';
import { resetProfile as clearStorage } from '../utils/profileStorage';
import Avatar from '../components/Avatar';

const ROLE_ICONS: Record<string, typeof MegaphoneIcon> = {
  Megaphone: MegaphoneIcon, Lightbulb: LightbulbIcon, Code2: Code2Icon, Bug: BugIcon, Cpu: CpuIcon,
};

export default function Profile() {
  const { userProfile, saveProfile, resetProfile } = useAuth();

  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<RoleKey | ''>('');
  const [personality, setPersonality] = useState('');
  const [memory, setMemory] = useState('');
  const [skills, setSkills] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (userProfile && !initialised) {
      setNickname(userProfile.nickname);
      setRole(userProfile.role as RoleKey);
      setPersonality(userProfile.personality);
      setMemory(userProfile.memory || '');
      setSkills(userProfile.skills || '');
      setInitialised(true); setIsDirty(false);
    }
  }, [userProfile, initialised]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const handleRoleChange = useCallback((newRole: string) => {
    if (newRole === role) return;
    const hasExistingConfig = personality.trim() || memory.trim() || skills.trim();
    if (hasExistingConfig && !window.confirm('切换角色将重置当前人格设定、记忆和技能，是否继续？')) return;
    const preset = getRolePreset(newRole);
    if (preset) { setRole(preset.key); setPersonality(preset.personality); setMemory(preset.memory); setSkills(preset.skills); }
    else setRole(newRole as RoleKey);
    setIsDirty(true);
  }, [role, personality, memory, skills]);

  const handleSave = useCallback(() => {
    const t = nickname.trim();
    if (!t || t.length < 2) { toast.error(TOAST.nicknameShort); return; }
    if (t.length > 20) { toast.error(TOAST.nicknameLong); return; }
    if (!role) { toast.error(TOAST.roleRequired); return; }
    const preset = getRolePreset(role);
    const now = new Date().toISOString();
    saveProfile({ nickname: t, role, personality: personality.trim(), memory: memory.trim(), skills: skills.trim(), avatarColor: preset?.avatarColor ?? userProfile?.avatarColor ?? '#6366f1', createdAt: userProfile?.createdAt ?? now, updatedAt: now });
    setIsDirty(false); toast.success(TOAST.saved);
  }, [nickname, role, personality, memory, skills, userProfile, saveProfile]);

  const handleReset = useCallback(() => {
    if (!window.confirm('重置后将清除所有用户信息，是否继续？')) return;
    clearStorage(); resetProfile();
    setNickname(''); setRole(''); setPersonality(''); setMemory(''); setSkills('');
    setIsDirty(false); setInitialised(false); toast.success(TOAST.reset);
  }, [resetProfile]);

  const preset = role ? getRolePreset(role) : null;
  const RoleIcon = preset ? ROLE_ICONS[preset.icon] : null;
  const C = {
    input: { background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)' },
    card: { background: 'var(--wiki-surface2)' },
    chip: { background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text2)' },
  };

  return (
    <div className="flex justify-center p-8 min-h-full">
      <div className="w-full max-w-lg">
        <h1 className="text-xl font-semibold text-wiki-text mb-6">用户Agent</h1>

        {/* Nickname + Role selector */}
        <div className="p-5 rounded-xl mb-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <div className="mb-4">
            <label className="block text-xs font-medium text-wiki-text3 mb-1.5">昵称</label>
            <input type="text" value={nickname} onChange={e => { setNickname(e.target.value); markDirty(); }} maxLength={20} placeholder="输入昵称（2-20字符）" className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-wiki-text3 focus:outline-none" style={C.input} />
          </div>
          <div>
            <label className="block text-xs font-medium text-wiki-text3 mb-2">角色</label>
            <div className="grid grid-cols-5 gap-2">
              {ROLE_PRESETS.map(p => {
                const Icon = ROLE_ICONS[p.icon] || MegaphoneIcon;
                const sel = role === p.key;
                return (
                  <button key={p.key} onClick={() => handleRoleChange(p.key)} className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-colors" style={{
                    background: sel ? 'var(--wiki-text)' : 'var(--wiki-surface2)',
                    border: '1px solid', borderColor: 'var(--wiki-border)',
                  }}>
                    <Icon size={18} style={{ color: sel ? 'var(--wiki-bg)' : 'var(--wiki-text2)' }} />
                    <span className="text-[11px] font-medium" style={{ color: sel ? 'var(--wiki-bg)' : 'var(--wiki-text2)' }}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Personality */}
        <div className="p-5 rounded-xl mb-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <label className="block text-xs font-medium text-wiki-text3 mb-2">人格设定</label>
          <textarea value={personality} onChange={e => { setPersonality(e.target.value); markDirty(); }} rows={2} placeholder="描述 Agent 的人格特征" className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-wiki-text3 focus:outline-none resize-none" style={C.input} />
        </div>

        {/* Memory */}
        <div className="p-5 rounded-xl mb-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <label className="block text-xs font-medium text-wiki-text3 mb-2">记忆</label>
          <textarea value={memory} onChange={e => { setMemory(e.target.value); markDirty(); }} rows={2} placeholder="Agent 的上下文记忆，如偏好、习惯、知识" className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-wiki-text3 focus:outline-none resize-vertical" style={C.input} />
        </div>

        {/* Skills */}
        <div className="p-5 rounded-xl mb-6" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <label className="block text-xs font-medium text-wiki-text3 mb-2">技能</label>
          <textarea value={skills} onChange={e => { setSkills(e.target.value); markDirty(); }} rows={3} placeholder="每行一个技能" className="w-full px-3 py-2 rounded-lg text-sm placeholder:text-wiki-text3 focus:outline-none resize-vertical mb-3" style={C.input} />
          {skills.trim() && (
            <div className="flex flex-wrap gap-1.5">
              {skills.split('\n').filter(Boolean).map((s, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-lg" style={C.chip}>{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
            <SaveIcon size={14} />保存
          </button>
          <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-wiki-surface2" style={{ background: 'var(--wiki-surface)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}>
            <RotateCcwIcon size={14} />重置
          </button>
        </div>
      </div>
    </div>
  );
}
