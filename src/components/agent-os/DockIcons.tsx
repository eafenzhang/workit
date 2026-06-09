// macOS-inspired dock icons — two styles: gradient (filled SVG) and linear (outline lucide)
import React from 'react';
import {
  BotMessageSquareIcon, SparklesIcon, DatabaseIcon, PaletteIcon,
  LightbulbIcon, PackageIcon, CpuIcon, GlobeIcon, MessageSquareIcon,
  SettingsIcon, UserIcon, LayersIcon,
} from 'lucide-react';

interface AppIconProps { size?: number }

// ── Shared gradient-bg icon (retained from macOS-style) ──
function AppIcon({ gradient, Icon, iconColor, size: s = 44 }: {
  gradient: [string, string]; Icon: any; iconColor: string; size?: number;
}) {
  const id = `g-${gradient[0].slice(1)}-${gradient[1].slice(1)}`;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={gradient[0]} />
          <stop offset="100%" stopColor={gradient[1]} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="48" height="48" rx="11.5" fill={`url(#${id})`} />
      <rect x="1.5" y="1.5" width="45" height="45" rx="10.5" fill="white" fillOpacity="0.06" />
      <rect x="0.5" y="0.5" width="47" height="47" rx="11" stroke="white" strokeOpacity="0.12" />
      <foreignObject x="8" y="8" width="32" height="32">
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} strokeWidth={1.8} style={{ color: iconColor }} />
        </div>
      </foreignObject>
    </svg>
  );
}

// ── Linear (outline) icon: just the lucide icon with brand color ──
function LinearIcon({ Icon, color, size: s = 44 }: { Icon: any; color: string; size?: number }) {
  return <Icon size={s} strokeWidth={1.6} style={{ color }} />;
}

// ── Gradient icons ──
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

// ── Linear icons — matching brand colors ──
export const HomeLinearIcon = (p: AppIconProps) => <LinearIcon Icon={BotMessageSquareIcon} color="#6366f1" size={p.size} />;
export const RequirementsLinearIcon = (p: AppIconProps) => <LinearIcon Icon={SparklesIcon} color="#f59e0b" size={p.size} />;
export const KnowledgeLinearIcon = (p: AppIconProps) => <LinearIcon Icon={DatabaseIcon} color="#10b981" size={p.size} />;
export const DesignStudioLinearIcon = (p: AppIconProps) => <LinearIcon Icon={PaletteIcon} color="#ec4899" size={p.size} />;
export const InsightsLinearIcon = (p: AppIconProps) => <LinearIcon Icon={LightbulbIcon} color="#8b5cf6" size={p.size} />;
export const AppEcosystemLinearIcon = (p: AppIconProps) => <LinearIcon Icon={PackageIcon} color="#06b6d4" size={p.size} />;
export const ModelLinearIcon = (p: AppIconProps) => <LinearIcon Icon={CpuIcon} color="#ef4444" size={p.size} />;
export const BrowserLinearIcon = (p: AppIconProps) => <LinearIcon Icon={GlobeIcon} color="#3b82f6" size={p.size} />;
export const MessagesLinearIcon = (p: AppIconProps) => <LinearIcon Icon={MessageSquareIcon} color="#14b8a6" size={p.size} />;
export const SettingsLinearIcon = (p: AppIconProps) => <LinearIcon Icon={SettingsIcon} color="#64748b" size={p.size} />;
export const ProfileLinearIcon = (p: AppIconProps) => <LinearIcon Icon={UserIcon} color="#ec4899" size={p.size} />;
export const RecentTasksLinearIcon = (p: AppIconProps) => <LinearIcon Icon={LayersIcon} color="#6b7280" size={p.size} />;

// ── Gradient map ──
export const DOCK_APP_ICONS: Record<string, React.FC<AppIconProps>> = {
  'home': HomeIcon, 'requirements': RequirementsIcon, 'knowledge': KnowledgeIcon,
  'design-studio': DesignStudioIcon, 'insights': InsightsIcon, 'mcp': AppEcosystemIcon,
  'model': ModelIcon, 'browser': BrowserIcon, 'messages': MessagesIcon,
  'settings': SettingsIcon, 'profile': ProfileIcon, 'recent-tasks': RecentTasksIcon,
};

// ── Linear map ──
export const DOCK_LINEAR_ICONS: Record<string, React.FC<AppIconProps>> = {
  'home': HomeLinearIcon, 'requirements': RequirementsLinearIcon, 'knowledge': KnowledgeLinearIcon,
  'design-studio': DesignStudioLinearIcon, 'insights': InsightsLinearIcon, 'mcp': AppEcosystemLinearIcon,
  'model': ModelLinearIcon, 'browser': BrowserLinearIcon, 'messages': MessagesLinearIcon,
  'settings': SettingsLinearIcon, 'profile': ProfileLinearIcon, 'recent-tasks': RecentTasksLinearIcon,
};

// ── Brand colors for each icon (used by DockIcon hover effects etc.) ──
export const DOCK_ICON_COLORS: Record<string, string> = {
  'home': '#6366f1', 'requirements': '#f59e0b', 'knowledge': '#10b981',
  'design-studio': '#ec4899', 'insights': '#8b5cf6', 'mcp': '#06b6d4',
  'model': '#ef4444', 'browser': '#3b82f6', 'messages': '#14b8a6',
  'settings': '#64748b', 'profile': '#ec4899', 'recent-tasks': '#6b7280',
};

// ── Icon style type ──
export type IconStyle = 'gradient' | 'linear';

export function getIconStyle(): IconStyle {
  try { return (localStorage.getItem('agent-os-icon-style') as IconStyle) || 'linear'; }
  catch { return 'linear'; }
}

export function getIconsForStyle(style: IconStyle) {
  return style === 'linear' ? DOCK_LINEAR_ICONS : DOCK_APP_ICONS;
}
