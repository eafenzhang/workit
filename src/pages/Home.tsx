import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { XIcon, Loader2Icon, PlusIcon, ClockIcon, ChevronDownIcon, MessageCircleIcon } from 'lucide-react';
import HomeInput, { type HomeSendPayload } from '../components/HomeInput';
import PortalDropdown from '../components/PortalDropdown';
import { apiFetch, API } from '../api';
import { getGreeting, getTodayDate, generateMessageId, WELCOME_MESSAGES } from '../data/homeDefaults';

// Provider display names (synced with src/data/providers.ts)
const PROVIDER_NAMES: Record<string, string> = {
  deepseek: 'DeepSeek', minimax: 'MiniMax', mimo: 'Mimo AI', zhipu: '智谱 AI',
  moonshot: 'Moonshot', dashscope: '阿里云百炼', volcengine: '火山引擎', tencent: '腾讯混元',
  qianfan: '百度千帆', siliconflow: '硅基流动', openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google',
};

interface HomeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const LS_KEY = 'home_messages';

function formatTime(date: Date): string { return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`; }

/** Conversation session */
interface Conversation { id: string; title: string; messages: HomeMessage[]; createdAt: string; }
const CONV_KS = 'home_conversations';

function loadConversations(): Conversation[] {
  try { const r = localStorage.getItem(CONV_KS); return r ? JSON.parse(r) : []; } catch { return []; }
}
const MAX_CONVERSATIONS = 50;

function saveConversations(convs: Conversation[]): void {
  const trimmed = convs.slice(-MAX_CONVERSATIONS);
  try { localStorage.setItem(CONV_KS, JSON.stringify(trimmed)); } catch {}
}

interface HomeProps { onOpenTab?: (type: string, title: string, extra?: Record<string, any>) => void; }

function Home({ onOpenTab }: HomeProps) {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState<HomeMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);

  // Provider / Model / MCP state (lifted from HomeInput)
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [mcpEnabled, setMcpEnabled] = useState(false);

  // Conversation management
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Model data & dropdown state (flat list from API, grouped by provider for display)
  interface FlatModel { id: number; provider: string; modelId: string; name: string; enabled: boolean; isDefault: boolean }
  interface GroupedProvider { provider: string; label: string; models: { id: number; modelId: string; name: string }[] }
  const [providers, setProviders] = useState<GroupedProvider[]>([]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  useEffect(() => {
    apiFetch(API.models).then(r => r.json()).then((list: FlatModel[]) => {
      const arr = Array.isArray(list) ? list.filter(m => m.enabled) : [];
      const groups: Record<string, GroupedProvider> = {};
      for (const m of arr) {
        if (!groups[m.provider]) groups[m.provider] = { provider: m.provider, label: PROVIDER_NAMES[m.provider] || m.provider, models: [] };
        groups[m.provider].models.push({ id: m.id, modelId: m.modelId, name: m.name });
      }
      const grouped = Object.values(groups);
      setProviders(grouped);

      // Restore last-used or fall back to default
      let lastP = '', lastM = '';
      try { const saved = JSON.parse(localStorage.getItem('home_last_model') || '{}'); lastP = saved.provider || ''; lastM = saved.modelId || ''; } catch {}
      const found = lastP && lastM ? arr.find(m => m.provider === lastP && m.modelId === lastM) : null;
      if (found) {
        setSelectedProvider(found.provider);
        setSelectedModel(String(found.modelId));
      } else {
        const def = arr.find(m => m.isDefault);
        if (def) { setSelectedProvider(def.provider); setSelectedModel(String(def.modelId)); }
        else if (grouped.length > 0 && grouped[0].models.length > 0) {
          setSelectedProvider(grouped[0].provider);
          setSelectedModel(String(grouped[0].models[0].modelId));
        }
      }
    }).catch(() => {});
  }, []);

  const currentModelLabel = (() => {
    for (const p of providers) {
      for (const m of p.models) {
        if (p.provider === selectedProvider && String(m.modelId) === selectedModel) {
          const name = m.name.includes(' - ') ? m.name.split(' - ').pop()! : m.name;
          const providerName = PROVIDER_NAMES[p.provider] || p.provider;
          return `${providerName} / ${name}`;
        }
      }
    }
    return '选择模型';
  })();

  const greeting = getGreeting(userProfile?.nickname);
  const todayDate = getTodayDate();
  const welcomeSub = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  // Build agent system prompt from user role profile
  const buildSystemPrompt = useCallback(() => {
    const p = userProfile;
    if (!p || !p.role) return '';
    const parts = [`你是 ${p.nickname || 'Workit'}，你的身份角色是「${p.role}」。`];
    if (p.personality) parts.push(`专业背景：${p.personality}`);
    if (p.memory) parts.push(`记忆：${p.memory}`);
    if (p.skills) parts.push(`技能：${p.skills}`);
    parts.push(`对话要求：请严格以「${p.role}」角色的专业视角回答问题，使用中文，保持专业但友好的语气。`);
    parts.push('当用户咨询与你角色无关的问题时，也应从你角色的专业角度给出建议。');
    return parts.join('\n');
  }, [userProfile]);

  const handleSend = useCallback(async (payload: HomeSendPayload) => {
    const now = new Date();
    const userMsg: HomeMessage = { id: generateMessageId(), role: 'user', content: payload.content, time: formatTime(now) };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setSending(true);

    try {
      const api = (window as any).electronAPI;
      const systemPrompt = buildSystemPrompt();
      const conversation = newMessages.map(m => ({ role: m.role, content: m.content }));

      let replyContent: string;
      if (api?.chatSend) {
        const result = await api.chatSend({ providerId: selectedProvider, modelId: selectedModel, messages: conversation, systemPrompt });
        replyContent = result?.content || result?.error || '模型返回为空';
      } else {
        replyContent = 'AI 对话未就绪（请在模型配置中设置 API Key）';
      }

      const assistantMsg: HomeMessage = { id: generateMessageId(), role: 'assistant', content: replyContent, time: formatTime(new Date()) };
      const final = [...newMessages, assistantMsg];
      setMessages(final);
      // Auto-save: create conversation if none exists
      let convId = activeConvId;
      if (!convId) {
        convId = generateMessageId();
        setActiveConvId(convId);
      }
      setConversations(prev => {
        const updated = prev.map(c => c.id === convId ? { ...c, messages: final, title: final[0]?.content?.slice(0, 30) || c.title } : c);
        if (!updated.find(c => c.id === convId)) {
          updated.push({ id: convId!, title: final[0]?.content?.slice(0, 30) || '新对话', messages: final, createdAt: new Date().toISOString() });
        }
        saveConversations(updated);
        return updated;
      });
    } catch (e: any) {
      const errMsg: HomeMessage = { id: generateMessageId(), role: 'assistant', content: `请求失败：${e.message || '未知错误'}`, time: formatTime(new Date()) };
      setMessages(prev => [...prev, errMsg]);
    } finally { setSending(false); }
  }, [messages, buildSystemPrompt, activeConvId]);

  const handleNewChat = useCallback(() => {
    if (messages.length > 0 && activeConvId) {
      // Save current conversation before starting new
      setConversations(prev => {
        const exists = prev.find(c => c.id === activeConvId);
        const updated = exists
          ? prev.map(c => c.id === activeConvId ? { ...c, messages, title: messages[0]?.content?.slice(0, 30) || '新对话' } : c)
          : [...prev, { id: activeConvId, title: messages[0]?.content?.slice(0, 30) || '新对话', messages, createdAt: new Date().toISOString() }];
        saveConversations(updated);
        return updated;
      });
    }
    const newId = generateMessageId();
    setActiveConvId(newId);
    setMessages([]);
    setShowHistory(false);
  }, [messages, activeConvId]);

  const handleOpenConv = useCallback((conv: Conversation) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages);
    setShowHistory(false);
  }, []);

  const handleDeleteConv = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => { const next = prev.filter(c => c.id !== id); saveConversations(next); return next; });
    if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
  }, [activeConvId]);

  const hasMessages = messages.length > 0;

  return (
    <div data-cmp="Home" className="flex flex-col h-full relative">
      {/* Top-left: model selector */}
      <div className="absolute top-3 left-6 z-10">
        <PortalDropdown
          open={modelDropdownOpen}
          onClose={() => setModelDropdownOpen(false)}
          alignX="left"
          alignY="below"
          trigger={
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors"
              style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}
            >
              <span className="truncate max-w-[160px]">{currentModelLabel}</span>
              <ChevronDownIcon size={11} style={{ transform: modelDropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
            </button>
          }
        >
          <div className="w-64 max-h-48 overflow-y-auto rounded-lg shadow-lg"
            style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            {providers.map(p => (
              <div key={p.provider}>
                <div className="text-[10px] px-3 py-1 font-semibold text-wiki-text3" style={{ background: 'var(--wiki-surface2)' }}>{p.label}</div>
                {p.models.map(m => (
                  <div key={p.provider + '|' + m.id}
                    onClick={() => { setSelectedProvider(p.provider); setSelectedModel(String(m.modelId)); try { localStorage.setItem('home_last_model', JSON.stringify({ provider: p.provider, modelId: m.modelId })); } catch {} setModelDropdownOpen(false); }}
                    className="px-3 py-1.5 text-xs cursor-pointer hover:bg-wiki-surface2 transition-colors truncate"
                    style={{
                      color: selectedProvider === p.provider && selectedModel === String(m.modelId) ? 'var(--wiki-text)' : 'var(--wiki-text2)',
                      fontWeight: selectedProvider === p.provider && selectedModel === String(m.modelId) ? 600 : 400,
                    }}>
                    {m.name.includes(' - ') ? m.name.split(' - ').pop() : m.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </PortalDropdown>
      </div>

      {/* Top-right buttons — no border separator, absolute positioned */}
      <div className="absolute top-3 right-6 flex items-center gap-2 z-10">
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}
        >
          <PlusIcon size={13} />新对话
        </button>
        <div className="relative">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}
          >
            <ClockIcon size={13} />历史对话
          </button>
            {showHistory && (
              <div className="absolute top-full mt-2 right-0 w-80 max-h-80 overflow-y-auto rounded-xl shadow-xl z-30" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
                <div className="sticky top-0 px-4 py-2.5 text-xs font-semibold" style={{ background: 'var(--wiki-surface)', borderBottom: '1px solid var(--wiki-border)', color: 'var(--wiki-text2)' }}>
                  历史对话 ({conversations.length})
                </div>
                {conversations.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--wiki-text3)' }}>暂无历史对话</div>
                ) : (
                  conversations.map(c => (
                    <div key={c.id}
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors group"
                      style={{ background: c.id === activeConvId ? 'var(--wiki-surface2)' : 'transparent', borderBottom: '1px solid var(--wiki-border)' }}
                      onMouseEnter={e => { if (c.id !== activeConvId) e.currentTarget.style.background = 'var(--wiki-surface2)'; }}
                      onMouseLeave={e => { if (c.id !== activeConvId) e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => handleOpenConv(c)}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c.id === activeConvId ? 'var(--wiki-text)' : 'var(--wiki-surface2)' }}>
                        <MessageCircleIcon size={14} style={{ color: c.id === activeConvId ? 'var(--wiki-bg)' : 'var(--wiki-text3)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate" style={{ color: c.id === activeConvId ? 'var(--wiki-text)' : 'var(--wiki-text2)', fontWeight: c.id === activeConvId ? 600 : 400 }}>{c.title || '新对话'}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--wiki-text3)' }}>{c.messages.length} 条消息 · {c.createdAt?.slice(0, 10)}</div>
                      </div>
                      <button onClick={(e) => handleDeleteConv(c.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 transition-all flex-shrink-0" title="删除">
                        <XIcon size={12} style={{ color: 'var(--wiki-text3)' }} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin px-6">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-semibold" style={{ color: 'var(--wiki-text)' }}>Hi，{greeting}</h1>
              <p className="text-sm" style={{ color: 'var(--wiki-text3)' }}>{welcomeSub}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--wiki-text3)' }}>{todayDate}</p>
            </div>
            <HomeInput
              onSend={handleSend}
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              mcpEnabled={mcpEnabled}
              onProviderChange={(pid, mid) => { setSelectedProvider(pid); setSelectedModel(mid); }}
              onMcpToggle={() => setMcpEnabled(!mcpEnabled)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4 max-w-2xl mx-auto">
            {messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
                  <div className="relative max-w-[80%]">
                    <div className="px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words"
                      style={{ background: isUser ? 'var(--wiki-text)' : 'var(--wiki-surface2)', color: isUser ? 'var(--wiki-bg)' : 'var(--wiki-text)', borderBottomRightRadius: isUser ? '4px' : undefined, borderBottomLeftRadius: isUser ? undefined : '4px' }}>
                      {msg.content}
                    </div>
                    <div className={`text-xs mt-1 flex items-center gap-2 justify-end`} style={{ color: 'var(--wiki-text3)' }}>
                      <span>{msg.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 rounded-xl" style={{ background: 'var(--wiki-surface2)' }}>
                  <Loader2Icon size={16} className="animate-spin" style={{ color: 'var(--wiki-text3)' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Fixed bottom input — visible only when conversation started */}
      {hasMessages && (
        <div className="flex-shrink-0 px-6 pb-4 pt-2">
          <HomeInput
            onSend={handleSend}
            disabled={sending}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            mcpEnabled={mcpEnabled}
            onProviderChange={(pid, mid) => { setSelectedProvider(pid); setSelectedModel(mid); }}
            onMcpToggle={() => setMcpEnabled(!mcpEnabled)}
          />
        </div>
      )}
    </div>
  );
}

export default memo(Home);
