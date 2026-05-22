import { useNavigate, useLocation } from 'react-router-dom';
import { BotIcon, DatabaseIcon, LightbulbIcon, LayoutDashboardIcon, ChevronRightIcon, SparklesIcon, SettingsIcon, BellIcon, ChevronLeftIcon, ServerIcon, CpuIcon, MessageSquareIcon } from 'lucide-react';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const navItems = [
  { id: 'dashboard', label: `总览`, icon: LayoutDashboardIcon, color: '#ffffff', path: '/' },
  { id: 'requirements', label: `需求`, icon: SparklesIcon, color: '#ffffff', path: '/requirements' },
  { id: 'knowledge', label: `知识库`, icon: DatabaseIcon, color: '#ffffff', path: '/knowledge' },
  { id: 'insights', label: `洞察`, icon: LightbulbIcon, color: '#10b981', path: '/insights' },
  { id: 'model', label: `模型`, icon: CpuIcon, color: '#f59e0b', path: '/model' },
  { id: 'mcp', label: `MCP`, icon: ServerIcon, color: '#ef4444', path: '/mcp' },
  { id: 'messages', label: `消息`, icon: MessageSquareIcon, color: '#ec4899', path: '/messages' },
];

export default function Sidebar({
  activeTab = 'dashboard',
  onTabChange = () => {},
  collapsed = false,
  onCollapsedChange = () => {},
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (item: typeof navItems[0]) => {
    if (item.id === 'dashboard') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  };

  const handleNavClick = (item: typeof navItems[0]) => {
    navigate(item.path);
    onTabChange(item.id);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    onTabChange('settings');
  };

  const width = collapsed ? '72px' : '220px';
  const minWidth = collapsed ? '72px' : '220px';

  return (
    <aside
      data-cmp="Sidebar"
      className="flex flex-col h-screen relative transition-all duration-300 ease-in-out"
      style={{
        width,
        minWidth,
        background: 'var(--wiki-surface)',
        borderRight: '1px solid var(--wiki-border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-6 transition-all duration-300"
        style={{
          borderBottom: '1px solid var(--wiki-border)',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center wiki-glow flex-shrink-0 overflow-hidden"
          style={{ background: '#1e1e2e' }}
        >
          <img src="/icon.png" alt="Workit" className="w-6 h-6" />
        </div>
        {!collapsed && (
          <div className="text-sm font-bold text-wiki-text tracking-wide">Workit</div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 pt-6 flex-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className="flex items-center px-3 rounded-xl transition-all duration-200 w-full text-left relative group"
              style={{
                background: active ? 'var(--wiki-surface2)' : 'transparent',
                border: active ? '1px solid var(--wiki-border)' : '1px solid transparent',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? '0' : '0.75rem',
                height: '44px',
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                style={{
                  background: active ? 'var(--wiki-text)' : 'var(--wiki-surface2)',
                }}
              >
                <Icon size={14} style={{ color: active ? 'var(--wiki-bg)' : 'var(--wiki-text3)' }} />
              </div>
              <span
                className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-300"
                style={{
                  color: active ? 'var(--wiki-text)' : 'var(--wiki-text2)',
                  width: collapsed ? '0px' : 'auto',
                  opacity: collapsed ? 0 : 1,
                  flexShrink: collapsed ? 1 : 0,
                  flexGrow: collapsed ? 0 : 1,
                  pointerEvents: collapsed ? 'none' : 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Settings */}
        <button
          onClick={handleSettingsClick}
          className="flex items-center px-3 rounded-xl transition-all duration-200 w-full text-left hover:bg-wiki-surface2 relative group"
          style={{
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? '0' : '0.75rem',
            background: location.pathname === '/settings'
              ? 'var(--wiki-surface2)'
              : 'transparent',
            border: location.pathname === '/settings' ? '1px solid var(--wiki-border)' : '1px solid transparent',
            height: '44px',
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={{
              background: location.pathname === '/settings' ? 'var(--wiki-text)' : 'var(--wiki-surface2)',
            }}
          >
            <SettingsIcon size={14} style={{ color: location.pathname === '/settings' ? 'var(--wiki-bg)' : 'var(--wiki-text3)' }} />
          </div>
          <span
            className="text-sm whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-300"
            style={{
              color: location.pathname === '/settings' ? 'var(--wiki-text)' : 'var(--wiki-text2)',
              width: collapsed ? '0px' : 'auto',
              opacity: collapsed ? 0 : 1,
              flexShrink: collapsed ? 1 : 0,
              flexGrow: collapsed ? 0 : 1,
              pointerEvents: collapsed ? 'none' : 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            设置
          </span>
        </button>
      </nav>

      {/* User */}
      <div className="px-3 pb-4">
        <div
          className="relative flex items-center gap-3 px-3 rounded-xl transition-all duration-200"
          style={{
            background: 'var(--wiki-surface2)',
            border: '1px solid var(--wiki-border)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            height: '44px',
          }}
        >
          {/* Avatar — clean geometric user silhouette */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--wiki-accent)',
              position: collapsed ? 'absolute' : 'relative',
              left: collapsed ? '50%' : 'auto',
              top: collapsed ? '50%' : 'auto',
              transform: collapsed ? 'translate(-50%, -50%)' : 'none',
              zIndex: 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--wiki-bg)' }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div
            className="transition-all duration-300"
            style={{
              width: collapsed ? '0px' : 'auto',
              maxWidth: collapsed ? '0px' : '80px',
              overflow: 'hidden',
              opacity: collapsed ? 0 : 1,
              flexShrink: 1,
              flexGrow: 0,
              pointerEvents: collapsed ? 'none' : 'auto',
            }}
          >
            <div className="text-xs font-medium text-wiki-text truncate">用户</div>
          </div>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
        style={{
          background: 'var(--wiki-surface)',
          border: '1px solid var(--wiki-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          top: '50%',
          transform: 'translateY(-50%)',
          right: '-12px',
        }}
      >
        {collapsed ? (
          <ChevronRightIcon size={12} style={{ color: 'var(--wiki-text2)' }} />
        ) : (
          <ChevronLeftIcon size={12} style={{ color: 'var(--wiki-text2)' }} />
        )}
      </button>
    </aside>
  );
}
