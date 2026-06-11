import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquareIcon, PlusIcon, Trash2Icon, XIcon, Loader2Icon,
  SendHorizonalIcon, ChevronDownIcon, BotIcon, Settings2Icon,
  RefreshCwIcon, PanelRightCloseIcon, PanelRightOpenIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { aioncore } from '../lib/aioncore';
import type { Conversation, Message, AgentModeResponse } from '../lib/api-types';

// ── Types ──

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  pending?: boolean;
}

// ── Helpers ──

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

// ── Component ──

export default function Messages() {
  // Conversations
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);

  // Messages
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Conversation controls
  const [convMode, setConvMode] = useState<AgentModeResponse | null>(null);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [artifacts, setArtifacts] = useState<any[]>([]);

  // ── Load conversations ──

  const loadConvs = useCallback(async () => {
    try {
      const data = await aioncore.conversations.list();
      const list = Array.isArray(data) ? data : ((data as any)?.items || []);
      setConvs(list);
      // Auto-select first conversation if none active
      if (!activeId && list.length > 0) {
        setActiveId(list[0].id);
      }
    } catch (e) {
      console.warn('[Messages] Failed to load conversations:', e);
    } finally {
      setLoadingConvs(false);
    }
  }, [activeId]);

  useEffect(() => { loadConvs(); }, []);

  // ── Load messages for active conversation ──

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    loadMessages(activeId);
    loadMode(activeId);
  }, [activeId]);

  const loadMessages = async (convId: string) => {
    try {
      const data = await aioncore.conversations.messages.list(convId);
      const items = (data as any)?.items || data || [];
      setMessages(items.map((m: any) => ({
        id: m.id || genId(),
        role: m.role || 'assistant',
        content: m.content || '',
        createdAt: m.createdAt || new Date().toISOString(),
      })));
    } catch {
      setMessages([]);
    }
  };

  const loadMode = async (convId: string) => {
    try {
      const mode = await aioncore.conversations.getMode(convId);
      setConvMode(mode);
    } catch { setConvMode(null); }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Create conversation ──

  const handleCreate = async () => {
    try {
      const conv = await aioncore.conversations.create({ title: '新对话' });
      setActiveId(conv.id);
      await loadConvs();
    } catch {
      toast.error('创建对话失败');
    }
  };

  // ── Delete conversation ──

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除此对话？')) return;
    try {
      await aioncore.conversations.delete(id);
      if (activeId === id) setActiveId(null);
      await loadConvs();
    } catch {
      toast.error('删除失败');
    }
  };

  // ── Send message ──

  const handleSend = async () => {
    if (!input.trim() || !activeId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    // Add user message locally
    const userMsg: LocalMessage = {
      id: genId(), role: 'user', content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Add pending assistant message
    const pendingMsg: LocalMessage = {
      id: genId(), role: 'assistant', content: '',
      createdAt: new Date().toISOString(), pending: true,
    };
    setMessages(prev => [...prev, pendingMsg]);

    try {
      const response = await aioncore.conversations.messages.send(activeId, { content });

      // Replace pending with actual response
      setMessages(prev =>
        prev.map(m =>
          m.pending
            ? { ...m, content: (response as any)?.message?.content || response?.message?.content || '已回复', pending: false }
            : m,
        ),
      );
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.pending ? { ...m, content: `发送失败: ${err.message || '未知错误'}`, pending: false } : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  // ── Cancel generation ──

  const handleCancel = async () => {
    if (!activeId) return;
    try { await aioncore.conversations.cancel(activeId); } catch {}
  };

  // ── Mode toggle ──

  const toggleMode = async () => {
    if (!activeId || !convMode) return;
    const nextMode = convMode.mode === 'auto' ? 'manual' : 'auto';
    try {
      const updated = await aioncore.conversations.setMode(activeId, { mode: nextMode });
      setConvMode(updated);
    } catch { toast.error('切换模式失败'); }
  };

  // ── Load artifacts ──

  const loadArtifacts = async () => {
    if (!activeId) return;
    try {
      const data = await aioncore.conversations.artifacts.list(activeId);
      setArtifacts((data as any)?.artifacts || []);
      setShowArtifacts(true);
    } catch { toast.error('加载 Artifact 失败'); }
  };

  // ── Input key handler ──

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Empty state ──

  if (!activeId && !loadingConvs) {
    return (
      <div data-cmp="Messages" className="flex flex-col h-full items-center justify-center p-8 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
          <MessageSquareIcon size={32} style={{ color: '#6366f1' }} />
        </div>
        <h1 className="text-xl font-bold text-wiki-text">对话</h1>
        <p className="text-sm text-wiki-text3">选择一个对话，或创建一个新对话</p>
        <button onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
          style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
          <PlusIcon size={16} />
          创建对话
        </button>
      </div>
    );
  }

  return (
    <div data-cmp="Messages" className="flex h-full overflow-hidden">
      {/* ── Conversation List ── */}
      <div className="w-64 flex-shrink-0 flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--wiki-border)' }}>
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--wiki-border)' }}>
          <span className="text-sm font-semibold text-wiki-text">对话列表</span>
          <button onClick={handleCreate} className="p-1.5 rounded-lg hover:bg-wiki-surface2 transition-colors" title="新对话">
            <PlusIcon size={16} style={{ color: 'var(--wiki-text2)' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loadingConvs ? (
            <div className="flex justify-center py-8"><Loader2Icon size={20} className="animate-spin" style={{ color: 'var(--wiki-text3)' }} /></div>
          ) : convs.length === 0 ? (
            <div className="text-xs text-center py-8" style={{ color: 'var(--wiki-text3)' }}>暂无对话</div>
          ) : convs.map(conv => (
            <div key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className="group flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors"
              style={{
                background: activeId === conv.id ? 'var(--wiki-surface2)' : 'transparent',
                borderBottom: '1px solid var(--wiki-border)',
              }}
              onMouseEnter={e => { if (activeId !== conv.id) e.currentTarget.style.background = 'var(--wiki-surface)'; }}
              onMouseLeave={e => { if (activeId !== conv.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <MessageSquareIcon size={14} className="flex-shrink-0" style={{ color: 'var(--wiki-text3)' }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate text-wiki-text">{conv.title || '新对话'}</div>
                <div className="text-[10px] text-wiki-text3">{conv.messageCount || 0} 条消息</div>
              </div>
              <button onClick={(e) => handleDelete(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:bg-red-50 flex-shrink-0">
                <Trash2Icon size={12} style={{ color: 'var(--wiki-text3)' }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--wiki-border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-wiki-text truncate max-w-[200px]">
              {convs.find(c => c.id === activeId)?.title || '对话'}
            </span>
            {convMode && (
              <button onClick={toggleMode}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                style={{
                  background: convMode.mode === 'auto' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                  color: convMode.mode === 'auto' ? '#16a34a' : '#ca8a04',
                }}>
                <BotIcon size={12} />
                {convMode.mode === 'auto' ? '自动' : '手动'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadArtifacts}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ color: 'var(--wiki-text2)' }}
              title="查看 Artifacts">
              {showArtifacts ? <PanelRightCloseIcon size={14} /> : <PanelRightOpenIcon size={14} />}
              Artifacts
            </button>
            {sending && (
              <button onClick={handleCancel}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                <XIcon size={12} />停止
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <MessageSquareIcon size={40} style={{ color: 'var(--wiki-text3)' }} />
              <p className="text-sm" style={{ color: 'var(--wiki-text3)' }}>发送一条消息开始对话</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    {msg.pending ? (
                      <div className="px-4 py-2.5 rounded-xl flex items-center gap-2" style={{ background: 'var(--wiki-surface2)' }}>
                        <Loader2Icon size={14} className="animate-spin" style={{ color: 'var(--wiki-text3)' }} />
                        <span className="text-sm italic" style={{ color: 'var(--wiki-text3)' }}>AI 思考中...</span>
                      </div>
                    ) : (
                      <div className="px-4 py-2.5 rounded-xl text-sm leading-relaxed break-words whitespace-pre-wrap"
                        style={{
                          background: msg.role === 'user' ? 'var(--wiki-text)' : 'var(--wiki-surface2)',
                          color: msg.role === 'user' ? 'var(--wiki-bg)' : 'var(--wiki-text)',
                        }}>
                        {msg.content}
                      </div>
                    )}
                    <div className="text-[10px] mt-1 px-1" style={{ color: 'var(--wiki-text3)', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid var(--wiki-border)' }}>
          <div className="max-w-2xl mx-auto flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                rows={1}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none scrollbar-thin"
                style={{
                  background: 'var(--wiki-surface2)',
                  border: '1px solid var(--wiki-border)',
                  color: 'var(--wiki-text)',
                  minHeight: '40px',
                  maxHeight: '120px',
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                }}
              />
            </div>
            <button onClick={handleSend} disabled={!input.trim() || sending || !activeId}
              className="flex-shrink-0 p-2.5 rounded-xl transition-all disabled:opacity-40"
              style={{
                background: input.trim() && !sending ? 'var(--wiki-text)' : 'var(--wiki-surface2)',
                color: input.trim() && !sending ? 'var(--wiki-bg)' : 'var(--wiki-text3)',
              }}>
              <SendHorizonalIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Artifacts Panel ── */}
      {showArtifacts && (
        <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: '1px solid var(--wiki-border)' }}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--wiki-border)' }}>
            <span className="text-sm font-semibold text-wiki-text">Artifacts</span>
            <button onClick={() => setShowArtifacts(false)} className="p-1 rounded hover:bg-wiki-surface2">
              <XIcon size={14} style={{ color: 'var(--wiki-text3)' }} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {artifacts.length === 0 ? (
              <div className="text-xs text-center py-8" style={{ color: 'var(--wiki-text3)' }}>暂无 Artifact</div>
            ) : artifacts.map((a: any, i: number) => (
              <div key={a.id || i}
                className="p-3 rounded-lg mb-2 text-xs cursor-pointer hover:brightness-95 transition-all"
                style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
                <div className="font-medium text-wiki-text truncate">{a.name || `Artifact ${i + 1}`}</div>
                <div className="text-wiki-text3 mt-1 truncate">{a.type || 'unknown'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
