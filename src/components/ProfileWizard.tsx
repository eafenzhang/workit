import { useState, useCallback } from 'react';
import { ArrowRightIcon, ArrowLeftIcon, CheckIcon, MegaphoneIcon, LightbulbIcon, Code2Icon, BugIcon, CpuIcon } from 'lucide-react';
import type { UserProfile, RoleKey } from '../types/profile';
import { ROLE_PRESETS, getRolePreset } from '../data/rolePresets';

interface ProfileWizardProps { onComplete: (profile: UserProfile) => void; }

const STEPS = ['昵称', '角色', '确认'] as const;
const ROLE_ICONS: Record<string, typeof MegaphoneIcon> = {
  Megaphone: MegaphoneIcon, Lightbulb: LightbulbIcon, Code2: Code2Icon, Bug: BugIcon, Cpu: CpuIcon,
};

export default function ProfileWizard({ onComplete }: ProfileWizardProps) {
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [error, setError] = useState('');

  const validate = useCallback((val: string): string => {
    const t = val.trim(); if (!t) return '昵称不能为空';
    if (t.length < 2) return '至少 2 个字符'; if (t.length > 20) return '最多 20 个字符';
    return '';
  }, []);

  const C = {
    card: { background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' },
    input: { background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)' },
    primary: { background: 'var(--wiki-text)', color: 'var(--wiki-bg)' },
    secondary: { background: 'var(--wiki-surface)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' },
    chip: { background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text2)' },
  };

  const stepsBar = (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold" style={{
            background: i <= step ? 'var(--wiki-text)' : 'var(--wiki-border)',
            color: i <= step ? 'var(--wiki-bg)' : 'var(--wiki-text3)',
          }}>{i + 1}</div>
          <span className="text-xs" style={{ color: i === step ? 'var(--wiki-text)' : 'var(--wiki-text3)' }}>{label}</span>
          {i < 2 && <div className="w-8 h-px" style={{ background: i < step ? 'var(--wiki-text)' : 'var(--wiki-border)' }} />}
        </div>
      ))}
    </div>
  );

  if (step === 0) return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm">
        {stepsBar}
        <div className="p-6 rounded-xl" style={C.card}>
          <h2 className="text-lg font-semibold text-wiki-text mb-1">设置昵称</h2>
          <p className="text-sm text-wiki-text3 mb-5">为你取一个名字吧</p>
          <input type="text" value={nickname} onChange={e => { setNickname(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && !validate(nickname) && setStep(1)} placeholder="输入昵称" maxLength={20} autoFocus className="w-full px-3 py-2.5 rounded-lg text-sm placeholder:text-wiki-text3 focus:outline-none mb-3" style={{ ...C.input, borderColor: error ? 'var(--wiki-danger)' : 'var(--wiki-border)' }} />
          {error && <p className="text-xs mb-3" style={{ color: 'var(--wiki-danger)' }}>{error}</p>}
          <button onClick={() => { const e = validate(nickname); e ? setError(e) : setStep(1); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90" style={C.primary}>下一步<ArrowRightIcon size={14} /></button>
        </div>
      </div>
    </div>
  );

  if (step === 1) return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-lg">
        {stepsBar}
        <div className="p-6 rounded-xl" style={C.card}>
          <h2 className="text-lg font-semibold text-wiki-text mb-1">选择角色</h2>
          <p className="text-sm text-wiki-text3 mb-5">选择最匹配你工作的角色</p>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {ROLE_PRESETS.map(p => {
              const Icon = ROLE_ICONS[p.icon] || MegaphoneIcon;
              const sel = selectedRole === p.key;
              return (
                <button key={p.key} onClick={() => setSelectedRole(p.key)} className="flex flex-col items-center gap-1.5 p-3 rounded-lg transition-colors text-center" style={{
                  background: sel ? 'var(--wiki-text)' : 'var(--wiki-surface2)',
                  border: '1px solid var(--wiki-border)',
                }}>
                  <Icon size={20} style={{ color: sel ? 'var(--wiki-bg)' : 'var(--wiki-text2)' }} />
                  <span className="text-xs" style={{ color: sel ? 'var(--wiki-bg)' : 'var(--wiki-text2)', fontWeight: sel ? 600 : 400 }}>{p.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm transition-colors hover:bg-wiki-surface2" style={C.secondary}><ArrowLeftIcon size={14} />返回</button>
            <button onClick={() => selectedRole && setStep(2)} disabled={!selectedRole} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-opacity" style={{ ...C.primary, opacity: selectedRole ? 1 : 0.4 }}>下一步<ArrowRightIcon size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );

  const preset = selectedRole ? getRolePreset(selectedRole) : null;
  const RoleIcon = preset ? ROLE_ICONS[preset.icon] : null;
  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm">
        {stepsBar}
        <div className="p-6 rounded-xl" style={C.card}>
          <h2 className="text-lg font-semibold text-wiki-text mb-5">确认 Agent 身份</h2>

          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>{nickname.trim().charAt(0)}</div>
            <div>
              <div className="text-base font-medium text-wiki-text">{nickname.trim()}</div>
              <div className="flex items-center gap-1.5 text-sm text-wiki-text3">{RoleIcon && <RoleIcon size={13} />}{preset?.label}</div>
            </div>
          </div>

          <div className="rounded-lg p-4 mb-3" style={{ background: 'var(--wiki-surface2)' }}>
            <div className="text-xs font-medium text-wiki-text mb-1.5">人格设定</div>
            <p className="text-sm text-wiki-text2 leading-relaxed">{preset?.personality}</p>
          </div>

          <div className="rounded-lg p-4 mb-6" style={{ background: 'var(--wiki-surface2)' }}>
            <div className="text-xs font-medium text-wiki-text mb-2">记忆技能</div>
            <div className="flex flex-wrap gap-1.5">
              {(preset?.memorySkills ?? '').split('\n').filter(Boolean).map((skill, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-lg" style={C.chip}>{skill}</span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm transition-colors hover:bg-wiki-surface2" style={C.secondary}><ArrowLeftIcon size={14} />返回</button>
            <button onClick={() => { if (!selectedRole) return; const p = getRolePreset(selectedRole); if (!p) return; const now = new Date().toISOString(); onComplete({ nickname: nickname.trim(), role: p.key, personality: p.personality, memorySkills: p.memorySkills, avatarColor: p.avatarColor, createdAt: now, updatedAt: now }); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90" style={C.primary}><CheckIcon size={14} />确认进入</button>
          </div>
        </div>
      </div>
    </div>
  );
}
