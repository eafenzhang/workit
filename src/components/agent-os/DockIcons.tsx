// macOS-inspired dock icons — rounded square background + centered lucide icon
import React from 'react';
import {
  BotMessageSquareIcon, SparklesIcon, DatabaseIcon, PaletteIcon,
  LightbulbIcon, PackageIcon, CpuIcon, GlobeIcon, MessageSquareIcon,
  SettingsIcon, UserIcon, LayersIcon,
} from 'lucide-react';

interface AppIconProps { size?: number }

// Shared container: gradient bg + glass overlay + centered icon
function AppIcon({ gradient, Icon, iconColor, size: s = 44 }: {
  gradient: [string, string]; Icon: any; iconColor: string; size?: number;
}) {
  const id = `g-${gradient[0].slice(1)}`;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={gradient[0]} />
          <stop offset="100%" stopColor={gradient[1]} />
        </linearGradient>
      </defs>
      {/* Rounded square bg */}
      <rect x="0" y="0" width="48" height="48" rx="11.5" fill={`url(#${id})`} />
      {/* Subtle inner highlight */}
      <rect x="1.5" y="1.5" width="45" height="45" rx="10.5" fill="white" fillOpacity="0.06" />
      {/* Subtle border */}
      <rect x="0.5" y="0.5" width="47" height="47" rx="11" stroke="white" strokeOpacity="0.12" />
      {/* Center the lucide icon via foreignObject */}
      <foreignObject x="8" y="8" width="32" height="32">
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} strokeWidth={1.8} style={{ color: iconColor }} />
        </div>
      </foreignObject>
    </svg>
  );
}

export const HomeIcon = (p: AppIconProps) => <AppIcon gradient={['#6366f1', '#8b5cf6']} Icon={BotMessageSquareIcon} iconColor="#ffffff" size={p.size} />;
export const RequirementsIcon = (p: AppIconProps) => <AppIcon gradient={['#f59e0b', '#ef4444']} Icon={SparklesIcon} iconColor="#ffffff" size={p.size} />;
export const KnowledgeIcon = (p: AppIconProps) => <AppIcon gradient={['#10b981', '#06b6d4']} Icon={DatabaseIcon} iconColor="#ffffff" size={p.size} />;
export const DesignStudioIcon = (p: AppIconProps) => <AppIcon gradient={['#ec4899', '#f97316']} Icon={PaletteIcon} iconColor="#ffffff" size={p.size} />;
export const InsightsIcon = (p: AppIconProps) => <AppIcon gradient={['#8b5cf6', '#a855f7']} Icon={LightbulbIcon} iconColor="#ffffff" size={p.size} />;
export const AppEcosystemIcon = (p: AppIconProps) => <AppIcon gradient={['#06b6d4', '#3b82f6']} Icon={PackageIcon} iconColor="#ffffff" size={p.size} />;
export const ModelIcon = (p: AppIconProps) => <AppIcon gradient={['#ef4444', '#f59e0b']} Icon={CpuIcon} iconColor="#ffffff" size={p.size} />;
export const BrowserIcon = (p: AppIconProps) => <AppIcon gradient={['#3b82f6', '#6366f1']} Icon={GlobeIcon} iconColor="#ffffff" size={p.size} />;
export const MessagesIcon = (p: AppIconProps) => <AppIcon gradient={['#14b8a6', '#10b981']} Icon={MessageSquareIcon} iconColor="#ffffff" size={p.size} />;
export const SettingsIcon = (p: AppIconProps) => <AppIcon gradient={['#64748b', '#475569']} Icon={SettingsIcon} iconColor="#ffffff" size={p.size} />;
export const ProfileIcon = (p: AppIconProps) => <AppIcon gradient={['#ec4899', '#8b5cf6']} Icon={UserIcon} iconColor="#ffffff" size={p.size} />;
export const RecentTasksIcon = (p: AppIconProps) => <AppIcon gradient={['#6b7280', '#4b5563']} Icon={LayersIcon} iconColor="#ffffff" size={p.size} />;

// ── Map ──
export const DOCK_APP_ICONS: Record<string, React.FC<AppIconProps>> = {
  'home': HomeIcon, 'requirements': RequirementsIcon, 'knowledge': KnowledgeIcon,
  'design-studio': DesignStudioIcon, 'insights': InsightsIcon, 'mcp': AppEcosystemIcon,
  'model': ModelIcon, 'browser': BrowserIcon, 'messages': MessagesIcon,
  'settings': SettingsIcon, 'profile': ProfileIcon, 'recent-tasks': RecentTasksIcon,
};
