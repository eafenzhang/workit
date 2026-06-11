import { useEffect, useState, useRef, useCallback } from 'react';
import { PlusIcon, SearchIcon, MessageSquareIcon, XIcon, TrashIcon, CalendarIcon, UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { aioncore } from '../lib/aioncore';
import type { Conversation } from '../lib/api-types';

interface ReqItem {
  id: string;
  title: string;
  status: string;
  creator: string;
  createdAt: string;
  messageCount?: number;
}

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso?.substring(0, 10) || ''; }
}

function convToReq(c: Conversation): ReqItem {
  return { id: c.id, title: c.title || '新对话', status: c.status || 'active', creator: '', createdAt: c.createdAt || '', messageCount: c.messageCount };
}

export default function Requirements() {
  const [items, setItems] = useState<ReqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', desc: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await aioncore.conversations.list();
      const list = Array.isArray(data) ? data : (data as any)?.items || [];
      setItems(list.map(convToReq));
    } catch { setItems([]); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('请输入标题'); return; }
    setCreating(true);
    try {
      await aioncore.conversations.create({ title: form.title.trim() });
      toast.success('已创建');
      setShowCreate(false);
      setForm({ title: '', desc: '' });
      fetchItems();
    } catch { toast.error('创建失败'); }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    try { await aioncore.conversations.delete(id); toast.success('已删除'); fetchItems(); }
    catch { toast.error('删除失败'); }
  };

  const filtered = items.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div data-cmp="Requirements" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-wiki-text">采集库</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--wiki-text2)' }}>管理对话和采集条目</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
          style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
          <PlusIcon size={14} />新建条目
        </button>
      </div>

      {/* Search */}
      <div className="px-8 pb-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <SearchIcon size={14} style={{ color: 'var(--wiki-text3)' }} />
          <input className="bg-transparent flex-1 text-xs outline-none" style={{ color: 'var(--wiki-text)' }}
            placeholder="搜索条目..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          {searchInput && <button onClick={() => { setSearchInput(''); setSearch(''); }}><XIcon size={14} /></button>}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-8 pb-6 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-2 border-wiki-text3 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <MessageSquareIcon size={32} style={{ color: '#6366f1' }} />
            </div>
            <h3 className="text-lg font-semibold text-wiki-text mb-1">采集库</h3>
            <p className="text-sm" style={{ color: 'var(--wiki-text3)' }}>
              {items.length === 0 ? '暂无条目，点击上方按钮创建' : '无匹配结果'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(item => (
              <div key={item.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors"
                style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--wiki-surface2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--wiki-surface)'; }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--wiki-surface2)' }}>
                  <MessageSquareIcon size={14} style={{ color: 'var(--wiki-text2)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-wiki-text truncate">{item.title}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--wiki-text3)' }}>
                      <CalendarIcon size={10} />{formatTime(item.createdAt)}
                    </span>
                    {item.messageCount !== undefined && (
                      <span className="text-xs" style={{ color: 'var(--wiki-text3)' }}>{item.messageCount} 条消息</span>
                    )}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  className="p-1.5 rounded hover:bg-red-50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                  <TrashIcon size={12} style={{ color: 'var(--wiki-text3)' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--wiki-overlay-heavy)' }}>
          <div className="w-[460px] rounded-lg p-6" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-wiki-text">新建条目</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-wiki-surface2">
                <XIcon size={16} style={{ color: 'var(--wiki-text3)' }} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--wiki-text3)' }}>标题</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none" autoFocus
                  style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)' }}
                  onKeyDown={e => { if (e.key === 'Enter' && form.title.trim()) handleCreate(); }} />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>取消</button>
              <button onClick={handleCreate} disabled={creating || !form.title.trim()}
                className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
