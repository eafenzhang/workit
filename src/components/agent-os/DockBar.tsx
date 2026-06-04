import { useCallback, useState, useEffect, useMemo } from 'react';
import { useAgentOS } from '../../context/AgentOSContext';
import type { DockItem, OSWindow } from '../../types/agent-os';
import DockIcon from './DockIcon';

// ── Filled icons with brand colors ──

import {
  Home,
  Sparkles,
  Database,
  Lightbulb,
  Package,
  Cpu,
  MessageSquare,
  Settings,
  User,
  Globe,
} from 'lucide-react';

// ── Dock items with filled icons and brand colors ──

const DOCK_ITEMS: (DockItem & { color: string })[] = [
  { id: 'home', label: '首页', icon: Home, type: 'home', color: '#6366f1' },
  { id: 'requirements', label: '采集库', icon: Sparkles, type: 'requirements', color: '#f59e0b' },
  { id: 'knowledge', label: '知识库', icon: Database, type: 'knowledge', color: '#10b981' },
  { id: 'insights', label: '洞察分析', icon: Lightbulb, type: 'insights', color: '#8b5cf6' },
  { id: 'mcp', label: '应用生态', icon: Package, type: 'mcp', color: '#06b6d4' },
  { id: 'model', label: '模型配置', icon: Cpu, type: 'model', color: '#ef4444' },
  { id: 'browser', label: '浏览器', icon: Globe, type: 'browser', color: '#3b82f6' },
  { id: 'messages', label: '消息中心', icon: MessageSquare, type: 'messages', color: '#14b8a6' },
  { id: 'settings', label: '系统设置', icon: Settings, type: 'settings', color: '#64748b' },
  { id: 'profile', label: '用户Agent', icon: User, type: 'profile', color: '#ec4899' },
];

type DockState = 'show' | 'hide' | 'float';

/**
 * macOS-style bottom Dock bar positioned absolute in the shared container.
 *
 * DesktopArea fills the full container (wallpaper covers entire area),
 * DockBar sits on top with glassmorphism overlay.
 *
 * Behavior (all wrt. maximized windows only — see AgentOSDesktop):
 *  - show:  Normal glassmorphism bar, always interactive.
 *  - hide:  Hidden entirely.
 *  - float: Semi-transparent overlay that appears on hover.
 */
export default function DockBar({
  settingsVersion,
  dockState = 'show',
}: {
  settingsVersion?: number;
  dockState?: DockState;
}) {
  const { state, openWindow, openNewBrowserWindow, focusWindow, minimizeWindow } = useAgentOS();
  const { windows } = state;

  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  const [dockHovered, setDockHovered] = useState(false);

  // ── Browser context menu (right-click browser icon → list all browser windows) ──
  const [browserMenu, setBrowserMenu] = useState<{ x: number; y: number } | null>(null);

  const browserWindows = useMemo(
    () => windows.filter((w: OSWindow) => w.type === 'browser' && !w.isMinimized),
    [windows],
  );

  // Close context menu on any click outside
  useEffect(() => {
    if (!browserMenu) return;
    const close = () => setBrowserMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [browserMenu]);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isOpen = useCallback(
    (type: string) => windows.some((w: OSWindow) => w.type === type && !w.isMinimized),
    [windows],
  );

  const handleDockClick = useCallback(
    (type: string) => {
      const item = DOCK_ITEMS.find((d) => d.type === type);
      if (!item) return;
      if (type === 'browser') {
        openNewBrowserWindow();
        return;
      }
      const existing = windows.find((w: OSWindow) => w.type === type);
      if (existing) {
        if (existing.isMinimized) {
          focusWindow(existing.id);
        } else {
          minimizeWindow(existing.id);
        }
      } else {
        openWindow(type, item.label);
      }
    },
    [windows, openWindow, openNewBrowserWindow, focusWindow, minimizeWindow],
  );

  // Right-click browser icon → list all browser windows
  const handleBrowserContextMenu = useCallback(
    (type: string, e: React.MouseEvent) => {
      if (type !== 'browser') return;
      e.preventDefault();
      setBrowserMenu({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  // ── Hide mode ──
  if (dockState === 'hide') {
    return null;
  }

  const isFloat = dockState === 'float';

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex justify-center pb-2"
      style={{ zIndex: isFloat ? 9999 : 50 }}
      onMouseEnter={() => { if (isFloat) setDockHovered(true); }}
      onMouseLeave={() => { if (isFloat) setDockHovered(false); }}
    >
      <div
        className="flex items-center gap-1 px-3 py-2"
        style={{
          height: '68px',
          borderRadius: '20px',
          background: isDark
            ? 'rgba(20,20,25,0.78)'
            : 'rgba(248,248,252,0.82)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: isDark
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(255,255,255,0.6)',
          boxShadow: isDark
            ? '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
            : '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
          opacity: isFloat ? (dockHovered ? 1 : 0.85) : 1,
          // Float mode: only the glass panel blocks clicks; the outer zone stays hit-testable
          pointerEvents: isFloat && !dockHovered ? 'none' : 'auto',
        }}
      >
        {DOCK_ITEMS.map((item) => (
          <DockIcon
            key={item.id}
            item={item}
            color={item.color}
            isOpen={isOpen(item.type)}
            onClick={handleDockClick}
            onContextMenu={handleBrowserContextMenu}
          />
        ))}
      </div>

      {/* ── Browser context menu (right-click) ── */}
      {browserMenu && (
        <div
          className="fixed rounded-lg py-1 shadow-lg z-[10000]"
          style={{
            left: browserMenu.x,
            top: browserMenu.y,
            background: 'var(--wiki-surface)',
            border: '1px solid var(--wiki-border)',
            minWidth: '280px',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {browserWindows.length === 0 ? (
            <div
              className="px-3 py-2 cursor-pointer hover:bg-wiki-surface2 transition-colors"
              style={{ color: 'var(--wiki-text3)', fontSize: '12px' }}
              onClick={() => {
                openNewBrowserWindow();
                setBrowserMenu(null);
              }}
            >
              新建浏览器窗口
            </div>
          ) : (
            browserWindows.map((bw) => (
              <div
                key={bw.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-wiki-surface2 transition-colors truncate"
                style={{ color: 'var(--wiki-text)', fontSize: '13px' }}
                onClick={() => {
                  focusWindow(bw.id);
                  setBrowserMenu(null);
                }}
              >
                {bw.url || bw.title || bw.id}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
