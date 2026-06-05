import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeftIcon, ArrowRightIcon, RotateCwIcon, ExternalLinkIcon,
  StarIcon, XIcon, PlusIcon, SearchIcon, BookmarkIcon
} from 'lucide-react';
import { useAgentOS } from '../context/AgentOSContext';

declare global { namespace JSX { interface IntrinsicElements { webview: any; } } }

// ── Types ──

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
}

interface Bookmark { url: string; title: string; addedAt: number; }

// ── Constants ──

const BM_KEY = 'workit_browser_bookmarks';
const HIST_KEY = 'workit_browser_history';
const MAX_TABS = 15;

// ── Helpers ──

function generateId(): string { return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
function faviconUrl(url: string): string {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`; } catch { return ''; }
}
function normalizeUrl(input: string): string {
  const u = input.trim();
  if (!u) return 'about:blank';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+/.test(u) && !/\s/.test(u)) return `https://${u}`;
  return `https://www.google.com/search?q=${encodeURIComponent(u)}`;
}

// ── Props ──

interface Props {
  initialUrl?: string;
  windowId?: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  visible?: boolean;
  tier?: 'hot' | 'warm' | 'cold';
  snapshot?: { url: string; title: string };
}

// ── Component ──

export default function Browser({ initialUrl, windowId, onUrlChange, onTitleChange, visible, tier, snapshot }: Props) {
  const { closeWindow } = useAgentOS();

  // ── Tab state ──
  const [tabs, setTabs] = useState<BrowserTab[]>(() => {
    const firstId = generateId();
    const firstUrl = initialUrl || 'about:blank';
    return [{
      id: firstId,
      url: firstUrl,
      title: initialUrl ? firstUrl.replace(/^https?:\/\//, '').substring(0, 30) : '新标签页',
      isLoading: false,
    }];
  });
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // ── URL input state ──
  const [inputUrl, setInputUrl] = useState(activeTab?.url || '');
  useEffect(() => { setInputUrl(activeTab?.url || ''); }, [activeTab?.url, activeTabId]);

  // ── Bookmarks & panels ──
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try { return JSON.parse(localStorage.getItem(BM_KEY) || '[]'); } catch { return []; }
  });
  const [showBookmarks, setShowBookmarks] = useState(false);

  // ── Refs ──
  const wvContainerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<any>(null);
  const tabsRef = useRef(tabs); tabsRef.current = tabs;
  const activeTabIdRef = useRef(activeTabId); activeTabIdRef.current = activeTabId;
  const onUrlChangeRef = useRef(onUrlChange); onUrlChangeRef.current = onUrlChange;
  const onTitleChangeRef = useRef(onTitleChange); onTitleChangeRef.current = onTitleChange;

  // ── Tab operations ──
  const updateTab = useCallback((tabId: string, partial: Partial<BrowserTab>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...partial } : t));
  }, []);

  const addTab = useCallback((tabUrl?: string) => {
    setTabs(prev => {
      if (prev.length >= MAX_TABS) return prev;
      const id = generateId();
      const url = normalizeUrl(tabUrl || '');
      const newTab: BrowserTab = {
        id, url,
        title: tabUrl ? url.replace(/^https?:\/\//, '').substring(0, 30) : '新标签页',
        isLoading: false,
      };
      setActiveTabId(id);
      return [...prev, newTab];
    });
  }, []);

  const removeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      if (prev.length <= 1) { closeWindow(windowId || ''); return prev; }
      const remaining = prev.filter(t => t.id !== tabId);
      if (activeTabIdRef.current === tabId) {
        const idx = prev.findIndex(t => t.id === tabId);
        setActiveTabId(remaining[Math.min(idx, remaining.length - 1)]?.id || remaining[0].id);
      }
      return remaining;
    });
  }, [windowId, closeWindow]);

  // ── Webview lifecycle ──
  useEffect(() => {
    const container = wvContainerRef.current;
    if (!container || tier === 'cold') return;

    // Remove old webview
    if (webviewRef.current) {
      try { webviewRef.current.stop(); webviewRef.current.remove(); } catch {}
      webviewRef.current = null;
    }

    // Create new webview for active tab
    const wv = document.createElement('webview') as any;
    wv.style.cssText = 'width:100%;height:100%;border:none;display:flex;';
    wv.setAttribute('allowpopups', '');
    wv.setAttribute('src', activeTab?.url || 'about:blank');
    wv.setAttribute('partition', 'persist:browser');

    // Event handlers using current refs
    const onLoad = () => {
      try {
        const url = wv.getURL();
        if (url && url !== 'about:blank') {
          setInputUrl(url);
          updateTab(activeTabIdRef.current, { url, isLoading: false });
          onUrlChangeRef.current?.(url);
        }
      } catch {}
    };
    const onTitle = (e: any) => {
      const title = e.title || '';
      if (title && title !== 'about:blank') {
        updateTab(activeTabIdRef.current, { title: title.substring(0, 50) });
        onTitleChangeRef.current?.(title);
        // Save to history
        const cur = tabsRef.current.find(t => t.id === activeTabIdRef.current)?.url;
        if (cur) {
          try {
            const stored = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
            const updated = [{ url: cur, title, visitedAt: Date.now() }, ...stored.filter((e: any) => e.url !== cur)].slice(0, 100);
            localStorage.setItem(HIST_KEY, JSON.stringify(updated));
          } catch {}
        }
      }
    };
    const onNavigate = (e: any) => {
      if (e.url && /^https?:\/\//.test(e.url)) {
        setInputUrl(e.url);
        updateTab(activeTabIdRef.current, { url: e.url, isLoading: true });
      }
    };
    const onLoading = () => updateTab(activeTabIdRef.current, { isLoading: true });
    const onStop = () => updateTab(activeTabIdRef.current, { isLoading: false });
    // Open new tabs for window.open() / target="_blank"
    const onNewWindow = (e: any) => {
      if (e.url && /^https?:\/\//.test(e.url)) addTab(e.url);
    };

    wv.addEventListener('did-finish-load', onLoad);
    wv.addEventListener('page-title-updated', onTitle);
    wv.addEventListener('will-navigate', onNavigate);
    wv.addEventListener('did-start-loading', onLoading);
    wv.addEventListener('did-stop-loading', onStop);
    wv.addEventListener('new-window', onNewWindow);

    // Only hide if warm tier, keep running
    if (tier === 'warm') { wv.style.display = 'none'; }
    // Cold tier: don't render at all

    container.appendChild(wv);
    webviewRef.current = wv;
    return () => { try { wv.remove(); } catch {} };
  }, [tier, activeTabId]);

  // Pause when not visible
  useEffect(() => {
    if (!webviewRef.current) return;
    webviewRef.current.style.display = visible === false ? 'none' : 'flex';
  }, [visible]);

  // ── Navigation ──
  const navigate = (url: string) => {
    const resolved = normalizeUrl(url);
    setInputUrl(resolved);
    updateTab(activeTabIdRef.current, { url: resolved, isLoading: true });
    if (webviewRef.current) {
      try { webviewRef.current.loadURL(resolved); } catch {}
    }
  };

  const goBack = () => { try { webviewRef.current?.goBack(); } catch {} };
  const goForward = () => { try { webviewRef.current?.goForward(); } catch {} };
  const reload = () => {
    try { webviewRef.current?.reload(); } catch {
      try {
        const u = webviewRef.current?.getURL?.() || activeTabRef.current?.url;
        if (u) webviewRef.current?.loadURL(u);
      } catch {}
    }
  };
  const activeTabRef = useRef(activeTab); activeTabRef.current = activeTab;

  // ── Bookmark toggle ──
  const isBookmarked = bookmarks.some(b => b.url === activeTab?.url);
  const toggleBookmark = () => {
    const u = activeTab?.url;
    if (!u || u === 'about:blank') return;
    setBookmarks(prev => {
      const next = isBookmarked
        ? prev.filter(b => b.url !== u)
        : [{ url: u, title: activeTab?.title || u, addedAt: Date.now() }, ...prev].slice(0, 50);
      try { localStorage.setItem(BM_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const openExternal = () => {
    try { window.open(activeTab?.url || '', '_blank', 'noopener,noreferrer'); } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') navigate(inputUrl);
  };

  // ── Loading bar ──
  const isLoading = activeTab?.isLoading;

  // ── Render ──
  return (
    <div className="flex flex-col h-full">
      {/* URL Bar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 flex-shrink-0"
        style={{ background: 'var(--wiki-surface)', borderBottom: '1px solid var(--wiki-border)' }}>
        <button onClick={goBack} className="p-1 rounded hover:bg-wiki-surface2" title="后退">
          <ArrowLeftIcon size={15} style={{ color: 'var(--wiki-text2)' }} />
        </button>
        <button onClick={goForward} className="p-1 rounded hover:bg-wiki-surface2" title="前进">
          <ArrowRightIcon size={15} style={{ color: 'var(--wiki-text2)' }} />
        </button>
        <button onClick={reload} className="p-1 rounded hover:bg-wiki-surface2" title="刷新">
          <RotateCwIcon size={15} style={{ color: 'var(--wiki-text2)' }} />
        </button>
        <input
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-1.5 rounded text-xs outline-none"
          style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text)', border: '1px solid var(--wiki-border)' }}
          placeholder="输入网址或搜索..."
        />
        <button onClick={toggleBookmark} className="p-1 rounded hover:bg-wiki-surface2" title={isBookmarked ? '取消收藏' : '加入收藏'}>
          <StarIcon size={15} style={{ color: isBookmarked ? 'var(--wiki-warning)' : 'var(--wiki-text2)' }} />
        </button>
        <button onClick={() => setShowBookmarks(!showBookmarks)} className="p-1 rounded hover:bg-wiki-surface2" title="收藏夹">
          <BookmarkIcon size={15} style={{ color: showBookmarks ? 'var(--wiki-accent)' : 'var(--wiki-text2)' }} />
        </button>
        <button onClick={openExternal} className="p-1 rounded hover:bg-wiki-surface2" title="系统浏览器打开">
          <ExternalLinkIcon size={15} style={{ color: 'var(--wiki-text2)' }} />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center flex-shrink-0" style={{ background: 'var(--wiki-surface)', borderBottom: '1px solid var(--wiki-border)' }}>
        <div className="flex items-center flex-1 min-w-0 overflow-x-auto">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className="group flex items-center gap-1 px-3 py-1.5 cursor-pointer flex-shrink-0 max-w-[160px]"
              style={{
                background: tab.id === activeTabId ? 'var(--wiki-surface2)' : 'transparent',
                borderRight: '1px solid var(--wiki-border)',
                borderBottom: tab.id === activeTabId ? '2px solid var(--wiki-accent)' : '2px solid transparent',
              }}
              onClick={() => setActiveTabId(tab.id)}
            >
              {tab.url && tab.url !== 'about:blank' && (
                <img src={faviconUrl(tab.url)} className="w-3.5 h-3.5 flex-shrink-0" alt=""
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <span className="text-[11px] truncate" style={{ color: tab.id === activeTabId ? 'var(--wiki-text)' : 'var(--wiki-text2)' }}>
                {tab.title || '新标签页'}
              </span>
              {tab.isLoading && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--wiki-accent)', animation: 'pulse 1.5s infinite' }} />
              )}
              <button onClick={e => { e.stopPropagation(); removeTab(tab.id); }}
                className="hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full hover:bg-red-100 flex-shrink-0">
                <XIcon size={10} style={{ color: 'var(--wiki-text3)' }} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => addTab()}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center hover:bg-wiki-surface2 transition-colors"
          title="新建标签页">
          <PlusIcon size={14} style={{ color: 'var(--wiki-text2)' }} />
        </button>
      </div>

      {/* Loading progress bar */}
      {isLoading && (
        <div className="flex-shrink-0" style={{ height: 2, background: 'linear-gradient(90deg, var(--wiki-accent), var(--wiki-info), var(--wiki-accent))', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      )}
      <style>{`
        @keyframes shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      {/* Bookmarks sidebar */}
      {showBookmarks && (
        <>
          <div className="fixed inset-0 z-[9999]" onClick={() => setShowBookmarks(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-[260px] flex flex-col z-[10000]"
            style={{ background: 'var(--wiki-surface)', borderLeft: '1px solid var(--wiki-border)', boxShadow: '-4px 0 16px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--wiki-border)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--wiki-text)' }}>收藏夹 ({bookmarks.length})</span>
              <button onClick={() => setShowBookmarks(false)} className="p-1 rounded hover:bg-wiki-surface2">
                <XIcon size={12} style={{ color: 'var(--wiki-text3)' }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {bookmarks.length === 0 ? (
                <div className="text-xs text-center p-4" style={{ color: 'var(--wiki-text3)' }}>点击地址栏 ☆ 添加收藏</div>
              ) : bookmarks.map(bm => (
                <div key={bm.url}
                  className="flex items-center gap-2 px-3 py-2.5 group hover:bg-wiki-surface2 cursor-pointer"
                  style={{ borderBottom: '1px solid var(--wiki-border)' }}
                  onClick={() => { navigate(bm.url); setShowBookmarks(false); }}>
                  <img src={faviconUrl(bm.url)} className="w-4 h-4 rounded-sm flex-shrink-0" alt=""
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate" style={{ color: 'var(--wiki-text)' }}>{bm.title}</div>
                    <div className="text-[10px] truncate" style={{ color: 'var(--wiki-text3)' }}>{bm.url}</div>
                  </div>
                  <button onClick={e => {
                    e.stopPropagation();
                    setBookmarks(prev => {
                      const n = prev.filter(b => b.url !== bm.url);
                      try { localStorage.setItem(BM_KEY, JSON.stringify(n)); } catch {}
                      return n;
                    });
                  }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50">
                    <XIcon size={10} style={{ color: 'var(--wiki-text3)' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Webview container */}
      <div ref={wvContainerRef} className="flex-1 flex flex-col overflow-hidden"
        style={{ background: 'var(--wiki-surface2)', display: 'flex' }} />

      {/* Cold tier placeholder */}
      {tier === 'cold' && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: 'var(--wiki-surface2)' }}>
          <div className="text-center">
            <div className="text-xs mb-1" style={{ color: 'var(--wiki-text3)' }}>浏览器已休眠</div>
            <div className="text-[11px] truncate max-w-[300px]" style={{ color: 'var(--wiki-text3)', opacity: 0.6 }}>
              {snapshot?.title || initialUrl || '点击重新加载'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
