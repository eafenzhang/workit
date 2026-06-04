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
  const { state, openWindow, openNewBrowserWindow, focusWindow, minimizeWindow, closeWindow } = useAgentOS();
  const { windows } = state;

  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  const [dockHovered, setDockHovered] = useState(false);

  const browserWindows = useMemo(
    () => windows.filter((w: OSWindow) => w.type === 'browser' && !w.isMinimized),
    [windows],
  );

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

  const isMinimized = useCallback(
    (type: string) => windows.some((w: OSWindow) => w.type === type && w.isMinimized),
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

  // Right-click: browser → Finder modal; others → context menu
  const [contextMenu, setContextMenu] = useState<{ type: string; label: string; x: number; y: number } | null>(null);

  const handleContextMenu = useCallback(
    (type: string, e: React.MouseEvent) => {
      e.preventDefault();
      if (type === 'browser') {
        setBrowserModalOpen(true);
        return;
      }
      const item = DOCK_ITEMS.find((d) => d.type === type);
      setContextMenu({ type, label: item?.label || type, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const isFloat = dockState === 'float';
  const isHide = dockState === 'hide';

  // Float: always visible at full opacity, click-through when not hovered
  // Hide (auto-hide): hidden by default, fades in on bottom hover
  // Show: always visible
  const showDock = isHide ? dockHovered : true;

  // ── Browser context menu modal (Finder-style centered overlay) ──
  const [browserModalOpen, setBrowserModalOpen] = useState(false);

  // Keyboard: Escape to close browser modal
  useEffect(() => {
    if (!browserModalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBrowserModalOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [browserModalOpen]);

  // Keyboard: Escape to close context menu
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [contextMenu]);

  return (
    <>
      {/* ── Hover trigger zone for auto-hide mode ── */}
      {isHide && (
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: '72px', zIndex: 9998 }}
          onMouseEnter={() => setDockHovered(true)}
          onMouseLeave={() => setDockHovered(false)}
        />
      )}

      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center pb-2"
        style={{ zIndex: isFloat || isHide ? 9999 : 50 }}
        onMouseEnter={() => { if (isHide) setDockHovered(true); }}
        onMouseLeave={() => { if (isHide) setDockHovered(false); }}
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
            opacity: showDock ? 1 : 0,
            transform: showDock ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
            pointerEvents: isHide && !dockHovered ? 'none' : 'auto',
          }}
        >
        {DOCK_ITEMS.map((item) => (
          <DockIcon
            key={item.id}
            item={item}
            color={item.color}
            isOpen={isOpen(item.type)}
            isMinimized={isMinimized(item.type)}
            noDot={item.type === 'browser' ? browserWindows.length === 0 : undefined}
            onClick={handleDockClick}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>

      {/* ── Browser window list modal (Finder-style centered) ── */}
      {browserModalOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.45)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setBrowserModalOpen(false)}
        >
          <div
            className="rounded-xl overflow-hidden w-[420px] max-h-[440px] flex flex-col mx-4"
            style={{
              background: 'var(--wiki-surface)',
              border: '1px solid var(--wiki-border)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--wiki-border)' }}
            >
              <div className="flex items-center gap-2">
                <Globe size={15} style={{ color: 'var(--wiki-text2)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--wiki-text)' }}>
                  浏览器窗口 ({browserWindows.length})
                </span>
              </div>
              <button
                onClick={() => setBrowserModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-wiki-surface2 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 11 11"><line x1="1.5" y1="1.5" x2="9.5" y2="9.5" stroke="var(--wiki-text3)" strokeWidth="1.2"/><line x1="9.5" y1="1.5" x2="1.5" y2="9.5" stroke="var(--wiki-text3)" strokeWidth="1.2"/></svg>
              </button>
            </div>

            {/* ── Window list ── */}
            <div className="flex-1 overflow-y-auto">
              {browserWindows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Globe size={28} style={{ color: 'var(--wiki-text3)', opacity: 0.4 }} />
                  <span className="text-sm" style={{ color: 'var(--wiki-text3)' }}>无打开窗口</span>
                </div>
              ) : (
                browserWindows.map((bw) => (
                  <div
                    key={bw.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group"
                    style={{ borderBottom: '1px solid var(--wiki-border)', color: 'var(--wiki-text)', fontSize: '13px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--wiki-surface2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => {
                      focusWindow(bw.id);
                      setBrowserModalOpen(false);
                    }}
                  >
                    <Globe size={15} style={{ color: 'var(--wiki-text3)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate" style={{ color: 'var(--wiki-text)' }}>
                        {bw.title || bw.initialUrl || '新标签页'}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: 'var(--wiki-text3)' }}>
                        {bw.initialUrl || bw.url || ''}
                      </div>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeWindow(bw.id);
                        if (browserWindows.length <= 1) setBrowserModalOpen(false);
                      }}
                      title="关闭"
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11"><line x1="2" y1="2" x2="9" y2="9" stroke="var(--wiki-text3)" strokeWidth="1.2"/><line x1="9" y1="2" x2="2" y2="9" stroke="var(--wiki-text3)" strokeWidth="1.2"/></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Dock icon context menu (non-browser apps) ── */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[10001]"
          onClick={() => setContextMenu(null)}
        >
          <div
            className="absolute rounded-xl overflow-hidden min-w-[180px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              background: isDark
                ? 'rgba(28,28,33,0.92)'
                : 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: isDark
                ? '1px solid rgba(255,255,255,0.1)'
                : '1px solid rgba(0,0,0,0.08)',
              boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.5)'
                : '0 8px 32px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-4 py-2.5 text-xs font-medium"
              style={{
                color: 'var(--wiki-text)',
                borderBottom: '1px solid var(--wiki-border)',
              }}
            >
              {contextMenu.label} ({windows.filter((w: OSWindow) => w.type === contextMenu.type).length} 个窗口)
            </div>
            <button
              onClick={() => {
                windows
                  .filter((w: OSWindow) => w.type === contextMenu.type)
                  .forEach((w) => closeWindow(w.id));
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-wiki-surface2 transition-colors flex items-center gap-2"
              style={{ color: 'var(--wiki-text)' }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13">
                <line x1="2" y1="2" x2="11" y2="11" stroke="var(--wiki-text3)" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="11" y1="2" x2="2" y2="11" stroke="var(--wiki-text3)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              关闭所有窗口
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
