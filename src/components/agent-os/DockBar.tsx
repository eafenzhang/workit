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

/**
 * macOS-style bottom Dock bar with glassmorphism, filled icons and brand colors.
 */
export default function DockBar() {
  const { state, openWindow, openNewBrowserWindow, focusWindow, minimizeWindow } = useAgentOS();
  const { windows } = state;

  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
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

  const handleDockClick = useCallback(
    (type: string) => {
      const item = DOCK_ITEMS.find((d) => d.type === type);
      if (!item) return;
      if (type === 'browser') {
        openNewBrowserWindow();
        return;
      }
      // Find existing window of this type
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

  return (
    <div
      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-2 z-50"
      style={{
        height: '68px',
        borderRadius: '20px',
        background: isDark
          ? 'rgba(20,20,25,0.78)'
          : 'rgba(240,240,245,0.78)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: isDark
          ? '1px solid rgba(255,255,255,0.08)'
          : '1px solid rgba(255,255,255,0.6)',
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      {DOCK_ITEMS.map((item) => (
        <DockIcon
          key={item.id}
          item={item}
          color={item.color}
          isOpen={isOpen(item.type)}
          onClick={handleDockClick}
        />
      ))}
    </div>
  );
}
