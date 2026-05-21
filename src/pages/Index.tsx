import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';

interface IndexProps {
  children?: React.ReactNode;
}

export default function Index({ children = null }: IndexProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    knowledge: `知识库`,
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
            <span style={{ color: 'rgba(99,112,196,0.5)' }}>/</span>
            <span style={{ color: 'var(--wiki-text2)' }}>{tabLabel[activeTab]}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
              <span style={{ color: '#10b981' }}>系统运行正常</span>
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
