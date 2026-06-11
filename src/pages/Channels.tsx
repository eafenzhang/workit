import { useState, useEffect } from 'react';
import { MessageCircleIcon, RefreshCwIcon, CheckCircleIcon, XCircleIcon, PowerIcon, PowerOffIcon, UsersIcon, KeyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { aioncore } from '../lib/aioncore';
import type { PluginStatusResponse, PairingRequestResponse, ChannelSessionResponse } from '../lib/api-types';

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  telegram: { label: 'Telegram', color: '#26A5E4' },
  dingtalk: { label: '钉钉', color: '#1677FF' },
  lark: { label: '飞书', color: '#3370FF' },
  weixin: { label: '微信', color: '#07C160' },
  openclaw: { label: '社区插件', color: '#8B5CF6' },
};

export default function Channels() {
  const [plugins, setPlugins] = useState<PluginStatusResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairings, setPairings] = useState<PairingRequestResponse[]>([]);
  const [sessions, setSessions] = useState<ChannelSessionResponse[]>([]);
  const [tab, setTab] = useState<'plugins' | 'pairings' | 'sessions'>('plugins');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, pr, s] = await Promise.all([
        aioncore.channels.getPlugins().catch(() => []),
        aioncore.channels.getPairings().catch(() => []),
        aioncore.channels.getSessions().catch(() => []),
      ]);
      setPlugins(p);
      setPairings(pr);
      setSessions(s);
    } catch {}
    setLoading(false);
  };

  const togglePlugin = async (plugin: PluginStatusResponse) => {
    try {
      if (plugin.enabled) {
        await aioncore.channels.disablePlugin({ pluginId: plugin.id });
      } else {
        await aioncore.channels.enablePlugin({ pluginId: plugin.id, config: plugin.config });
      }
      toast.success(plugin.enabled ? '已停用' : '已启用');
      loadData();
    } catch { toast.error('操作失败'); }
  };

  const testPlugin = async (id: string) => {
    try {
      const result = await aioncore.channels.testPlugin({ pluginId: id });
      toast.success(result.success ? '连接正常' : '连接失败: ' + (result.message || ''));
    } catch { toast.error('测试失败'); }
  };

  const approvePairing = async (id: string) => {
    try { await aioncore.channels.approvePairing({ pairingId: id }); toast.success('已批准'); loadData(); }
    catch { toast.error('操作失败'); }
  };

  const rejectPairing = async (id: string) => {
    try { await aioncore.channels.rejectPairing({ pairingId: id }); toast.success('已拒绝'); loadData(); }
    catch { toast.error('操作失败'); }
  };

  const TABS = [
    { id: 'plugins' as const, label: '渠道插件', count: plugins.length },
    { id: 'pairings' as const, label: '配对请求', count: pairings.length },
    { id: 'sessions' as const, label: '活跃会话', count: sessions.length },
  ];

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto scrollbar-thin">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-wiki-text">IM 渠道管理</h1>
        <p className="text-sm text-wiki-text2 mt-1">管理 Telegram、钉钉、飞书等 IM 渠道插件</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--wiki-surface)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all"
            style={{
              background: tab === t.id ? 'var(--wiki-surface2)' : 'transparent',
              color: tab === t.id ? 'var(--wiki-text)' : 'var(--wiki-text2)',
            }}>
            {t.label}
            <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--wiki-border)' }}>{t.count}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={loadData} className="flex items-center gap-1 px-3 py-2 rounded-md text-xs" style={{ color: 'var(--wiki-text2)' }}>
          <RefreshCwIcon size={12} className={loading ? 'animate-spin' : ''} />刷新
        </button>
      </div>

      {loading && plugins.length === 0 ? (
        <div className="flex items-center justify-center py-16"><RefreshCwIcon size={24} className="animate-spin" style={{ color: 'var(--wiki-text3)' }} /></div>
      ) : tab === 'plugins' ? (
        <div className="flex flex-col gap-3">
          {plugins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <MessageCircleIcon size={40} style={{ color: 'var(--wiki-text3)' }} />
              <p className="mt-3 text-sm" style={{ color: 'var(--wiki-text2)' }}>暂无渠道插件</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--wiki-text3)' }}>需要先在 AionCore 中配置 IM 渠道</p>
            </div>
          ) : plugins.map(p => {
            const meta = PLATFORM_META[p.type] || { label: p.type, color: 'var(--wiki-text)' };
            return (
              <div key={p.id} className="rounded-lg p-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${meta.color}15` }}>
                    <MessageCircleIcon size={20} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-wiki-text">{p.name || meta.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'running' ? 'text-green-600' : p.status === 'error' ? 'text-red-500' : 'text-yellow-600'
                      }`} style={{
                        background: p.status === 'running' ? 'rgba(34,197,94,0.1)' : p.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                      }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          p.status === 'running' ? 'bg-green-500' : p.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                        {p.status === 'running' ? '运行中' : p.status === 'error' ? '错误' : '已停止'}
                      </span>
                    </div>
                    {p.error && <div className="text-xs mt-1" style={{ color: 'var(--wiki-danger)' }}>{p.error}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => testPlugin(p.id)}
                      className="px-3 py-1.5 rounded text-xs" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>
                      测试
                    </button>
                    <button onClick={() => togglePlugin(p)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
                      style={{
                        background: p.enabled ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        color: p.enabled ? '#dc2626' : '#16a34a',
                      }}>
                      {p.enabled ? <PowerOffIcon size={12} /> : <PowerIcon size={12} />}
                      {p.enabled ? '停用' : '启用'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === 'pairings' ? (
        <div className="flex flex-col gap-3">
          {pairings.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: 'var(--wiki-text3)' }}>暂无待处理的配对请求</div>
          ) : pairings.map(p => (
            <div key={p.id} className="rounded-lg p-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-wiki-text">{p.userName || p.userId}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--wiki-text3)' }}>渠道: {p.pluginId} · 状态: {p.status}</div>
                </div>
                {p.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => approvePairing(p.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
                      style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
                      <CheckCircleIcon size={12} />批准
                    </button>
                    <button onClick={() => rejectPairing(p.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                      <XCircleIcon size={12} />拒绝
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: 'var(--wiki-text3)' }}>暂无活跃会话</div>
          ) : sessions.map(s => (
            <div key={s.id} className="rounded-lg p-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <div className="flex items-center gap-3">
                <UsersIcon size={16} style={{ color: 'var(--wiki-text3)' }} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-wiki-text">{s.userId}</div>
                  <div className="text-xs" style={{ color: 'var(--wiki-text3)' }}>{s.pluginId} · 最后活跃: {s.lastActivityAt}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: s.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)', color: s.status === 'active' ? '#16a34a' : '#ca8a04' }}>
                  {s.status === 'active' ? '活跃' : '空闲'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
