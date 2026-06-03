import React, { Suspense, useCallback, useState, useEffect, type MouseEvent, type ComponentType } from 'react';
import WindowTitleBar from './WindowTitleBar';
import type { OSWindow } from '../../types/agent-os';
import type { ResizeEdge, TempDragRect, TempResizeRect } from '../../hooks/useWindowManager';

// ── Resize handle cursor mapping ─────────────────────────────────

const RESIZE_CURSORS: Record<ResizeEdge, string> = {
  n: 'n-resize',
  s: 's-resize',
  e: 'e-resize',
  w: 'w-resize',
  ne: 'ne-resize',
  nw: 'nw-resize',
  se: 'se-resize',
  sw: 'sw-resize',
};

const ALL_EDGES: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

// ── Loading fallback ─────────────────────────────────────────────

const WindowLoading: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin w-6 h-6 border-2 border-wiki-text border-t-transparent rounded-full" />
  </div>
);

// ── Props ────────────────────────────────────────────────────────

interface WindowProps {
  window: OSWindow;
  isFocused: boolean;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onStartDrag: (windowId: string, x: number, y: number, e: MouseEvent<HTMLDivElement>) => void;
  onStartResize: (
    windowId: string,
    edge: ResizeEdge,
    x: number,
    y: number,
    w: number,
    h: number,
    e: MouseEvent,
  ) => void;
  /** Temp drag rect (absolute) — overrides window position during drag */
  tempDragRect: TempDragRect | null;
  /** Temp resize rect (absolute) — overrides window rect during resize */
  tempResizeRect: TempResizeRect | null;
  /** Lazy page component to render in the window body */
  pageComponent: React.LazyExoticComponent<ComponentType<Record<string, unknown>>> | undefined;
}

// ── Component ────────────────────────────────────────────────────

export default function Window({
  window: win,
  isFocused,
  onClose,
  onFocus,
  onMinimize,
  onMaximize,
  onStartDrag,
  onStartResize,
  tempDragRect,
  tempResizeRect,
  pageComponent: PageComponent,
}: WindowProps) {
  // ── Determine effective position/size (temp overrides during drag/resize) ──

  const isDragging = tempDragRect !== null && tempDragRect.windowId === win.id;
  const isResizing = tempResizeRect !== null && tempResizeRect.windowId === win.id;

  const displayX = isResizing ? tempResizeRect!.x : isDragging ? tempDragRect!.x : win.x;
  const displayY = isResizing ? tempResizeRect!.y : isDragging ? tempDragRect!.y : win.y;
  const displayW = isResizing ? tempResizeRect!.width : win.width;
  const displayH = isResizing ? tempResizeRect!.height : win.height;

  // ── Dark mode detection for window shadow ───────────────────────

  const [isDark, setIsDark] = useState<boolean>(() =>
    document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // ── Handlers ──

  const handleFocus = useCallback(() => {
    if (!isFocused) onFocus(win.id);
  }, [isFocused, onFocus, win.id]);

  const handleClose = useCallback(() => onClose(win.id), [onClose, win.id]);
  const handleMinimize = useCallback(() => onMinimize(win.id), [onMinimize, win.id]);
  const handleMaximize = useCallback(() => onMaximize(win.id), [onMaximize, win.id]);

  const handleTitleMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      handleFocus();
      // Don't start drag on double-click (reserved for maximize toggle)
      if (e.detail === 2) {
        handleMaximize();
        return;
      }
      onStartDrag(win.id, win.x, win.y, e);
    },
    [win.id, win.x, win.y, handleFocus, handleMaximize, onStartDrag],
  );

  const handleResizeMouseDown = useCallback(
    (edge: ResizeEdge) => (e: MouseEvent) => {
      onStartResize(win.id, edge, win.x, win.y, win.width, win.height, e);
    },
    [win.id, win.x, win.y, win.width, win.height, onStartResize],
  );

  // ── Minimized → hidden ──

  if (win.isMinimized) return null;

  // ── Render ──

  return (
    <div
      className="absolute flex flex-col overflow-hidden select-none"
      style={{
        left: displayX,
        top: displayY,
        width: displayW,
        height: displayH,
        zIndex: win.zIndex,
        borderRadius: '8px',
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
        background: 'var(--wiki-bg)',
        border: '1px solid var(--wiki-border)',
      }}
      onMouseDown={handleFocus}
    >
      {/* ── Title bar ── */}
      <WindowTitleBar
        title={win.title}
        isFocused={isFocused}
        onClose={handleClose}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onMouseDown={handleTitleMouseDown}
      />

      {/* ── Content area ── */}
      <div className="flex-1 overflow-hidden relative" style={{ background: 'var(--wiki-bg)' }}>
        {PageComponent ? (
          <Suspense fallback={<WindowLoading />}>
            <PageComponent />
          </Suspense>
        ) : (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--wiki-text3)' }}>
            <span className="text-sm">页面加载中...</span>
          </div>
        )}
      </div>

      {/* ── Resize handles (hidden when maximized) ── */}
      {!win.isMaximized &&
        ALL_EDGES.map((edge) => {
          // Determine handle position/size
          const isCorner = edge.length === 2;
          const size = isCorner ? 8 : 4;

          let style: React.CSSProperties = {
            position: 'absolute',
            cursor: RESIZE_CURSORS[edge],
            zIndex: 10,
          };

          // Edge positioning
          if (edge.includes('n')) style.top = -2;
          if (edge.includes('s')) style.bottom = -2;
          if (edge.includes('e')) style.right = -2;
          if (edge.includes('w')) style.left = -2;

          // Sizing
          if (isCorner) {
            style.width = `${size}px`;
            style.height = `${size}px`;
          } else if (edge === 'n' || edge === 's') {
            style.height = `${size}px`;
            style.left = '8px';
            style.right = '8px';
          } else {
            style.width = `${size}px`;
            style.top = '8px';
            style.bottom = '8px';
          }

          return (
            <div
              key={edge}
              style={style}
              onMouseDown={handleResizeMouseDown(edge)}
            />
          );
        })}
    </div>
  );
}
