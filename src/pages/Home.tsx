import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { XIcon, Loader2Icon, PlusIcon, ClockIcon } from 'lucide-react';
import HomeInput, { type HomeSendPayload } from '../components/HomeInput';
import { getGreeting, getTodayDate, generateMessageId, WELCOME_MESSAGES } from '../data/homeDefaults';

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

  const greeting = getGreeting(userProfile?.nickname);
  const todayDate = getTodayDate();
  const welcomeSub = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  // Build agent system prompt from user role profile
  const buildSystemPrompt = useCallback(() => {
    const p = userProfile;
    if (!p || !p.role) return '';
    return `你是 ${p.nickname || 'Workit'}，你的身份角色是「${p.role}」。
专业背景：${p.personality || '专业、高效'}
核心技能：${p.memorySkills || '综合能力'}
对话要求：请严格以「${p.role}」角色的专业视角回答问题，使用中文，保持专业但友好的语气。
当用户咨询与你角色无关的问题时，也应从你角色的专业角度给出建议。`;
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
        const result = await api.chatSend({ providerId: payload.providerId, modelId: payload.modelId, messages: conversation, systemPrompt });
        replyContent = result?.content || result?.error || '模型返回为空';
      } else {
        replyContent = 'AI 对话未就绪（请在模型配置中设置 API Key）';
      }

      const assistantMsg: HomeMessage = { id: generateMessageId(), role: 'assistant', content: replyContent, time: formatTime(new Date()) };
      const final = [...newMessages, assistantMsg];
      setMessages(final);
      // Auto-save to active conversation
      if (activeConvId) {
        setConversations(prev => {
          const updated = prev.map(c => c.id === activeConvId ? { ...c, messages: final, title: final[0]?.content?.slice(0, 30) || c.title } : c);
          saveConversations(updated);
          return updated;
        });
      }
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
    <div data-cmp="Home" className="flex flex-col h-full overflow-hidden relative">
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
              <div className="absolute top-full mt-1 right-0 w-72 max-h-72 overflow-y-auto rounded-lg shadow-lg z-30" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
                {conversations.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs" style={{ color: 'var(--wiki-text3)' }}>暂无历史对话</div>
                ) : (
                  conversations.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2 hover:brightness-95 cursor-pointer transition-colors group" style={{ borderBottom: '1px solid var(--wiki-border)' }} onClick={() => handleOpenConv(c)}>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: c.id === activeConvId ? 'var(--wiki-text)' : 'var(--wiki-text2)' }}>{c.title || '新对话'}</div>
                        <div className="text-[10px]" style={{ color: 'var(--wiki-text3)' }}>{c.messages.length} 条消息 · {c.createdAt?.slice(0, 10)}</div>
                      </div>
                      <button onClick={(e) => handleDeleteConv(c.id, e)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity" title="删除">
                        <XIcon size={11} style={{ color: 'var(--wiki-danger)' }} />
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
            <div className="sticky bottom-0 pt-4 pb-2" style={{ background: 'var(--wiki-bg)' }}>
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
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(Home);
