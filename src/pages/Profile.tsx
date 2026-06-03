import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { SaveIcon, RotateCcwIcon, MegaphoneIcon, LightbulbIcon, Code2Icon, BugIcon, CpuIcon, SparklesIcon, Wand2Icon, ImportIcon, XIcon, Trash2Icon, BrainIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, RoleKey } from '../types/profile';
import { ROLE_PRESETS, getRolePreset } from '../data/rolePresets';
import { resetProfile as clearStorage } from '../utils/profileStorage';
import { apiFetch, API } from '../api';
import Avatar from '../components/Avatar';

const TOAST = {
  nicknameShort: '昵称至少 2 个字符',
  nicknameLong: '昵称最多 20 个字符',
  roleRequired: '请选择角色',
  saved: '已保存',
  reset: '已重置',
  memoryGenerated: '已从对话记录生成记忆',
  personalityGenerated: '已基于角色生成人格',
  skillsImported: '已导入技能',
  memoryCleared: '已清空长期记忆',
} as const;

const ROLE_ICONS: Record<string, typeof MegaphoneIcon> = {
  Megaphone: MegaphoneIcon, Lightbulb: LightbulbIcon, Code2: Code2Icon, Bug: BugIcon, Cpu: CpuIcon,
};

interface EcosystemSkill { id: string; name: string; description: string; enabled: boolean; }

export default function Profile() {
  const { userProfile, saveProfile, resetProfile } = useAuth();

  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<RoleKey | ''>('');
  const [personality, setPersonality] = useState('');
  const [memory, setMemory] = useState('');
  const [skills, setSkills] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [initialised, setInitialised] = useState(false);
  // Skills import modal
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [ecoSkills, setEcoSkills] = useState<EcosystemSkill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());

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
    if (hasExistingConfig && !window.confirm('切换角色将重置当前人格、记忆和技能，是否继续？')) return;
    const preset = getRolePreset(newRole);
    if (preset) { setRole(preset.key); setPersonality(preset.personality); setMemory(preset.memory); setSkills(preset.skills); }
    else setRole(newRole as RoleKey);
    setIsDirty(true);
  }, [role, personality, memory, skills]);

  // ── Auto-generate personality from role ──
  const regeneratePersonality = () => {
    const preset = role ? getRolePreset(role) : null;
    if (!preset) { toast.error('请先选择角色'); return; }
    setPersonality(preset.personality);
    markDirty();
    toast.success(TOAST.personalityGenerated);
  };

  // ── Auto-generate memory from conversation history ──
  const generateMemory = () => {
    try {
      const raw = localStorage.getItem('home_conversations');
      if (!raw) { toast.error('暂无对话记录'); return; }
      const convs: Array<{ messages: Array<{ role: string; content: string }> }> = JSON.parse(raw);
      // Extract key themes from user messages
      const userMsgs = convs.flatMap(c => c.messages.filter(m => m.role === 'user').map(m => m.content));
      if (userMsgs.length === 0) { toast.error('暂无对话记录'); return; }
      // Simple extraction: collect significant topics
      const topics = new Set<string>();
      const keywords = ['偏好', '习惯', '任务', '项目', '分析', '报告', '审查', '评估', '开发', '部署', '测试', '文档'];
      for (const msg of userMsgs.slice(-30)) {
        for (const kw of keywords) {
          if (msg.includes(kw)) topics.add(`关注${kw}相关事项`);
        }
      }
      let summary = '';
      if (topics.size > 0) {
        summary = '根据对话记录：\n' + [...topics].slice(0, 10).join('\n');
      } else {
        const recent = userMsgs.slice(-5).map(m => m.length > 50 ? m.slice(0, 50) + '...' : m);
        summary = '最近对话摘要：\n' + recent.join('\n');
      }
      setMemory(summary);
      markDirty();
      toast.success(TOAST.memoryGenerated);
    } catch { toast.error('无法读取对话记录'); }
  };

  // ── Skills import from App Ecosystem ──
  const openSkillsModal = async () => {
    try {
      const r = await apiFetch(API.skills);
      const list: EcosystemSkill[] = (await r.json()) || [];
      setEcoSkills(list.filter(s => s.enabled));
      setSelectedSkillIds(new Set());
      setShowSkillsModal(true);
    } catch { toast.error('无法加载技能列表'); }
  };

  const toggleSkillSelect = (id: string) => {
    setSelectedSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const importSkills = () => {
    if (selectedSkillIds.size === 0) { toast.error('请选择技能'); return; }
    const imported = ecoSkills.filter(s => selectedSkillIds.has(s.id)).map(s => s.name + '：' + s.description);
    const existing = skills.trim() ? skills.split('\n').filter(Boolean) : [];
    const merged = [...existing, ...imported].filter((v, i, a) => a.indexOf(v) === i);
    setSkills(merged.join('\n'));
    setShowSkillsModal(false);
    markDirty();
    toast.success(TOAST.skillsImported);
  };

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

  const [activeTab, setActiveTab] = useState<'personality' | 'memory' | 'skills'>('personality');

  // ── Persistent memory management ──
  interface MemoryEntry { id: number; key: string; value: string; source: string; createdAt: string; updatedAt: string; }
  const [persistentMemories, setPersistentMemories] = useState<MemoryEntry[]>([]);
  const [memoriesLoaded, setMemoriesLoaded] = useState(false);

  const loadPersistentMemories = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!api?.memoryGetAll) return;
    try {
      const list = await api.memoryGetAll();
      setPersistentMemories(Array.isArray(list) ? list : []);
      setMemoriesLoaded(true);
    } catch { setMemoriesLoaded(true); }
  }, []);

  const handleDeleteMemory = useCallback(async (key: string) => {
    const api = (window as any).electronAPI;
    if (!api?.memoryDelete) return;
    await api.memoryDelete(key);
    setPersistentMemories(prev => prev.filter(m => m.key !== key));
    toast.success('已删除');
  }, []);

  const handleClearMemories = useCallback(async () => {
    if (!confirm('确定清空全部长期记忆？')) return;
    const api = (window as any).electronAPI;
    if (!api?.memoryClear) return;
    await api.memoryClear();
    setPersistentMemories([]);
    toast.success(TOAST.memoryCleared);
  }, []);

  // Load persistent memories when memory tab is active
  useEffect(() => {
    if (activeTab === 'memory' && !memoriesLoaded) {
      loadPersistentMemories();
    }
  }, [activeTab, memoriesLoaded, loadPersistentMemories]);

  const TABS = [
    { id: 'personality' as const, label: '人格', icon: SparklesIcon, hint: '基于角色生成' },
    { id: 'memory' as const, label: '记忆', icon: Wand2Icon, hint: '从对话生成' },
    { id: 'skills' as const, label: '技能', icon: ImportIcon, hint: '从生态导入' },
  ];

  const C = {
    input: { background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)' },
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

        {/* Tabbed: 人格 / 记忆 / 技能 */}
        <div className="rounded-xl mb-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <div className="flex" style={{ borderBottom: '1px solid var(--wiki-border)' }}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    color: active ? 'var(--wiki-text)' : 'var(--wiki-text3)',
                    borderBottom: active ? '2px solid var(--wiki-text)' : '2px solid transparent',
                  }}>
                  <Icon size={13} />{t.label}
                </button>
              );
            })}
          </div>
          <div className="p-5">
            {activeTab === 'personality' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-wiki-text">人格特征</h3>
                    <p className="text-xs text-wiki-text3 mt-0.5">描述 Agent 的说话风格、思维方式和行为模式</p>
                  </div>
                  <button onClick={regeneratePersonality}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}>
                    <SparklesIcon size={13} />基于角色生成
                  </button>
                </div>
                <textarea value={personality} onChange={e => { setPersonality(e.target.value); markDirty(); }} rows={4}
                  placeholder="例如：你是一位资深软件架构师，善于用简洁的方式解释复杂问题..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm placeholder:text-wiki-text3 focus:outline-none resize-vertical leading-relaxed" style={C.input} />
              </div>
            )}
            {activeTab === 'memory' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-wiki-text">上下文记忆</h3>
                    <p className="text-xs text-wiki-text3 mt-0.5">记录用户偏好、工作习惯和项目背景</p>
                  </div>
                  <button onClick={generateMemory}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}>
                    <Wand2Icon size={13} />从对话生成
                  </button>
                </div>
                <textarea value={memory} onChange={e => { setMemory(e.target.value); markDirty(); }} rows={6}
                  placeholder="例如：用户偏好简洁回复、使用中文、项目使用 React + TypeScript 技术栈..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm placeholder:text-wiki-text3 focus:outline-none resize-vertical leading-relaxed" style={C.input} />

                {/* ── Persistent Long-Term Memories ── */}
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--wiki-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BrainIcon size={15} style={{ color: 'var(--wiki-accent)' }} />
                      <span className="text-sm font-semibold text-wiki-text">长期记忆</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text3)' }}>自动提取</span>
                    </div>
                    {persistentMemories.length > 0 && (
                      <button onClick={handleClearMemories}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                        style={{ color: 'var(--wiki-danger)' }}>
                        <Trash2Icon size={12} />清空全部
                      </button>
                    )}
                  </div>
                  {persistentMemories.length === 0 ? (
                    <div className="text-sm py-6 text-center rounded-lg" style={{ color: 'var(--wiki-text3)', background: 'var(--wiki-surface2)' }}>
                      {memoriesLoaded ? '暂无长期记忆，开始对话后将自动提取' : '加载中...'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin">
                      {persistentMemories.map(m => (
                        <div key={m.id} className="group flex items-start gap-2.5 px-3 py-2 rounded-lg transition-colors hover:bg-wiki-surface2"
                          style={{ border: '1px solid var(--wiki-border)' }}>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
                            style={{ background: 'var(--wiki-accent)', color: '#fff' }}>{m.key}</span>
                          <span className="text-sm flex-1 min-w-0" style={{ color: 'var(--wiki-text2)' }}>{m.value}</span>
                          <button onClick={() => handleDeleteMemory(m.key)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all flex-shrink-0">
                            <XIcon size={12} style={{ color: 'var(--wiki-text3)' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'skills' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-wiki-text">技能列表</h3>
                    <p className="text-xs text-wiki-text3 mt-0.5">从应用生态导入或手动填写 Agent 具备的技能</p>
                  </div>
                  <button onClick={openSkillsModal}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}>
                    <ImportIcon size={13} />从生态导入
                  </button>
                </div>
                <textarea value={skills} onChange={e => { setSkills(e.target.value); markDirty(); }} rows={6}
                  placeholder="例如：PDF 处理、Excel 数据分析、Web 爬虫、Git 操作..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm placeholder:text-wiki-text3 focus:outline-none resize-vertical leading-relaxed mb-3" style={C.input} />
                {skills.trim() && (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.split('\n').filter(Boolean).map((s, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-lg" style={C.chip}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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

        {/* ── Skills Import Modal ── */}
        {showSkillsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--wiki-overlay-heavy)' }}>
            <div className="w-[420px] max-h-[60vh] rounded-xl flex flex-col" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--wiki-border)' }}>
                <h3 className="text-sm font-semibold text-wiki-text">从应用生态导入技能</h3>
                <button onClick={() => setShowSkillsModal(false)} className="p-1 rounded hover:bg-wiki-surface2">
                  <XIcon size={16} style={{ color: 'var(--wiki-text3)' }} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {ecoSkills.length === 0 ? (
                  <div className="text-center py-8 text-xs text-wiki-text3">暂无已启用的技能，请先在应用生态中添加</div>
                ) : (
                  ecoSkills.map(s => {
                    const sel = selectedSkillIds.has(s.id);
                    return (
                      <div key={s.id}
                        onClick={() => toggleSkillSelect(s.id)}
                        className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                        style={{ background: sel ? 'var(--wiki-surface2)' : 'transparent' }}>
                        <div className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0"
                          style={{ background: sel ? 'var(--wiki-text)' : 'transparent', borderColor: sel ? 'var(--wiki-text)' : 'var(--wiki-border)' }}>
                          {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--wiki-bg)" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-wiki-text">{s.name}</div>
                          <div className="text-[11px] text-wiki-text3 truncate">{s.description}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2 p-3" style={{ borderTop: '1px solid var(--wiki-border)' }}>
                <button onClick={() => setShowSkillsModal(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium"
                  style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}>取消</button>
                <button onClick={importSkills} disabled={selectedSkillIds.size === 0}
                  className="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                  style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
                  导入 {selectedSkillIds.size > 0 ? `(${selectedSkillIds.size})` : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
