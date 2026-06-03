import MenuBar from './MenuBar';
import DesktopArea from './DesktopArea';
import DockBar from './DockBar';

/**
 * Top-level desktop container for Agent OS mode.
 *
 * Composes the three structural layers:
 *  1. MenuBar    — top 28px menu bar with clock
 *  2. DesktopArea — window canvas (flex-1)
 *  3. DockBar    — bottom floating Dock (64px, glass)
 */
export default function AgentOSDesktop() {
  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden relative">
      {/* ── Menu bar (top) ── */}
      <MenuBar />

      {/* ── Desktop area (fills remaining space) ── */}
      <DesktopArea />

      {/* ── Dock bar (bottom, floating) ── */}
      <DockBar />
    </div>
  );
}
