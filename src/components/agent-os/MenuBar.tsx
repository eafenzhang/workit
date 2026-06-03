import { useState, useEffect } from 'react';
import { MonitorIcon, LayoutGridIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react';

// ── App Icon SVG ──────────────────────────────────────────────────

const AppIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" fill="var(--wiki-text)" />
    <path d="M7 12l3 3 7-7" stroke="var(--wiki-bg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Menu items (display only) ────────────────────────────────────

const MENU_ITEMS = ['Workit', '文件', '编辑', '视图', '窗口', '帮助'];

// ── Helpers ───────────────────────────────────────────────────────

const getAPI = () => (window as any).electronAPI;

// ── Component ────────────────────────────────────────────────────

interface MenuBarProps {
  isOSMode: boolean;
  onToggleOSMode: () => void;
}

/**
 * Top menu bar (28px) — macOS-style with Apple logo, menu items,
 * centered clock, OS toggle, fullscreen toggle, and window controls.
 * The area between menu items and clock is draggable for window reposition.
 */
export default function MenuBar({ isOSMode, onToggleOSMode }: MenuBarProps) {
  const [time, setTime] = useState<string>(() =>
    new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  );
  const [maximized, setMaximized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const api = getAPI();
    const unsubMax = api?.onMaximizeChange?.((v: boolean) => setMaximized(!!v));
    const unsubFS = api?.onFullscreenChange?.((v: boolean) => setFullscreen(!!v));
    api?.isMaximized?.().then((v: any) => setMaximized(!!v)).catch(() => {});
    api?.isFullScreen?.().then((v: any) => setFullscreen(!!v)).catch(() => {});
    return () => { if (unsubMax) unsubMax(); if (unsubFS) unsubFS(); };
  }, []);

  return (
    <div
      className="flex items-center h-7 flex-shrink-0 select-none relative"
      style={{
        background: 'var(--wiki-surface)',
        borderBottom: '1px solid var(--wiki-border)',
        fontSize: '13px',
        color: 'var(--wiki-text2)',
        WebkitAppRegion: 'drag',
      }}
    >
      {/* ── Left: Apple logo + menu items (no-drag for click) ── */}
      <div className="flex items-center h-full gap-4 pl-3 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
        <span className="inline-flex items-center" aria-label="Workit 菜单">
          <AppIcon />
        </span>
        {MENU_ITEMS.map((item) => (
          <span key={item} className="cursor-default" style={{ color: 'var(--wiki-text2)' }}>
            {item}
          </span>
        ))}
      </div>

      {/* ── Drag region: fills the gap between menu and clock ── */}
      <div className="flex-1 h-full" style={{ WebkitAppRegion: 'drag' }} />

      {/* ── Center: Clock (absolute positioned, drag to reposition window) ── */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center h-full pointer-events-none">
        <span className="cursor-default tabular-nums" style={{ color: 'var(--wiki-text2)' }}>
          {time}
        </span>
      </div>

      {/* ── Right: window controls (no-drag) ── */}
      <div className="flex items-center h-full pr-1 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleOSMode(); }}
          className="w-8 h-full flex items-center justify-center hover:bg-wiki-surface2 transition-colors"
          title="切换桌面/经典模式"
          aria-label="切换模式"
        >
          {isOSMode ? <LayoutGridIcon size={14} style={{ color: 'var(--wiki-text2)' }} /> : <MonitorIcon size={14} style={{ color: 'var(--wiki-text2)' }} />}
        </button>
        <button
          onClick={() => getAPI()?.setFullScreen?.(!fullscreen)}
          className="w-8 h-full flex items-center justify-center hover:bg-wiki-surface2 transition-colors"
          title={fullscreen ? '退出全屏' : '全屏模式'}
          aria-label="全屏"
        >
          {fullscreen ? <Minimize2Icon size={13} style={{ color: 'var(--wiki-text2)' }} /> : <Maximize2Icon size={13} style={{ color: 'var(--wiki-text2)' }} />}
        </button>
        <button onClick={() => getAPI()?.minimize?.()} className="w-8 h-full flex items-center justify-center hover:bg-wiki-surface2 transition-colors" aria-label="最小化">
          <svg width="10" height="10" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" fill="var(--wiki-text2)"/></svg>
        </button>
        <button onClick={() => getAPI()?.maximize?.()} className="w-8 h-full flex items-center justify-center hover:bg-wiki-surface2 transition-colors" aria-label="最大化">
          {maximized ? (
            <svg width="11" height="11" viewBox="0 0 13 13"><rect x="2.5" y="0.5" width="9" height="9" rx="1" fill="var(--wiki-surface)" stroke="var(--wiki-text2)" strokeWidth="0.8"/><rect x="0.5" y="2.5" width="9" height="9" rx="1" fill="var(--wiki-surface)" stroke="var(--wiki-text2)" strokeWidth="1.2"/></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 13 13"><rect x="1" y="1" width="11" height="11" rx="1" fill="none" stroke="var(--wiki-text2)" strokeWidth="1.2"/></svg>
          )}
        </button>
        <button onClick={() => getAPI()?.close?.()} className="w-8 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" aria-label="关闭">
          <svg width="12" height="12" viewBox="0 0 13 13"><line x1="2" y1="2" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2"/><line x1="11" y1="2" x2="2" y2="11" stroke="currentColor" strokeWidth="1.2"/></svg>
        </button>
      </div>
    </div>
  );
}
