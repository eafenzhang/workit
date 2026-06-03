import MenuBar from './MenuBar';
import DesktopArea from './DesktopArea';
import DockBar from './DockBar';
import { useAgentOS } from '../../context/AgentOSContext';

/**
 * Top-level desktop container for Agent OS mode.
 *
 * Composes the three structural layers:
 *  1. MenuBar    — top 28px menu bar with clock + window controls
 *  2. DesktopArea — window canvas (flex-1)
 *  3. DockBar    — bottom floating Dock (64px, glass)
 */
export default function AgentOSDesktop() {
  const { toggleOSMode, state } = useAgentOS();

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden relative">
      {/* ── Menu bar (top) — merged with TitleBar in OS mode ── */}
      <MenuBar isOSMode={state.isOSMode} onToggleOSMode={toggleOSMode} />

      {/* ── Desktop area (fills remaining space) ── */}
      <DesktopArea />

      {/* ── Dock bar (bottom, floating) ── */}
      <DockBar />
    </div>
  );
}
