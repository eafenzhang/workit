import { useState, useEffect } from 'react';
import { APP_ICON } from '../constants/icon';

function getAPI() {
  return (window as any).electronAPI;
}

export default function TitleBar() {
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
      className="flex items-center justify-between h-10 flex-shrink-0 select-none w-full"
      style={{ background: 'var(--wiki-surface)', borderBottom: '1px solid var(--wiki-border)' }}
    >
      {/* Drag region + title */}
      <div className="flex items-center gap-2 pl-4 flex-1 h-full" style={{ WebkitAppRegion: 'drag' } as any}>
        <img src={APP_ICON} alt="Workit" className="w-4 h-4 object-contain" />
        <span className="text-xs font-medium" style={{ color: 'var(--wiki-text2)' }}>Workit</span>
      </div>

      {/* Window controls */}
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button onClick={handleMinimize} className="w-11 h-full flex items-center justify-center hover:bg-wiki-surface2 transition-colors">
          <svg width="10" height="10" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" fill="var(--wiki-text2)"/></svg>
        </button>
        <button onClick={handleMaximize} className="w-11 h-full flex items-center justify-center hover:bg-wiki-surface2 transition-colors">
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="var(--wiki-text2)" strokeWidth="1.2"/><rect x="3.5" y="0.5" width="8" height="8" rx="1" fill="var(--wiki-surface)" stroke="var(--wiki-text2)" strokeWidth="1.2"/></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="1" fill="none" stroke="var(--wiki-text2)" strokeWidth="1.2"/></svg>
          )}
        </button>
        <button onClick={handleClose} className="w-11 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors window-close">
          <svg width="10" height="10" viewBox="0 0 12 12"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  );
}
