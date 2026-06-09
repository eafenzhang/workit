import { memo, useCallback } from 'react';
import { DatabaseIcon, LightbulbIcon, Bot, SparklesIcon, SettingsIcon, PackageIcon, CpuIcon, GlobeIcon, MessageSquareIcon, PaletteIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const navItems = [
  { id: 'home', label: `首页`, icon: Bot, color: 'var(--wiki-text)', path: '/' },
  { id: 'requirements', label: `采集库`, icon: SparklesIcon, color: 'var(--wiki-text)', path: '/requirements' },
  { id: 'knowledge', label: `知识库`, icon: DatabaseIcon, color: 'var(--wiki-text)', path: '/knowledge' },
  { id: 'design-studio', label: `设计稿`, icon: PaletteIcon, color: '#6366f1', path: '/design-studio' },
  { id: 'insights', label: `洞察分析`, icon: LightbulbIcon, color: 'var(--wiki-success)', path: '/insights' },
  { id: 'model', label: `模型配置`, icon: CpuIcon, color: 'var(--wiki-warning)', path: '/model' },
  { id: 'mcp', label: `应用生态`, icon: PackageIcon, color: 'var(--wiki-danger)', path: '/mcp' },
  { id: 'browser', label: `浏览器`, icon: GlobeIcon, color: 'var(--wiki-info)', path: '/browser' },
  { id: 'messages', label: `消息中心`, icon: MessageSquareIcon, color: '#ec4899', path: '/messages' },
];

/** Extracted style constants for Sidebar component */
const ASIDE_STYLE: React.CSSProperties = {
  background: 'var(--wiki-surface)',
  overflow: 'hidden',
};

const NAV_BUTTON_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid transparent',
  justifyContent: 'center',
  gap: '0',
  height: '44px',
  width: '100%',
};

function Sidebar({
  activeTab = 'home',
  onTabChange = () => {},
  collapsed = false,
  onCollapsedChange = () => {},
}: SidebarProps) {

  const { userProfile } = useAuth();

  const handleNavClick = useCallback((item: typeof navItems[0]) => {
    onTabChange(item.id);
  }, [onTabChange]);

  const handleSettingsClick = useCallback(() => {
    onTabChange('settings');
  }, [onTabChange]);

  const handleProfileClick = useCallback(() => {
    onTabChange('profile');
  }, [onTabChange]);

  const isActive = (item: typeof navItems[0]) => item.id === activeTab;

  const width = collapsed ? '0px' : '52px';
  const minWidth = collapsed ? '0px' : '52px';
  const opacity = collapsed ? 0 : 1;

  return (
    <aside
      data-cmp="Sidebar"
      className="glass flex flex-col h-full relative transition-[width,min-width,opacity] duration-300 ease-in-out"
      style={{
        ...ASIDE_STYLE,
        width,
        minWidth,
        opacity,
        borderRight: collapsed ? 'none' : '1px solid var(--wiki-border)',
      }}
    >
      {/* Nav */}
      <nav className="flex flex-col gap-1 px-1.5 pt-6 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin" style={{ width: '52px', minWidth: '52px' }} role="navigation" aria-label="主导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              title={item.label}
              aria-label={item.label}
              className="flex items-center px-1.5 rounded-lg transition-all duration-200 text-left relative group focus:outline-none"
              style={{
                ...NAV_BUTTON_STYLE,
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                style={{
                  background: active ? 'var(--wiki-surface2)' : 'transparent',
                }}
              >
                <Icon size={18} style={{ color: active ? 'var(--wiki-text)' : 'var(--wiki-text3)' }} />
              </div>
              {/* Hover tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50"
                style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Settings */}
        <button
          onClick={handleSettingsClick}
          title="系统设置"
          aria-label="系统设置"
          className="flex items-center px-1.5 rounded-lg transition-all duration-200 text-left hover:bg-wiki-surface2 relative group focus:outline-none"
          style={NAV_BUTTON_STYLE}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={{
              background: activeTab === 'settings' ? 'var(--wiki-surface2)' : 'transparent',
            }}
          >
            <SettingsIcon size={18} style={{ color: activeTab === 'settings' ? 'var(--wiki-text)' : 'var(--wiki-text3)' }} />
          </div>
          <span className="absolute left-full ml-2 px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50"
            style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>系统设置</span>
        </button>
      </nav>

      {/* User profile area */}
      <div className="px-1.5 pb-4">
        <button
          onClick={handleProfileClick}
          className="flex items-center justify-center px-1.5 rounded-lg transition-all duration-200 w-full focus:outline-none relative group"
          style={{ height: '44px' }}
          title="用户Agent"
          aria-label="用户Agent"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={{ background: activeTab === 'profile' ? 'var(--wiki-surface2)' : 'transparent' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: activeTab === 'profile' ? 'var(--wiki-text)' : 'var(--wiki-text3)' }} aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span className="absolute left-full ml-2 px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50"
            style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>用户Agent</span>
        </button>
      </div>
    </aside>
  );
}

export default memo(Sidebar);
