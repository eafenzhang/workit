import { apiFetch } from '../api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import TitleBar from '../components/TitleBar';

interface IndexProps {
  children?: React.ReactNode;
}

export default function Index({ children = null }: IndexProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      apiFetch('/api/requirements', { method: 'HEAD', signal: controller.signal })
        .then(() => {
          clearTimeout(timeout);
          if (!cancelled) setBackendOnline(true);
        })
        .catch(() => {
          clearTimeout(timeout);
          if (!cancelled) setBackendOnline(false);
        });
    };

    check();
    const interval = setInterval(check, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const pathToTab: Record<string, string> = {
    '/': 'dashboard',
    '/requirements': 'requirements',
    '/knowledge': 'knowledge',
    '/insights': 'insights',
    '/mcp': 'mcp',
    '/model': 'model',
    '/settings': 'settings',
  };

  const activeTab = pathToTab[location.pathname] || 'dashboard';

  const tabToPath: Record<string, string> = {
    'dashboard': '/',
    'requirements': '/requirements',
    'knowledge': '/knowledge',
    'insights': '/insights',
    'mcp': '/mcp',
    'model': '/model',
    'settings': '/settings',
  };

  const handleTabChange = (tab: string) => {
    navigate(tabToPath[tab] || '/');
  };

  const tabLabel: Record<string, string> = {
    dashboard: `总览`,
    requirements: `需求采集`,
    knowledge: `知识`,
    insights: `洞察分析`,
    mcp: `MCP工具`,
    model: `模型`,
    settings: `设置`,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-wiki-bg">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main content */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col">
        <TitleBar />
        {/* Top bar */}
        <div
          className="flex items-center px-8 py-3 flex-shrink-0 transition-all duration-300"
          style={{
            background: 'var(--wiki-surface)',
            backdropFilter: `blur(12px)`,
            borderBottom: '1px solid var(--wiki-border)',
          }}
        >
          <div className="flex items-center gap-2 text-xs text-wiki-text3">
            <span>Workit</span>
            <span style={{ color: 'var(--wiki-text3)' }}>/</span>
            <span style={{ color: 'var(--wiki-text2)' }}>{tabLabel[activeTab]}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-300"
              style={{
                background: backendOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${backendOnline ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: backendOnline ? '#10b981' : '#ef4444',
                  animation: backendOnline ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                }}
              />
              <span style={{ color: backendOnline ? '#10b981' : '#ef4444' }}>
                {backendOnline ? '连接中' : '已离线'}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden" data-px-slot>
          {children}
        </div>
      </main>
    </div>
  );
}
