import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import Sidebar from '../components/Sidebar';
import TitleBar from '../components/TitleBar';
import ProfileWizard from '../components/ProfileWizard';
import { useAuth } from '../context/AuthContext';
import { hasProfile } from '../utils/profileStorage';
import { XIcon, Trash2Icon } from 'lucide-react';
import { useAgentOS } from '../context/AgentOSContext';
import AgentOSDesktop from '../components/agent-os/AgentOSDesktop';

/** Extracted base style for tab bar buttons */
const TAB_STYLE: React.CSSProperties = {
  maxWidth: '160px',
  fontSize: '13px',
  WebkitAppRegion: 'no-drag',
};

// Lazy-loaded pages (code splitting for faster initial load)
const Home = lazy(() => import('./Home'));
const Requirements = lazy(() => import('./Requirements'));
const Knowledge = lazy(() => import('./Knowledge'));
const Insights = lazy(() => import('./Insights'));
const AppEcosystem = lazy(() => import('./AppEcosystem'));
const Model = lazy(() => import('./Model'));
const Browser = lazy(() => import('./Browser'));
const Messages = lazy(() => import('./Messages'));
const Settings = lazy(() => import('./Settings'));
const Profile = lazy(() => import('./Profile'));

// Loading fallback spinner
const Loading = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin w-6 h-6 border-2 border-wiki-text border-t-transparent rounded-full" />
  </div>
);

const Lazy = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Loading />}>{children}</Suspense>
);

interface GlobalTab {
  id: string;
  title: string;
  type: string;
  reqId?: number;
  params?: Record<string, any>;
}

const MAX_TABS = 10;

const MENU_MAP: Record<string, { type: string; title: string }> = {
  home: { type: 'home', title: '首页' },
  requirements: { type: 'requirements', title: '采集库' },
  knowledge: { type: 'knowledge', title: '知识库' },
  insights: { type: 'insights', title: '洞察分析' },
  mcp: { type: 'mcp', title: '应用生态' },
  model: { type: 'model', title: '模型配置' },
  messages: { type: 'messages', title: '消息中心' },
  settings: { type: 'settings', title: '系统设置' },
  profile: { type: 'profile', title: '用户Agent' },
};

export default function Index() {
  const [tabs, setTabs] = useState<GlobalTab[]>([{ id: 'home', title: '首页', type: 'home' }]);
  const [activeTabId, setActiveTabId] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const { userProfile, saveProfile, isLoading } = useAuth();

  // Agent OS mode
  const { state: osState, toggleOSMode, openWindow, openNewBrowserWindow } = useAgentOS();
  const isOSMode = osState.isOSMode;
  const hasAutoOpenedRef = React.useRef(false);

  // Auto-open home window when entering OS mode for the first time
  useEffect(() => {
    if (isOSMode && osState.isInitialized && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      // Only open if no windows are open yet
      if (osState.windows.length === 0) {
        openWindow('home', '首页');
      }
    }
  }, [isOSMode, osState.isInitialized, osState.windows.length, openWindow]);

  // Reset auto-open flag when leaving OS mode
  useEffect(() => {
    if (!isOSMode) {
      hasAutoOpenedRef.current = false;
    }
  }, [isOSMode]);

  // First-time startup: show wizard if no profile exists
  useEffect(() => {
    if (!isLoading && !hasProfile()) {
      setShowWizard(true);
    }
  }, [isLoading]);

  // Open a tab by type — if exists, switch to it; else create new
  const openTab = useCallback((type: string, title: string, extra?: Partial<GlobalTab>) => {
    setTabs(prev => {
      const existing = prev.find(t => t.type === type && t.reqId === extra?.reqId);
      if (existing) { setActiveTabId(existing.id); return prev; }
      const newTab: GlobalTab = { id: type + '-' + Date.now(), title, type, ...extra };
      setActiveTabId(newTab.id);
      // Limit max tabs: remove oldest when exceeding MAX_TABS
      const next = [...prev, newTab];
      return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
    });
  }, []);

  /** Wizard completion handler */
  const handleWizardComplete = useCallback((profile: Parameters<typeof saveProfile>[0]) => {
    saveProfile(profile);
    setShowWizard(false);
    // Open profile tab after wizard completes
    openTab('profile', '用户Agent');
  }, [saveProfile, openTab]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex(t => t.id === tabId);
      const next = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTabId(next[newIdx]?.id || 'home');
      }
      return next;
    });
  }, [activeTabId]);

  const switchTab = useCallback((tabId: string) => setActiveTabId(tabId), []);

  // Update browser tab URL in params (persists across tab switches)
  const updateBrowserUrl = useCallback((tabId: string, url: string) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId && t.type === 'browser'
        ? { ...t, params: { ...t.params, url } }
        : t
    ));
  }, []);

  // Update browser tab title from webview page title
  const updateBrowserTitle = useCallback((tabId: string, title: string) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId && t.type === 'browser'
        ? { ...t, title: title.substring(0, 20) || '浏览器' }
        : t
    ));
  }, []);

  // Sidebar menu click → open tab
  const handleMenuClick = useCallback((menuType: string, menuTitle: string) => {
    openTab(menuType, menuTitle);
  }, [openTab]);

  const onCloseSelf = useCallback(() => closeTab(activeTabId), [closeTab, activeTabId]);
  const onToggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), []);

  // Open browser tab — always creates a NEW tab (fix #7)
  const onOpenBrowser = useCallback((url?: string) => {
    if (isOSMode) {
      openNewBrowserWindow();
      return;
    }
    const urlStr = url || '';
    const title = urlStr ? urlStr.replace(/^https?:\/\//, '').substring(0, 30) : '浏览器';
    openTab('browser', title || '浏览器', { params: { url: urlStr }, reqId: Date.now() });
  }, [openTab, isOSMode, openNewBrowserWindow]);

  // Listen for browser tab open requests from link clicks (App.tsx)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ url: string }>).detail;
      if (detail?.url) onOpenBrowser(detail.url);
    };
    window.addEventListener('open-browser-tab', handler);
    return () => window.removeEventListener('open-browser-tab', handler);
  }, [onOpenBrowser]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Build tab bar content for TitleBar
  const tabBar = useMemo(() => (
    <div className="flex items-center h-full gap-0.5 w-full overflow-hidden">
      <div className="flex items-center h-full gap-0.5 flex-1 overflow-hidden">
      {tabs.map(tab => {
        const isActive = activeTabId === tab.id;
        return (
          <div key={tab.id} onClick={() => switchTab(tab.id)}
            className="flex items-center justify-between gap-1 px-2.5 h-7 rounded-lg cursor-pointer select-none transition-colors group flex-1 min-w-0"
            style={{
              ...TAB_STYLE,
              background: isActive ? 'var(--wiki-surface2)' : 'transparent',
              color: isActive ? 'var(--wiki-text)' : 'var(--wiki-text3)',
            } as any}>
            <span className="truncate">{tab.title}</span>
            {tabs.length > 1 && (
              <button onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                className="w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ opacity: isActive ? 1 : 0, background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ef444420'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'inherit'; }}
                title="关闭标签页">
                <XIcon size={13} />
              </button>
            )}
          </div>
        );
      })}
      </div>
      {/* Close all tabs — browser-style, same size/position */}
      {tabs.length > 1 && (
        <button onClick={() => { setTabs([{ id: 'home', title: '首页', type: 'home' }]); setActiveTabId('home'); }}
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ WebkitAppRegion: 'no-drag', color: 'var(--wiki-text3)' } as any}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = 'var(--wiki-surface2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--wiki-text3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          title="关闭全部标签页">
          <Trash2Icon size={14} />
        </button>
      )}
    </div>
  ), [tabs, activeTabId, closeTab, switchTab]);

  // Render page content based on active tab
  const page = useMemo(() => {
    if (!activeTab) return null;
    switch (activeTab.type) {
      case 'home':
        return <Home onOpenTab={(type: string) => openTab(type, MENU_MAP[type]?.title || type)} />;
      case 'requirements':
        return <Requirements
          key={activeTab.id}
          onOpenSubTab={(title, type, extra) => openTab(type, title, extra)}
        />;
      case 'requirements-detail':
      case 'requirements-create':
      case 'requirements-edit':
        return <Requirements
          key={activeTab.id}
          initialTab={{ type: activeTab.type, reqId: activeTab.reqId, params: activeTab.params }}
          onOpenSubTab={(title, type, extra) => openTab(type, title, extra)}
          onCloseSelf={onCloseSelf}
        />;
      case 'knowledge':
        return <Lazy><Knowledge
          key={activeTab.id}
          onOpenSubTab={(title, type, extra) => openTab(type, title, extra)}
        /></Lazy>;
      case 'knowledge-detail':
      case 'knowledge-create':
      case 'knowledge-edit':
        return <Lazy><Knowledge
          key={activeTab.id}
          initialView={activeTab.type}
          docId={activeTab.docId}
          onOpenSubTab={(title, type, extra) => openTab(type, title, extra)}
          onCloseSelf={onCloseSelf}
        /></Lazy>;
      case 'insights':
        return <Lazy><Insights /></Lazy>;
      case 'mcp':
        return <Lazy><AppEcosystem /></Lazy>;
      case 'model':
        return <Lazy><Model /></Lazy>;
      case 'messages':
        return <Lazy><Messages /></Lazy>;
      case 'browser':
        return null; // browser tabs rendered separately below (kept alive with display:none)
      case 'settings':
        return <Lazy><Settings /></Lazy>;
      case 'profile':
        return <Lazy><Profile /></Lazy>;
      default:
        return <Home onOpenTab={(type: string) => openTab(type, MENU_MAP[type]?.title || type)} />;
    }
  }, [activeTab, openTab, onCloseSelf]);

  // Close inner tabs when closing a parent tab
  // (handled automatically by React unmounting)

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-wiki-bg">
      {/* Title bar — hidden in OS mode (merged with MenuBar) */}
      {!isOSMode && (
      <TitleBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={onToggleSidebar}
        onOpenBrowser={() => onOpenBrowser()}
        isOSMode={isOSMode}
        onToggleOSMode={toggleOSMode}
      >
        {tabBar}
      </TitleBar>
      )}

      {/* OS Mode: Render desktop environment */}
      {isOSMode ? (
        <AgentOSDesktop />
      ) : (
        <>
          {/* Below: Sidebar + Content (classic mode) */}
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              activeTab={                     activeTab?.type === 'home' ? 'home' :
                             activeTab?.type === 'requirements' ? 'requirements' :
                             activeTab?.type === 'knowledge' ? 'knowledge' :
                             activeTab?.type === 'insights' ? 'insights' :
                             activeTab?.type === 'mcp' ? 'mcp' :
                             activeTab?.type === 'model' ? 'model' :
                             activeTab?.type === 'messages' ? 'messages' :
                             activeTab?.type === 'settings' ? 'settings' :
                             activeTab?.type === 'profile' ? 'profile' : 'home'}
              onTabChange={(menuType) => {
                const item = MENU_MAP[menuType];
                if (item) handleMenuClick(item.type, item.title);
              }}
              collapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
            />

            {/* Main content area */}
            <main className="flex-1 min-h-0">
              <div className="h-full relative">
                <div key={activeTabId} className="h-full page-fade-enter">
                  <Suspense fallback={<Loading />}>{page}</Suspense>
                </div>
                {/* Browser tabs — always rendered, hidden when inactive */}
                {tabs.filter(t => t.type === 'browser').map(tab => (
                  <div key={tab.id} className="h-full absolute inset-0"
                    style={{ display: tab.id === activeTabId ? undefined : 'none' }}>
                    <Suspense fallback={<Loading />}>
                      <Browser
                        initialUrl={tab.params?.url}
                        onUrlChange={(url) => updateBrowserUrl(tab.id, url)}
                        onTitleChange={(title) => updateBrowserTitle(tab.id, title)}
                        onOpenNewTab={onOpenBrowser}
                        visible={tab.id === activeTabId}
                      />
                    </Suspense>
                  </div>
                ))}
              </div>
            </main>
          </div>
        </>
      )}

      {/* Profile Wizard — full-screen overlay for first-time setup */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-wiki-bg">
          <ProfileWizard onComplete={handleWizardComplete} />
        </div>
      )}
    </div>
  );
}
