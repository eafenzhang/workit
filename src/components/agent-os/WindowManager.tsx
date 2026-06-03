import { useMemo, type MouseEvent } from 'react';
import { useAgentOS } from '../../context/AgentOSContext';
import { useWindowManager, type ResizeEdge } from '../../hooks/useWindowManager';
import Window from './Window';

/**
 * Renders all non-minimized OS windows sorted by zIndex.
 *
 * Integrates `useWindowManager` for drag/resize orchestration and
 * delegates individual window rendering to the `Window` component.
 */
export default function WindowManager() {
  const { state, closeWindow, focusWindow, minimizeWindow, toggleMaximize, moveWindow, resizeWindow, getWindowPageComponent } =
    useAgentOS();

  const { windows, activeWindowId } = state;

  // ── Drag/resize hook ───────────────────────────────────────────

  const wm = useWindowManager(moveWindow, resizeWindow);

  // ── Sort windows by zIndex ─────────────────────────────────────

  const sortedWindows = useMemo(() => {
    return [...windows].sort((a, b) => a.zIndex - b.zIndex);
  }, [windows]);

  // ── Callback wrappers ──────────────────────────────────────────

  const handleStartDrag = (windowId: string, x: number, y: number, e: MouseEvent<HTMLDivElement>) => {
    wm.startDrag(windowId, x, y, e);
  };

  const handleStartResize = (
    windowId: string,
    edge: ResizeEdge,
    x: number,
    y: number,
    w: number,
    h: number,
    e: MouseEvent,
  ) => {
    wm.startResize(windowId, edge, x, y, w, h, e);
  };

  // ── Handle maximize with desktop rect ──────────────────────────
  // The desktop area dimensions are known at this level; we get them
  // from the parent container or window. For now we use window.innerWidth/Height
  // minus menu bar (28px) and dock bar (64px + 8px margin) offsets.
  const handleMaximize = (id: string) => {
    // Approximate desktop area — exact dimensions come from DesktopArea
    const desktopWidth = window.innerWidth;
    const desktopHeight = window.innerHeight - 28 - 72; // menuBar 28px + dock 64px + margin 8px
    toggleMaximize(id, { x: 0, y: 0, width: desktopWidth, height: desktopHeight });
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <>
      {sortedWindows.map((win) => (
        <Window
          key={win.id}
          window={win}
          isFocused={win.id === activeWindowId}
          onClose={closeWindow}
          onFocus={focusWindow}
          onMinimize={minimizeWindow}
          onMaximize={handleMaximize}
          onStartDrag={handleStartDrag}
          onStartResize={handleStartResize}
          tempDragRect={wm.tempDragRect}
          tempResizeRect={wm.tempResizeRect}
          pageComponent={getWindowPageComponent(win.type)}
        />
      ))}
    </>
  );
}
