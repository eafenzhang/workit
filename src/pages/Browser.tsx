import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, RotateCwIcon, ExternalLinkIcon, StarIcon, ClockIcon } from 'lucide-react';

declare global { namespace JSX { interface IntrinsicElements { webview: any; } } }

interface Props {
  initialUrl?: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  onOpenNewTab?: (url?: string) => void;
  visible?: boolean;
}

interface Bookmark { url: string; title: string; addedAt: number; }
interface HistoryEntry { url: string; title: string; visitedAt: number; }

const BM_KEY = 'workit_browser_bookmarks';
const HIST_KEY = 'workit_browser_history';

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}

function faviconUrl(url: string): string {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`; } catch { return ''; }
}

export default function Browser({ initialUrl, onUrlChange, onTitleChange, onOpenNewTab, visible }: Props) {
  const [url, setUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const wvContainerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<any>(null);
  const urlRef = useRef(url); urlRef.current = url;
  const onUrlChangeRef = useRef(onUrlChange); onUrlChangeRef.current = onUrlChange;
  const onOpenNewTabRef = useRef(onOpenNewTab); onOpenNewTabRef.current = onOpenNewTab;
  const onTitleChangeRef = useRef(onTitleChange); onTitleChangeRef.current = onTitleChange;
  const pageTitleRef = useRef('');

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => load(BM_KEY, []));
  const [history, setHistory] = useState<HistoryEntry[]>(() => load(HIST_KEY, []));
  const [showHistory, setShowHistory] = useState(false);
  const [browserLoading, setBrowserLoading] = useState(false);

  // ── Create webview imperatively (avoids React rendering issues) ──
  useEffect(() => {
    const container = wvContainerRef.current;
    if (!container) return;

    // Cleanup previous webview
    const removeWebview = () => {
      if (webviewRef.current) {
        try {
          webviewRef.current.removeEventListener('did-finish-load', handleWebviewLoad);
          webviewRef.current.removeEventListener('page-title-updated', handlePageTitle);
          webviewRef.current.removeEventListener('will-navigate', handleWillNavigate);
          webviewRef.current.removeEventListener('did-start-loading', handleStartLoading);
          webviewRef.current.removeEventListener('did-stop-loading', handleStopLoading);
          webviewRef.current.stop();
          webviewRef.current.remove();
        } catch {}
        webviewRef.current = null;
      }
    };
    removeWebview();

    // Create fresh webview
    const wv = document.createElement('webview') as any;
    wv.className = 'flex-1 w-full border-0';
    wv.style.cssText = 'height:100%;display:flex;';
    wv.setAttribute('allowpopups', '');
    wv.setAttribute('src', initialUrl || 'about:blank');
    wv.addEventListener('did-finish-load', handleWebviewLoad);
    wv.addEventListener('page-title-updated', handlePageTitle);
    wv.addEventListener('will-navigate', handleWillNavigate);
    wv.addEventListener('did-start-loading', handleStartLoading);
    wv.addEventListener('did-stop-loading', handleStopLoading);
    // Let normal link clicks navigate within the same webview.
    // Only intercept window.open() style popups via did-attach handler.
    wv.addEventListener('did-attach', () => {
      try {
        const wc = wv.getWebContents?.();
        if (wc?.setWindowOpenHandler) {
          wc.setWindowOpenHandler(({ url: newUrl }: { url: string }) => {
            if (newUrl && /^https?:\/\//.test(newUrl)) onOpenNewTabRef.current?.(newUrl);
            return { action: 'deny' };
          });
        }
      } catch {}
    });
    container.appendChild(wv);
    webviewRef.current = wv;

    // Proper cleanup on unmount
    return () => { removeWebview(); };
  }, []);

  // ── event handlers ──
  const handleWebviewLoad = useCallback((e: any) => {
    try {
      const wvUrl = e.target?.getURL?.() || webviewRef.current?.getURL?.();
      if (wvUrl && wvUrl !== 'about:blank') {
        setInputUrl(wvUrl);
        onUrlChangeRef.current?.(wvUrl);
        if (wvUrl !== urlRef.current) setUrl(wvUrl);
      }
    } catch {}
  }, []);

  const handlePageTitle = useCallback((e: any) => {
    const title = e.title || '';
    if (title && title !== 'about:blank') {
      pageTitleRef.current = title;
      onTitleChangeRef.current?.(title);
      const cur = urlRef.current;
      setHistory(prev => {
        const f = prev.filter(en => en.url !== cur);
        const n = [{ url: cur, title: title.substring(0, 40), visitedAt: Date.now() }, ...f].slice(0, 100);
        try { localStorage.setItem(HIST_KEY, JSON.stringify(n)); } catch {}
        return n;
      });
    }
  }, []);

  const handleWillNavigate = useCallback((e: any) => {
    const navUrl = e.url;
    if (navUrl && /^https?:\/\//.test(navUrl)) {
      setInputUrl(navUrl);
      onUrlChangeRef.current?.(navUrl);
    }
  }, []);

  const handleStartLoading = useCallback(() => setBrowserLoading(true), []);
  const handleStopLoading = useCallback(() => setBrowserLoading(false), []);

  const handleNewWindow = useCallback((e: any) => {
    e.preventDefault?.();
    const newUrl = e.url;
    if (newUrl && /^https?:\/\//.test(newUrl)) {
      onOpenNewTabRef.current?.(newUrl);
    }
  }, []);

  // ── Navigation ──
  const navigateTo = (u: string) => {
    let go = u.trim();
    if (!/^https?:\/\//.test(go)) go = /\./.test(go) && !/\s/.test(go) ? `https://${go}` : `https://www.google.com/search?q=${encodeURIComponent(go)}`;
    setInputUrl(go);
    if (webviewRef.current) {
      try { webviewRef.current.loadURL(go); setUrl(go); } catch {}
    }
  };

  const goBack = () => { try { webviewRef.current?.goBack(); } catch {} };
  const goForward = () => { try { webviewRef.current?.goForward(); } catch {} };
  const reload = () => {
    try { webviewRef.current?.reload(); } catch {
      try { const c = webviewRef.current?.getURL?.() || urlRef.current; if (c) webviewRef.current?.loadURL(c); } catch {}
    }
  };

  // Track URL changes from initialUrl prop
  useEffect(() => {
    if (initialUrl && initialUrl !== url && webviewRef.current) {
      try { webviewRef.current.loadURL(initialUrl); setUrl(initialUrl); } catch {}
    }
  }, [initialUrl]);

  // Pause webview rendering when window is minimized or hidden
  useEffect(() => {
    if (visible === false) {
      try { webviewRef.current?.stop(); }
      catch {}
      // Hide webview to prevent GPU rendering when not visible
      if (webviewRef.current) {
        webviewRef.current.style.display = 'none';
      }
    } else {
      if (webviewRef.current) {
        webviewRef.current.style.display = 'flex';
      }
    }
  }, [visible]);

  // ── UI handlers ──
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') navigateTo(inputUrl); };
  const openExternal = () => { const u = urlRef.current; if (u) { try { window.open(u, '_blank', 'noopener,noreferrer'); } catch {} } };
  const closeAllPanels = () => setShowHistory(false);

  const toggleBookmark = () => {
    const u = urlRef.current; if (!u) return;
    const t = pageTitleRef.current || u.replace(/^https?:\/\//, '').substring(0, 30);
    setBookmarks(prev => {
      const exists = prev.find(b => b.url === u);
      const next = exists ? prev.filter(b => b.url !== u) : [{ url: u, title: t, addedAt: Date.now() }, ...prev].slice(0, 30);
      saveAndSync(BM_KEY, next); return next;
    });
  };

  function saveAndSync(key: string, val: any) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

  return (
    <div className="flex flex-col h-full">
      {/* URL bar */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ background: 'var(--wiki-surface)', borderBottom: '1px solid var(--wiki-border)' }}>
        <button onClick={goBack} className="p-1 rounded hover:bg-wiki-surface2 transition-colors"><ArrowLeftIcon size={14} style={{ color: 'var(--wiki-text2)' }} /></button>
        <button onClick={goForward} className="p-1 rounded hover:bg-wiki-surface2 transition-colors"><ArrowRightIcon size={14} style={{ color: 'var(--wiki-text2)' }} /></button>
        <button onClick={reload} className="p-1 rounded hover:bg-wiki-surface2 transition-colors"><RotateCwIcon size={14} style={{ color: 'var(--wiki-text2)' }} /></button>
        <input value={inputUrl} onChange={e => setInputUrl(e.target.value)} onKeyDown={handleKeyDown} onFocus={closeAllPanels}
          className="flex-1 px-3 py-1.5 rounded text-xs outline-none browser-url-input"
          style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text)', border: '1px solid var(--wiki-border)' }} placeholder="输入网址..." />
        <button onClick={toggleBookmark} className="p-1 rounded hover:bg-wiki-surface2 transition-colors" title={bookmarks.some(b => b.url === url) ? '取消收藏' : '收藏'}>
          <StarIcon size={14} style={{ color: bookmarks.some(b => b.url === url) ? 'var(--wiki-warning)' : 'var(--wiki-text2)' }} /></button>
        <button onClick={() => setShowHistory(!showHistory)} className="p-1 rounded hover:bg-wiki-surface2 transition-colors" title="历史记录">
          <ClockIcon size={14} style={{ color: showHistory ? 'var(--wiki-info)' : 'var(--wiki-text2)' }} /></button>
        <button onClick={openExternal} className="p-1 rounded hover:bg-wiki-surface2 transition-colors" title="系统浏览器" data-bypass-interceptor>
          <ExternalLinkIcon size={14} style={{ color: 'var(--wiki-text2)' }} /></button>
      </div>

      {/* Bookmarks bar */}
      {bookmarks.length > 0 && !showHistory && (
        <div className="flex items-center gap-0.5 px-3 py-1.5 flex-shrink-0 overflow-x-auto" style={{ background: 'var(--wiki-surface)', borderBottom: '1px solid var(--wiki-border)' }}>
          {bookmarks.slice(0, 15).map(bm => (
            <div key={bm.url} className="group flex items-center gap-1 px-2 py-1 rounded hover:bg-wiki-surface2 transition-colors flex-shrink-0">
              <img src={faviconUrl(bm.url)} className="w-3.5 h-3.5" alt="" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <button onClick={() => navigateTo(bm.url)} className="text-[11px] text-wiki-text2 hover:text-wiki-text truncate max-w-[120px]">{bm.title}</button>
              <button onClick={() => { setBookmarks(prev => { const n = prev.filter(b => b.url !== bm.url); saveAndSync(BM_KEY, n); return n; }); }}
                className="hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full text-[10px] text-wiki-text3 hover:text-red-500 flex-shrink-0">×</button>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {showHistory && (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--wiki-surface)' }}>
          <div className="text-xs text-wiki-text3 px-4 py-2" style={{ borderBottom: '1px solid var(--wiki-border)' }}>最近访问 ({history.length} 条)</div>
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? <div className="text-xs text-wiki-text3 p-4">暂无历史记录</div> : history.slice(0, 50).map(e => (
              <button key={e.url + e.visitedAt} onClick={() => navigateTo(e.url)} className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-wiki-surface2 transition-colors">
                <img src={faviconUrl(e.url)} className="w-4 h-4 flex-shrink-0" alt="" loading="lazy" onError={e2 => { (e2.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="flex-1 min-w-0"><div className="text-xs text-wiki-text truncate">{e.title}</div><div className="text-[10px] text-wiki-text3 truncate">{e.url}</div></div>
                <span className="text-[10px] text-wiki-text3 flex-shrink-0">{new Date(e.visitedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading progress */}
      <style>{`
        .browser-progress { height: 2px; background: linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1); background-size: 200% 100%; animation: progress-pulse 1.5s ease-in-out infinite; }
        @keyframes progress-pulse { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
      `}</style>
      {browserLoading && <div className="browser-progress" />}

      {/* Webview — always rendered, created imperatively */}
      <div
        ref={wvContainerRef}
        className="flex-1 flex flex-col overflow-hidden"
        style={{ display: showHistory ? 'none' : 'flex' }}
      />
    </div>
  );
}
