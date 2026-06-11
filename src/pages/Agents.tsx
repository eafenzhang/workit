import { useState, useEffect } from 'react';
import { BotIcon, RefreshCwIcon, PlusIcon, TrashIcon, PowerIcon, PowerOffIcon, ExternalLinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { aioncore } from '../lib/aioncore';
import type { AgentMetadata, RemoteAgentListItem } from '../lib/api-types';

export default function Agents() {
  const [agents, setAgents] = useState<AgentMetadata[]>([]);
  const [remoteAgents, setRemoteAgents] = useState<RemoteAgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'local' | 'remote'>('local');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([
        aioncore.agents.list().catch(() => []),
        aioncore.remoteAgents.list().catch(() => []),
      ]);
      setAgents(a);
      setRemoteAgents(r);
    } catch {}
    setLoading(false);
  };

  const toggleAgent = async (id: string, current: boolean) => {
    try {
      await aioncore.agents.setEnabled(id, { enabled: !current });
      toast.success(current ? '已停用' : '已启用');
      loadData();
    } catch { toast.error('操作失败'); }
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto scrollbar-thin">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-wiki-text">Agent 管理</h1>
        <p className="text-sm text-wiki-text2 mt-1">管理 AI Agent 运行实例</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--wiki-surface)' }}>
        <button onClick={() => setTab('local')}
          className="px-4 py-2 rounded-md text-xs font-medium transition-all"
          style={{ background: tab === 'local' ? 'var(--wiki-surface2)' : 'transparent', color: tab === 'local' ? 'var(--wiki-text)' : 'var(--wiki-text2)' }}>
          本地 Agent ({agents.length})
        </button>
        <button onClick={() => setTab('remote')}
          className="px-4 py-2 rounded-md text-xs font-medium transition-all"
          style={{ background: tab === 'remote' ? 'var(--wiki-surface2)' : 'transparent', color: tab === 'remote' ? 'var(--wiki-text)' : 'var(--wiki-text2)' }}>
          远程 Agent ({remoteAgents.length})
        </button>
        <div className="flex-1" />
        <button onClick={loadData} className="flex items-center gap-1 px-3 py-2 rounded-md text-xs" style={{ color: 'var(--wiki-text2)' }}>
          <RefreshCwIcon size={12} className={loading ? 'animate-spin' : ''} />刷新
        </button>
      </div>

      {loading && agents.length === 0 ? (
        <div className="flex items-center justify-center py-16"><RefreshCwIcon size={24} className="animate-spin" style={{ color: 'var(--wiki-text3)' }} /></div>
      ) : tab === 'local' ? (
        <div className="flex flex-col gap-3">
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <BotIcon size={40} style={{ color: 'var(--wiki-text3)' }} />
              <p className="mt-3 text-sm" style={{ color: 'var(--wiki-text2)' }}>暂无 Agent</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--wiki-text3)' }}>在 AionCore 中配置 Provider 后 Agent 会自动注册</p>
            </div>
          ) : agents.map(a => (
            <div key={a.id} className="rounded-lg p-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <BotIcon size={20} style={{ color: '#6366f1' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-wiki-text">{a.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>{a.type}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      a.status === 'ready' ? 'text-green-600' : a.status === 'error' ? 'text-red-500' : 'text-yellow-600'
                    }`} style={{
                      background: a.status === 'ready' ? 'rgba(34,197,94,0.1)' : a.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                    }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        a.status === 'ready' ? 'bg-green-500' : a.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      {a.status || 'unknown'}
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--wiki-text3)' }}>
                    {a.providerId && `${a.providerId} / ${a.model || '默认模型'}`}
                  </div>
                  {a.error && <div className="text-xs mt-1" style={{ color: 'var(--wiki-danger)' }}>{a.error}</div>}
                </div>
                <button onClick={() => toggleAgent(a.id, a.enabled)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
                  style={{
                    background: a.enabled ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                    color: a.enabled ? '#dc2626' : '#16a34a',
                  }}>
                  {a.enabled ? <PowerOffIcon size={12} /> : <PowerIcon size={12} />}
                  {a.enabled ? '停用' : '启用'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {remoteAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <ExternalLinkIcon size={40} style={{ color: 'var(--wiki-text3)' }} />
              <p className="mt-3 text-sm" style={{ color: 'var(--wiki-text2)' }}>暂无远程 Agent</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--wiki-text3)' }}>远程 Agent 需要先在 AionCore 中配置</p>
            </div>
          ) : remoteAgents.map(r => (
            <div key={r.id} className="rounded-lg p-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <ExternalLinkIcon size={20} style={{ color: '#8b5cf6' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-wiki-text">{r.name}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      r.status === 'connected' ? 'text-green-600' : 'text-red-500'
                    }`} style={{
                      background: r.status === 'connected' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {r.status === 'connected' ? '已连接' : '已断开'}
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--wiki-text3)' }}>{r.url}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
