import { useState, useCallback, useReducer, useMemo } from 'react';
import MenuBar from './MenuBar';
import DesktopArea from './DesktopArea';
import DockBar from './DockBar';
import FinderModal from './FinderModal';
import DesktopSettingsModal from './DesktopSettingsModal';
import { useAgentOS } from '../../context/AgentOSContext';

/** Dock fullscreen behavior value */
type DockBehavior = 'show' | 'hide' | 'float';

function readDockBehavior(): DockBehavior {
  try { return (localStorage.getItem('agent-os-dock-fullscreen') as DockBehavior) || 'show'; }
  catch { return 'show'; }
}

/**
 * Top-level desktop container for Agent OS mode.
 *
 * Layout: MenuBar + shared container (DesktopArea + DockBar absolute-overlay).
 * DesktopArea always fills the container; DockBar overlays at the bottom.
 * DesktopArea's bottom padding adjusts per dock state so maximized windows
 * correctly fill the full canvas when the dock is hidden or floating.
 */
export default function AgentOSDesktop() {
  const { toggleOSMode, state, openBrowserWithUrl } = useAgentOS();

  const [showFinder, setShowFinder] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Increment on settings change to force DesktopArea/DockBar to re-read localStorage
  const [settingsVersion, bumpSettings] = useReducer((v: number) => v + 1, 0);

  // ── Dock state: reads localStorage + windows ──
  const [dockBehavior, setDockBehavior] = useState<DockBehavior>(readDockBehavior);
  const hasMaximizedWindow = useMemo(
    () => state.windows.some((w) => w.isMaximized),
    [state.windows],
  );

  // Refresh dock behavior when settings close
  const bumpSettingsAndRefresh = useCallback(() => {
    bumpSettings();
    setDockBehavior(readDockBehavior());
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
    bumpSettingsAndRefresh();
  }, [bumpSettingsAndRefresh]);

  // Effective dock state: only deviate from 'show' when a window IS maximized
  const dockState: DockBehavior = hasMaximizedWindow ? dockBehavior : 'show';

  const handleOpenUrl = useCallback(
    (url: string, title: string) => {
      openBrowserWithUrl(url, title);
      setShowFinder(false);
    },
    [openBrowserWithUrl],
  );

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* ── Menu bar (top) — merged with TitleBar in OS mode ── */}
      <MenuBar
        isOSMode={state.isOSMode}
        onToggleOSMode={toggleOSMode}
        onOpenFinder={() => setShowFinder(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* ── Shared container: Desktop fills → Dock overlays on top ── */}
      <div className="flex-1 relative">
        <DesktopArea settingsVersion={settingsVersion} dockState={dockState} />
        <DockBar settingsVersion={settingsVersion} dockState={dockState} />
      </div>

      {/* ── Modals ── */}
      <FinderModal
        isOpen={showFinder}
        onClose={() => setShowFinder(false)}
        onOpenUrl={handleOpenUrl}
      />
      <DesktopSettingsModal
        isOpen={showSettings}
        onClose={handleCloseSettings}
      />
    </div>
  );
}
