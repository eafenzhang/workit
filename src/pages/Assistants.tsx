import { useState, useEffect } from 'react';
import { BotIcon, PlusIcon, TrashIcon, RefreshCwIcon, PowerIcon, PowerOffIcon } from 'lucide-react';
import { toast } from 'sonner';
import { aioncore } from '../lib/aioncore';
import type { AssistantResponse } from '../lib/api-types';

export default function Assistants() {
  const [assistants, setAssistants] = useState<AssistantResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await aioncore.assistants.list();
      setAssistants(Array.isArray(data) ? data : []);
    } catch { setAssistants([]); }
    setLoading(false);
  };

  const toggleState = async (id: string, state: string) => {
    try {
      await aioncore.assistants.setState(id, { state: state === 'active' ? 'inactive' : 'active' });
      toast.success(state === 'active' ? '已停用' : '已启用');
      load();
    } catch { toast.error('操作失败'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    try { await aioncore.assistants.delete(id); toast.success('已删除'); load(); }
    catch { toast.error('删除失败'); }
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-wiki-text">AI 助手</h1>
          <p className="text-sm text-wiki-text2 mt-1">管理和配置 AI 助手</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs" style={{ color: 'var(--wiki-text2)' }}>
          <RefreshCwIcon size={12} className={loading ? 'animate-spin' : ''} />刷新
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><RefreshCwIcon size={24} className="animate-spin" style={{ color: 'var(--wiki-text3)' }} /></div>
      ) : assistants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <BotIcon size={40} style={{ color: 'var(--wiki-text3)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--wiki-text2)' }}>暂无 AI 助手</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--wiki-text3)' }}>在 AionCore 中配置后会自动显示</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {assistants.map(a => (
            <div key={a.id} className="rounded-lg p-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: a.state === 'active' ? 'rgba(99,102,241,0.1)' : 'var(--wiki-surface2)' }}>
                  <BotIcon size={20} style={{ color: a.state === 'active' ? '#6366f1' : 'var(--wiki-text3)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-wiki-text">{a.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.state === 'active' ? 'text-green-600' : 'text-yellow-600'}`} style={{
                      background: a.state === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                    }}>{a.state === 'active' ? '启用' : '停用'}</span>
                  </div>
                  {a.description && <div className="text-xs mt-1" style={{ color: 'var(--wiki-text3)' }}>{a.description}</div>}
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => toggleState(a.id, a.state)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs"
                      style={{
                        background: a.state === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        color: a.state === 'active' ? '#dc2626' : '#16a34a',
                      }}>
                      {a.state === 'active' ? <PowerOffIcon size={11} /> : <PowerIcon size={11} />}
                      {a.state === 'active' ? '停用' : '启用'}
                    </button>
                    <button onClick={() => handleDelete(a.id)}
                      className="p-1 rounded hover:bg-red-50 transition-colors">
                      <TrashIcon size={12} style={{ color: 'var(--wiki-text3)' }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
