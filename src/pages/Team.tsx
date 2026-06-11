import { useState, useEffect } from 'react';
import { UsersIcon, PlusIcon, TrashIcon, RefreshCwIcon, BotIcon } from 'lucide-react';
import { toast } from 'sonner';
import { aioncore } from '../lib/aioncore';
import type { TeamResponse } from '../lib/api-types';

export default function Team() {
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await aioncore.teams.list();
      setTeams(Array.isArray(data) ? data : []);
    } catch { setTeams([]); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此团队？')) return;
    try { await aioncore.teams.remove(id); toast.success('已删除'); load(); }
    catch { toast.error('删除失败'); }
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-wiki-text">团队协作</h1>
          <p className="text-sm text-wiki-text2 mt-1">多 Agent 团队协作管理</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs" style={{ color: 'var(--wiki-text2)' }}>
          <RefreshCwIcon size={12} className={loading ? 'animate-spin' : ''} />刷新
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><RefreshCwIcon size={24} className="animate-spin" style={{ color: 'var(--wiki-text3)' }} /></div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <UsersIcon size={40} style={{ color: 'var(--wiki-text3)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--wiki-text2)' }}>暂无团队</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--wiki-text3)' }}>通过 AionCore API 创建团队后可在此管理</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {teams.map(team => (
            <div key={team.id} className="rounded-lg p-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <UsersIcon size={20} style={{ color: '#8b5cf6' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-wiki-text">{team.name}</span>
                    {team.description && <span className="text-xs text-wiki-text3 ml-2">{team.description}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {team.agents?.map((agent: any, i: number) => (
                      <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>
                        <BotIcon size={10} />{agent.name}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleDelete(team.id)}
                  className="p-1.5 rounded hover:bg-red-50">
                  <TrashIcon size={14} style={{ color: 'var(--wiki-text3)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
