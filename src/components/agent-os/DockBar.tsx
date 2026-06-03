import { useCallback, useState, useEffect } from 'react';
import {
  HomeIcon,
  SparklesIcon,
  DatabaseIcon,
  LightbulbIcon,
  PackageIcon,
  CpuIcon,
  MessageSquareIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import DockIcon from './DockIcon';
import type { DockItem, OSWindow } from '../../types/agent-os';
import { useAgentOS } from '../../context/AgentOSContext';

// ── Hardcoded dock items (matches Sidebar navItems + settings/profile) ──

const DOCK_ITEMS: DockItem[] = [
  { id: 'home', label: '首页', icon: HomeIcon, type: 'home' },
  { id: 'requirements', label: '采集库', icon: SparklesIcon, type: 'requirements' },
  { id: 'knowledge', label: '知识库', icon: DatabaseIcon, type: 'knowledge' },
  { id: 'insights', label: '洞察分析', icon: LightbulbIcon, type: 'insights' },
  { id: 'mcp', label: '应用生态', icon: PackageIcon, type: 'mcp' },
  { id: 'model', label: '模型配置', icon: CpuIcon, type: 'model' },
  { id: 'messages', label: '消息中心', icon: MessageSquareIcon, type: 'messages' },
  { id: 'settings', label: '系统设置', icon: SettingsIcon, type: 'settings' },
  { id: 'profile', label: '用户Agent', icon: UserIcon, type: 'profile' },
];

/**
 * macOS-style bottom Dock bar (64px, glassmorphism).
 *
 * Displays all app icons with running indicators for open windows.
 * Clicking an icon opens or focuses the corresponding window.
 */
export default function DockBar() {
  const { state, openWindow } = useAgentOS();
  const { windows } = state;

  // ── Dark mode detection for glass background ────────────────────

  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const check = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const isOpen = useCallback(
    (type: string) => windows.some((w: OSWindow) => w.type === type && !w.isMinimized),
    [windows],
  );

  const handleDockClick = useCallback(
    (type: string) => {
      const item = DOCK_ITEMS.find((d) => d.type === type);
      if (item) {
        openWindow(type, item.label);
      }
    },
    [openWindow],
  );

  return (
    <div
      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-1.5 z-50"
      style={{
        height: '64px',
        borderRadius: '16px',
        background: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--wiki-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      {DOCK_ITEMS.map((item) => (
        <DockIcon
          key={item.id}
          item={item}
          isOpen={isOpen(item.type)}
          onClick={handleDockClick}
        />
      ))}
    </div>
  );
}
