import { useState, useCallback, useEffect, useRef } from 'react';
import WindowManager from './WindowManager';
import { PlusIcon, ImageIcon, PaletteIcon } from 'lucide-react';

// ── Wallpaper presets ────────────────────────────────────────────

const WALLPAPERS = [
  // Dark palette
  { id: 'dark-grain', label: '暗色颗粒', bg: '#1a1a1f' },
  { id: 'navy', label: '深蓝', bg: '#0f172a' },
  { id: 'charcoal', label: '炭灰', bg: '#2d2d2d' },
  { id: 'forest', label: '森林', bg: '#0d2818' },
  { id: 'plum', label: '梅紫', bg: '#1a0f24' },
  { id: 'deep', label: '深黑', bg: '#0a0a0f' },
  // Light palette
  { id: 'snow', label: '雪白', bg: '#f0f2f5' },
  { id: 'cream', label: '奶油', bg: '#faf8f2' },
  { id: 'mint', label: '薄荷', bg: '#f0faf4' },
  { id: 'lavender', label: '薰衣草', bg: '#f4f0fa' },
  { id: 'sky', label: '天空', bg: '#f0f4fa' },
  { id: 'rose', label: '玫瑰', bg: '#faf3f4' },
];

const LS_WALLPAPER_KEY = 'agent-os-wallpaper';

function loadWallpaper(): string {
  try { return localStorage.getItem(LS_WALLPAPER_KEY) || WALLPAPERS[0].bg; } catch { return WALLPAPERS[0].bg; }
}

function saveWallpaper(bg: string) {
  try { localStorage.setItem(LS_WALLPAPER_KEY, bg); } catch {}
}

// ── Context menu ──────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  visible: boolean;
}

const CTX_MENU_ITEMS = [
  { id: 'new-window', label: '新建窗口', icon: PlusIcon, action: 'newWindow' },
  { id: 'wallpaper', label: '更换背景', icon: ImageIcon, action: 'wallpaper' },
];

/**
 * Desktop canvas with distinct background, wallpaper support,
 * right-click context menu, and window management.
 */
export default function DesktopArea() {
  const [wallpaper, setWallpaper] = useState(loadWallpaper);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({ x: 0, y: 0, visible: false });
  const ctxRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu.visible) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ctxMenu.visible]);

  // Close context menu on scroll/escape
  useEffect(() => {
    if (!ctxMenu.visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtxMenu(prev => ({ ...prev, visible: false })); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [ctxMenu.visible]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, visible: true });
  }, []);

  const handleMenuAction = useCallback((action: string) => {
    setCtxMenu(prev => ({ ...prev, visible: false }));
    if (action === 'wallpaper') {
      setShowWallpaperPicker(true);
    }
    // 'newWindow' could trigger a quick launcher in the future
  }, []);

  const selectWallpaper = useCallback((bg: string) => {
    setWallpaper(bg);
    saveWallpaper(bg);
    setShowWallpaperPicker(false);
  }, []);

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{ background: wallpaper }}
      onContextMenu={handleContextMenu}
    >
      <WindowManager />

      {/* ── Context menu ── */}
      {ctxMenu.visible && (
        <div
          ref={ctxRef}
          className="fixed z-[1000] rounded-xl py-1 shadow-lg min-w-[160px]"
          style={{
            left: ctxMenu.x,
            top: ctxMenu.y,
            background: 'var(--wiki-surface)',
            border: '1px solid var(--wiki-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.32)',
          }}
        >
          {CTX_MENU_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuAction(item.action)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-wiki-text2 hover:bg-wiki-surface2 transition-colors text-left"
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Wallpaper picker modal ── */}
      {showWallpaperPicker && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowWallpaperPicker(false)}
        >
          <div
            className="rounded-xl p-5 max-w-sm w-full mx-4"
            style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-wiki-text">更换背景</h3>
              <PaletteIcon size={16} style={{ color: 'var(--wiki-text3)' }} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {WALLPAPERS.map(wp => (
                <button
                  key={wp.id}
                  onClick={() => selectWallpaper(wp.bg)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all hover:scale-105"
                  style={{
                    border: wallpaper === wp.bg ? '2px solid var(--wiki-text)' : '2px solid var(--wiki-border)',
                  }}
                >
                  <div
                    className="w-full aspect-square rounded-lg"
                    style={{ background: wp.bg, border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  <span
                    className="text-[10px] text-center truncate w-full"
                    style={{ color: wallpaper === wp.bg ? 'var(--wiki-text)' : 'var(--wiki-text3)' }}
                  >
                    {wp.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
