import React, { useState, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import TitleBar from '../components/TitleBar';
import Dashboard from './Dashboard';
import Requirements from './Requirements';
import Knowledge from './Knowledge';
import Insights from './Insights';
import MCP from './MCP';
import Model from './Model';
import Messages from './Messages';
import Settings from './Settings';
import { PlusIcon, XIcon } from 'lucide-react';

interface GlobalTab {
  id: string;
  title: string;
  type: string; // 'dashboard' | 'requirements' | 'requirements-detail' | 'requirements-create' | 'knowledge' | ...
  reqId?: number; // for requirement detail tabs
  params?: Record<string, any>;
}

export default function Index() {
  const [tabs, setTabs] = useState<GlobalTab[]>([{ id: 'dashboard', title: '首页', type: 'dashboard' }]);
  const [activeTabId, setActiveTabId] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Open a tab by type — if exists, switch to it; else create new
  const openTab = useCallback((type: string, title: string, extra?: Partial<GlobalTab>) => {
    setTabs(prev => {
      const existing = prev.find(t => t.type === type && t.reqId === extra?.reqId);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      const newTab: GlobalTab = { id: type + '-' + Date.now(), title, type, ...extra };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex(t => t.id === tabId);
      const next = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTabId(next[newIdx]?.id || 'dashboard');
      }
      return next;
    });
  }, [activeTabId]);

  const switchTab = useCallback((tabId: string) => setActiveTabId(tabId), []);

  // Sidebar menu click → open tab
  const handleMenuClick = useCallback((menuType: string, menuTitle: string) => {
    openTab(menuType, menuTitle);
  }, [openTab]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Build tab bar content for TitleBar
  const tabBar = useMemo(() => (
    <div className="flex items-center h-full overflow-x-auto scrollbar-thin gap-0.5">
      {tabs.map(tab => {
        const isActive = activeTabId === tab.id;
        return (
          <div key={tab.id} onClick={() => switchTab(tab.id)}
            className="flex items-center gap-1 px-2.5 h-7 rounded-md text-xs cursor-pointer flex-shrink-0 select-none transition-colors group"
            style={{
              background: isActive ? 'var(--wiki-surface2)' : 'transparent',
              color: isActive ? 'var(--wiki-text)' : 'var(--wiki-text3)',
              WebkitAppRegion: 'no-drag',
            } as any}>
            <span className="truncate max-w-[100px]">{tab.title}</span>
            {tabs.length > 1 && (
              <button onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                className="p-0.5 rounded hover:bg-wiki-surface2 flex-shrink-0 transition-opacity duration-150"
                style={{ opacity: isActive ? 1 : 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.opacity = '0'; }}>
                <XIcon size={10} />
              </button>
            )}
          </div>
        );
      })}
      <button onClick={() => openTab('dashboard', '首页')}
        className="px-1.5 h-7 rounded-md text-xs text-wiki-text3 hover:text-wiki-text hover:bg-wiki-surface2 flex-shrink-0 flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as any}>
        <PlusIcon size={12} />
      </button>
    </div>
  ), [tabs, activeTabId, closeTab, switchTab, openTab]);

  // Render page content based on active tab
  const renderPage = () => {
    if (!activeTab) return null;
    switch (activeTab.type) {
      case 'dashboard':
        return <Dashboard onOpenSubTab={(title, type, extra) => openTab(type, title, extra)} />;
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
          onCloseSelf={() => closeTab(activeTab.id)}
        />;
      case 'knowledge':
        return <Knowledge
          key={activeTab.id}
          onOpenSubTab={(title, type, extra) => openTab(type, title, extra)}
        />;
      case 'knowledge-detail':
      case 'knowledge-create':
      case 'knowledge-edit':
        return <Knowledge
          key={activeTab.id}
          initialView={activeTab.type}
          docId={activeTab.docId}
          onOpenSubTab={(title, type, extra) => openTab(type, title, extra)}
          onCloseSelf={() => closeTab(activeTab.id)}
        />;
      case 'insights':
        return <Insights />;
      case 'mcp':
        return <MCP />;
      case 'model':
        return <Model />;
      case 'messages':
        return <Messages />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  // Close inner tabs when closing a parent tab
  // (handled automatically by React unmounting)

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-wiki-bg">
      {/* Title bar spans full width */}
      <TitleBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
      >
        {tabBar}
      </TitleBar>

      {/* Below: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab?.type === 'requirements' ? 'requirements' :
                     activeTab?.type === 'dashboard' ? 'dashboard' :
                     activeTab?.type === 'knowledge' ? 'knowledge' :
                     activeTab?.type === 'insights' ? 'insights' :
                     activeTab?.type === 'mcp' ? 'mcp' :
                     activeTab?.type === 'model' ? 'model' :
                     activeTab?.type === 'messages' ? 'messages' :
                     activeTab?.type === 'settings' ? 'settings' : 'dashboard'}
          onTabChange={(menuType) => {
            const menuMap: Record<string, { type: string; title: string }> = {
              dashboard: { type: 'dashboard', title: '首页' },
              requirements: { type: 'requirements', title: '采集库' },
              knowledge: { type: 'knowledge', title: '知识库' },
              insights: { type: 'insights', title: '洞察分析' },
              mcp: { type: 'mcp', title: 'MCP工具' },
              model: { type: 'model', title: '模型' },
              messages: { type: 'messages', title: '消息' },
              settings: { type: 'settings', title: '设置' },
            };
            const item = menuMap[menuType];
            if (item) handleMenuClick(item.type, item.title);
          }}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}