import { useState, useEffect, type ReactNode } from 'react';
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { APP_ICON } from '../constants/icon';

function getAPI() {
  return (window as any).electronAPI;
}

interface Props {
  children?: ReactNode;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function TitleBar({ children, sidebarCollapsed = false, onToggleSidebar }: Props) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const api = getAPI();
    api?.onMaximizeChange?.((v: boolean) => setMaximized(v));
    api?.isMaximized?.().then(setMaximized);
  }, []);

  const handleMinimize = () => { getAPI()?.minimize?.(); };
  const handleMaximize = () => { getAPI()?.maximize?.(); };
  const handleClose = () => { getAPI()?.close?.(); };

  return (
    <div
      className="flex items-center h-10 flex-shrink-0 select-none w-full"
      style={{ background: 'var(--wiki-surface)', borderBottom: '1px solid var(--wiki-border)' }}
    >
      {/* Sidebar toggle button */}
      <button
        onClick={onToggleSidebar}
        className="w-9 h-full flex items-center justify-center hover:bg-wiki-surface2 transition-colors flex-shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {sidebarCollapsed
          ? <PanelLeftOpenIcon size={14} style={{ color: 'var(--wiki-text2)' }} />
          : <PanelLeftCloseIcon size={14} style={{ color: 'var(--wiki-text2)' }} />
        }
      </button>

      {/* Drag region: Logo + name */}
      <div className="flex items-center gap-2 pl-1 h-full flex-shrink-0" style={{ WebkitAppRegion: 'drag' } as any}>
        <img src={APP_ICON} alt="Workit" className="w-4 h-4 object-contain" />
        <span className="text-xs font-medium" style={{ color: 'var(--wiki-text2)' }}>Workit</span>
      </div>

      {/* Tab bar slot — children render here */}
      <div className="flex items-center h-full flex-1 overflow-hidden" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {children}
      </div>

      {/* Window controls */}
      <div className="flex h-full flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button onClick={handleMinimize} className="w-11 h-full flex items-center justify-center hover:bg-wiki-surface2 transition-colors">
          <svg width="10" height="10" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" fill="var(--wiki-text2)"/></svg>
        </button>
        <button onClick={handleMaximize} className="w-11 h-full flex items-center justify-center hover:bg-wiki-surface2 transition-colors">
          {maximized ? (
            <svg width="11" height="11" viewBox="0 0 13 13"><rect x="2.5" y="0.5" width="9" height="9" rx="1" fill="var(--wiki-surface)" stroke="var(--wiki-text2)" strokeWidth="0.8"/><rect x="0.5" y="2.5" width="9" height="9" rx="1" fill="var(--wiki-surface)" stroke="var(--wiki-text2)" strokeWidth="1.2"/></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 13 13"><rect x="1" y="1" width="11" height="11" rx="1" fill="none" stroke="var(--wiki-text2)" strokeWidth="1.2"/></svg>
          )}
        </button>
        <button onClick={handleClose} className="w-11 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors window-close">
          <svg width="10" height="10" viewBox="0 0 12 12"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  );
}